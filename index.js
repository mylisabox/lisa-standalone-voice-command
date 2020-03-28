'use strict'

const Sonus = require('sonus')
const LISAWebservice = require('./lib/lisa-webservice')
const LisaDiscovery = require('lisa-discovery')
const MatrixLed = require('./lib/matrix-led')
const speaker = require('./lib/speaker')
const EventEmitter = require('events')
const uuid = require('uuid')
const fs = require('fs')

module.exports = class LISAVoiceCommand extends EventEmitter {
  constructor(config = {}) {
    super()
    config = Object.assign({
      log: {
        debug: console.log,
        error: console.log,
        info: console.log,
        warn: console.log
      },
      matrix: false,
      url: null,
      speaker: speaker,
      gSpeech: './speech/LISA-gfile.json',
      options: {
        encoding: 'LINEAR16',
        sampleRateHertz: 44100
      },
      autoStart: true,
      language: 'en-US',
      hotwords: [{
        file: './node_modules/lisa-standalone-voice-command/speech/hey_lisa.pmdl',
        hotword: 'hey lisa'
      }]
    }, config)

    const file = './identifier'
    if (fs.existsSync(file)) {
      this.identifier = fs.readFileSync(file)
    }
    else {
      this.identifier = uuid.v4()
      fs.writeFileSync(file, this.identifier);
    }

    if(config.speaker) {
      this.speaker = config.speaker.module ? config.speaker.module : config.speaker
      if (this.speaker) {
        const speakerConfig = config.speaker.options || {}
        speakerConfig.language = config.language
        this.speaker.init(speakerConfig)
      }
    }

    if (!fs.existsSync(config.gSpeech)) {
      config.log.warn(config.gSpeech + ' doesn\'t exist, speech recognition is disabled')
      return
    }

    const gspeech = require('@google-cloud/speech')
    const speech = new gspeech.SpeechClient({
      keyFilename: config.gSpeech
    })

    this.isListening = false
    this.matrix = config.matrix
    this.matrixStateMode = {}

    const hotwords = config.hotwords
    const language = config.language

    const sonusOptions = Object.assign({
      hotwords, language,
      recordProgram: process.platform === 'darwin' ? 'rec' : 'arecord'
    }, config.options)

    this.sonus = Sonus.init(sonusOptions, speech)

    this.init()

    this.discovery = new LisaDiscovery({
      multicastAddress: '239.6.6.6',
      multicastPort: 5544,
      trigger: 'lisa-voice-search',
      callback: () => 'lisa-voice-response ' + this.identifier,
    })

    if (config.url === null) {
      const scope = this
      const trigger = 'lisa-server-response'
      const serverDiscovery = new LisaDiscovery({
        multicastAddress: '239.9.9.9',
        multicastPort: 5544,
        trigger: trigger,
        callback: (input, address) => {
          const data = input.replace(trigger, '').trim()
          const json = JSON.parse(data);
          scope.lisa = new LISAWebservice(scope.identifier, `${json.isSecure ? 'https' : 'http'}://${address}:${json.port}`)
          console.log('found server at ' + scope.lisa.baseUrl)
          if (config.autoStart) {
            this.start()
          }
          serverDiscovery.stop()
        }
      })

      serverDiscovery.start(() => {
        serverDiscovery.sendMessage('lisa-server-search')
      })
    }
    else {
      this.lisa = new LISAWebservice(this.identifier, config.url)
      console.log('set server at ' + this.lisa.baseUrl)
      if (config.autoStart) {
        this.start()
      }
    }

  }

  init() {
    if (this.matrix) {
      this.matrixStateMode = this.matrix.stateMode || {
        mode: MatrixLed.MODE.GRADIENT,
        listening: {g: 150},
        error: {r: 150},
        pause: {b: 150},
        unknown: {g: 150, r: 150}
      }
      this.matrix = new MatrixLed(this.matrix)
    }

    this.sonus.on('hotword', (index, keyword) => {
      this.isListening = true
      this.setMatrixColor(this.matrixStateMode.listening)
      this.emit('hotword', index, keyword)
    })
    this.sonus.on('error', error => {
      this.isListening = false
      this._emitError(error)
    })
    this.sonus.on('partial-result', sentence => this.emit('partial-result', sentence))
    this.sonus.on('final-result', this._onFinalResult.bind(this))
    this.sonus.on('timeout', () => {
      this._onFinalResult('')
    })

    this.on('bot-result', result => {
      this.speak(result.response, false, result.action !== 'THANKS' &&
        !(result.action === 'UNKNOWN' && this.lastAction === 'UNKNOWN'))
      this.lastAction = result.action
    })

    function exitHandler(exit) {
      this.stop()
      if (exit) process.exit()
    }

    //do something when app is closing
    process.on('exit', exitHandler.bind(this));

    //catches ctrl+c event
    process.on('SIGINT', exitHandler.bind(this, true));

  }

  start() {
    Sonus.start(this.sonus)
    if (this.matrix) {
      this.matrix.start()
    }
    this.discovery.start()
  }

  stop() {
    Sonus.stop(this.sonus)
    if (this.matrix) {
      this.matrix.stop()
      this.setMatrixColor({})
    }
    this.discovery.stop()
  }

  pause() {
    Sonus.pause(this.sonus)
    this.setMatrixColor.setColor(this.matrixStateMode.pause)
  }

  resume() {
    Sonus.resume(this.sonus)
    if (this.matrix) {
      this.matrix.start()
    }
  }

  trigger(index, hotword) {
    Sonus.trigger(this.sonus, index, hotword)
  }

  speak(text, disabledCache = false, continueSpeech = true) {
    if (!this.speaker || !text) {
      if (continueSpeech) {
        setTimeout(() => this.trigger(1), 500)
      }
      return Promise.resolve()
    }
    else
      return this.speaker.speak(text, disabledCache)
        .then(() => {
          if (continueSpeech) {
            setTimeout(() => this.trigger(1), 1000)
          }
        })
        .catch(error => {
          this._emitError(error)
        })
  }

  _onFinalResult(sentence) {
    this.isListening = false

    this.emit('final-result', sentence)
    if (sentence !== '') {
      this.lisa.sendVoice(sentence)
        .then(result => {
          if (result.action === 'UNKNOWN' && this.matrix) {
            this.setMatrixColor(this.matrixStateMode.unknown, true)
          }
          else {
            if (this.matrix) {
              this.matrix.idle()
            }
          }
          this.emit('bot-result', result)
        })
        .catch(error => {
          this._emitError(error)
        })
    }
    else {
      if (this.matrix) {
        this.matrix.idle()
      }
    }
  }

  _emitError(error) {
    this.setMatrixColor(this.matrixStateMode.error, true)
    this.emit('error', error)
  }

  setMatrixColor(rgb, needToBeRestored = false) {
    if (this.matrix) {
      this.matrix.setColor(this.matrixStateMode.mode, rgb)
      if (needToBeRestored) {
        this._restoreIdleModeAfterTime()
      }
    }
  }

  _restoreIdleModeAfterTime(time = 3000) {
    if (this.idleTimer) clearTimeout(this.idleTimer)
    this.idleTimer = setTimeout(() => {
      if (!this.isListening) {
        this.matrix.idle()
      }
    }, time)
  }
}
