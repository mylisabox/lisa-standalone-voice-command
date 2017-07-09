const Sonus = require('sonus')
const LISAWebservice = require('./lib/lisa-webservice')
const MatrixLed = require('./lib/matrix-led')
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
            gSpeech: './speech/LISA-gfile.json',
            options: {
                encoding: 'LINEAR16',
                sampleRateHertz: 16000
            },
            autoStart: true,
            language: 'en-UK',
            hotwords: [{
                file: './node_modules/lisa-standalone-voice-command/speech/hey_lisa.pmdl',
                hotword: 'hey lisa'
            }]
        }, config)

        const speech = require('@google-cloud/speech')({
            keyFilename: config.gSpeech
        })

        this.mode = config.mode
        this.isListening = false
        this.matrix = config.matrix
        if (this.matrix) {
            this.matrixStateMode = config.matrix.stateMode || {
                    mode: MatrixLed.MODE.GRADIENT,
                    listening: { g: 150 },
                    error: { r: 150 },
                    pause: { b: 150 },
                    unknown: { g: 150, b: 150 }
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
            this.emit('hotword', index, keyword)
            this.isListening = true
            this._setMatrixColor(this.matrixStateMode.listening)
        })
        this.sonus.on('error', error => {
            this.isListening = false
            this._emitError(error)
        })
        this.sonus.on('partial-result', sentence => this.emit('partial-result', sentence))
        this.sonus.on('final-result', this._onFinalResult.bind(this))
        this.on('bot-result', () => {
            this.trigger(1)
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
            this._setMatrixColor({})
        }
    }

    pause() {
        Sonus.pause(this.sonus)
        this._setMatrixColor.setColor(this.matrixStateMode.pause)
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

    _onFinalResult(sentence) {
        this.isListening = false
        this.emit('final-result', sentence)
        if (this.mode === LISAVoiceCommand.MODE_EXTERNAL && sentence !== '') {
            this.lisa.sendVoice(sentence)
                .then(result => {
                    if (result.action === 'UNKNOWN') {
                        this._setMatrixColor(this.matrixStateMode.unknown, true)
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
        this.emit('error', error)
        this._setMatrixColor(this.matrixStateMode.error, true)
    }

    _setMatrixColor(rgb, needToBeRestored = false) {
        if (this.matrix) {
            this.matrix.setColor(this.matrixStateMode.mode, rgb)
            if (needToBeRestored) {
                this._restoreIdleModeAfterTime()
            }
        }
    }

    _restoreIdleModeAfterTime() {
        if (this.idleTimer) clearTimeout(this.idleTimer)
        this.idleTimer = setTimeout(() => {
            if (!this.isListening) {
                this.matrix.idle()
            }
        }, 2000)
    }
}