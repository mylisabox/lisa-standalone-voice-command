'use strict'

const Sonus = require('sonus')
const LISAWebservice = require('./lib/lisa-webservice')
const MatrixLed = require('./lib/matrix-led')
const speaker = require('./lib/speaker')
const EventEmitter = require('events')

module.exports = class LISAVoiceCommand extends EventEmitter {
  static get MODE_EXTERNAL() {
    return 1;
  }

  static get MODE_INTERNAL() {
    return 0;
  }

  constructor(config = {}) {
    super()
    config = Object.assign({
      mode: LISAVoiceCommand.MODE_EXTERNAL,
      matrix: false,
      url: 'http://mylisabox:3000',
      login: null,
      password: null,
      speaker: speaker,
      gSpeech: './speech/LISA-gfile.json',
      options: {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000
      },
      autoStart: true,
      language: 'en-US',
      hotwords: [{
        file: './node_modules/lisa-standalone-voice-command/speech/hey_lisa.pmdl',
        hotword: 'hey lisa'
      }]
    }, config)

    this.mode = config.mode
    this.speaker = config.speaker
    this.speaker.init({
      language: config.language
    })
    const speech = require('@google-cloud/speech')({
      keyFilename: config.gSpeech
    })

    this.isListening = false
    this.matrix = config.matrix
    this.matrixStateMode = {}
    if (this.matrix) {
      this.matrixStateMode = config.matrix.stateMode || {
        mode: MatrixLed.MODE.GRADIENT,
        listening: { g: 150 },
        error: { r: 150 },
        pause: { b: 150 },
        unknown: { g: 150, r: 150 }
      }
      this.matrix = new MatrixLed(config.matrix)
    }

    const hotwords = config.hotwords
    const language = config.language

    const sonusOptions = Object.assign({
      hotwords, language
    }, config.options)

    this.lisa = new LISAWebservice(config.login, config.password, config.url)

    this.sonus = Sonus.init(sonusOptions, speech)
    if (config.autoStart) {
      this.start()
    }
    this.sonus.on('hotword', (index, keyword) => {
      this.isListening = true
      this.setMatrixColor(this.matrixStateMode.listening)
      if (this.listeningTimeout) {
        clearTimeout(this.listeningTimeout)
      }
      this.listeningTimeout = setTimeout(() => {
        this.stopListening()
      }, 10000)
      this.emit('hotword', index, keyword)
    })
    this.sonus.on('error', error => {
      this.isListening = false
      this._emitError(error)
    })
    this.sonus.on('partial-result', sentence => this.emit('partial-result', sentence))
    this.sonus.on('final-result', this._onFinalResult.bind(this))

    this.on('bot-result', result => {
      if (result.responses[0]) {
        this.speak(result.responses[0])
      }
      else {
        this.trigger(1)
      }
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
  }

  stop() {
    Sonus.stop(this.sonus)
    if (this.matrix) {
      this.matrix.stop()
      this.setMatrixColor({})
    }
  }

  stopListening() {
    Sonus.pause(this.sonus)
    Sonus.resume(this.sonus)
    if (this.matrix) {
      this.matrix.idle()
    }
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

  speak(text, disabledCache = false) {
    if (!this.speaker || !text) {
      this.trigger(1)
      return Promise.resolve()
    }
    else
      return this.speaker.speak(text, disabledCache)
        .then(() => setTimeout(() => this.trigger(1), 1000))
        .catch(error => {
          this._emitError(error)
        })
  }

  _onFinalResult(sentence) {
    this.isListening = false
    if (this.listeningTimeout) {
      clearTimeout(this.listeningTimeout)
    }
    this.emit('final-result', sentence)
    if (this.mode === LISAVoiceCommand.MODE_EXTERNAL && sentence !== '') {
      this.lisa.sendVoice(sentence)
        .then(result => {
          if (result.action === 'UNKNOWN') {
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
