import {SpeechClient} from '@google-cloud/speech';
import EventEmitter from 'events'
import fs from 'fs';
import LisaDiscovery from 'lisa-discovery';
import os from 'os';
import Sonus from 'sonus';
import {v4} from 'uuid';
import LISAWebservice from './lib/lisa-webservice.js';
import MatrixLed from './lib/matrix-led.js';
import speaker from './lib/speaker.js';

export default class LISAVoiceCommand extends EventEmitter {
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
    } else {
      this.identifier = v4()
      fs.writeFileSync(file, this.identifier);
    }

    if (config.speaker) {
      this.speaker = config.speaker.module ? config.speaker.module : config.speaker
      if (this.speaker) {
        const speakerConfig = config.speaker.options || {}
        speakerConfig.language = config.language
        this.speaker.init(speakerConfig)
      }
    }
    this.matrixConfig = config.matrix
    this.matrix = null
    this.matrixStateMode = {}

    this.initMatrix()

    this.discovery = new LisaDiscovery({
      multicastAddress: '239.6.6.6',
      multicastPort: 5544,
      trigger: 'lisa-voice-search',
      callback: () => 'lisa-voice-response ' + this.identifier,
    })

    if (!fs.existsSync(config.gSpeech)) {
      config.log.warn(config.gSpeech + ' doesn\'t exist, speech recognition is disabled')
      this._setNoConfigMode()
      this._monitorLocalNetwork(!config.autoStart, true)
      return
    }

    const configFileData = fs.readFileSync(config.gSpeech)
    if (configFileData.indexOf('"client_email"') === -1 || configFileData.indexOf('"private_key"') === -1) {
      config.log.warn(config.gSpeech + ' doesn\'t have required data, it\'s not a correct Google config file')
      this._setNoConfigMode()
      this._monitorLocalNetwork(!config.autoStart, true)
      return
    }

    const speech = new SpeechClient({
      keyFilename: config.gSpeech
    })

    this.isListening = false
    this.isDetroyed = false
    this.isConnected = false

    const hotwords = config.hotwords
    const language = config.language

    const sonusOptions = Object.assign({
      hotwords, language,
      recordProgram: process.platform === 'darwin' ? 'rec' : 'arecord'
    }, config.options)

    this.sonus = Sonus.init(sonusOptions, speech)

    this.init()

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
    } else {
      this.lisa = new LISAWebservice(this.identifier, config.url)
      console.log('set server at ' + this.lisa.baseUrl)
      if (config.autoStart) {
        this.start()
      }
    }
    this._monitorLocalNetwork(!config.autoStart)
  }

  _setNoConfigMode() {
    //pause mean no config file
    this.matrixStateMode.mode = MatrixLed.MODE.PULSE
    this.setMatrixColor(this.matrixStateMode.pause)
  }

  _monitorLocalNetwork(shouldRestart, noConfigMode) {
    const networks = os.networkInterfaces();
    let hasLocalNetwork = false
    for (let networkName in networks) {
      const networkAddresses = networks[networkName]
      for (let networkAddressIndex in networkAddresses) {
        let networkAddress = networkAddresses[networkAddressIndex]
        if (!networkAddress.internal && networkAddress.mac !== '00:00:00:00:00:00') {
          hasLocalNetwork = true
          break;
        }
      }
      if (hasLocalNetwork) {
        break;
      }
    }

    if (!this.isConnected && hasLocalNetwork && shouldRestart) {
      //we're connected to local network
      if (noConfigMode) {
        this._setNoConfigMode()
      } else if (!this.initialized) {
        this.initMatrix()
        this.start()
      }
    }

    if (!hasLocalNetwork) {
      this.matrixStateMode.mode = MatrixLed.MODE.PULSE
      this.setMatrixColor(this.matrixStateMode.unknown)
    }
    this.isConnected = hasLocalNetwork

    setTimeout(() => {
      if (!this.isDetroyed) {
        this._monitorLocalNetwork(true, noConfigMode)
      }
    }, this.isConnected ? 10000 : 1000)
  }

  initMatrix() {
    if (this.matrixConfig) {
      this.matrixStateMode = this.matrixConfig.stateMode || {
        mode: MatrixLed.MODE.GRADIENT,
        listening: {g: 150},
        error: {r: 150},
        pause: {b: 150},
        unknown: {g: 150, r: 150}
      }
      if (this.matrix) {
        this.matrix.stop();
      }
      this.matrix = new MatrixLed(this.matrixConfig)
      this.initialized = true;
    }
  }

  init() {
    this.sonus.on('hotword', (index, keyword) => {
      this.isListening = true
      this.setMatrixColor(this.matrixStateMode.listening)
      this.emit('hotword', index, keyword)
      this._planReset(15000)
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

    const exitHandler = (exit) => {
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
    this._planReset();
  }

  _planReset(time) {
    if (this.triggerTimeout) {
      clearTimeout(this.triggerTimeout);
      this.triggerTimeout = null;
    }
    this.triggerTimeout = setTimeout(() => {
      this.triggerTimeout = null;
      this.matrix.idle()
    }, time || 10000);
  }

  speak(text, disabledCache = false, continueSpeech = true) {
    if (!this.speaker || !text) {
      if (continueSpeech) {
        setTimeout(() => this.trigger(1), 500)
      }
      return Promise.resolve()
    } else
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
          if (result.data.action === 'UNKNOWN' && this.matrix) {
            this.setMatrixColor(this.matrixStateMode.unknown, true)
          } else {
            if (this.matrix) {
              this.matrix.idle()
            }
          }
          this.emit('bot-result', result.data)
        })
        .catch(error => {
          this._emitError(error)
        })
    } else {
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

  destroy() {
    this.isDetroyed = true;
    this.stop()
  }
}
