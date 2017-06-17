const Sonus = require('sonus')
const LISAWebservice = require('./lib/lisa-webservice')
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
            hotwords: [{file: './node_modules/lisa-standalone-voice-command/speech/hey_lisa.pmdl', hotword: 'hey lisa'}]
        }, config)

        const speech = require('@google-cloud/speech')({
            keyFilename: config.gSpeech
        })

        this.mode = config.mode

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
        this.sonus.on('hotword', (index, keyword) => this.emit('hotword', index, keyword))
        this.sonus.on('error', error => this.emit('error', error))
        this.sonus.on('partial-result', sentence => this.emit('partial-result', sentence))
        this.sonus.on('final-result', this._onFinalResult.bind(this))
    }

    start() {
        Sonus.start(this.sonus)
    }

    stop() {
        Sonus.stop(this.sonus)
    }

    pause() {
        Sonus.pause(this.sonus)
    }

    resume() {
        Sonus.resume(this.sonus)
    }

    trigger(index, hotword) {
        Sonus.trigger(this.sonus, index, hotword)
    }

    _onFinalResult(sentence) {
        this.emit('final-result', sentence)
        if (this.mode === LISAVoiceCommand.MODE_EXTERNAL) {
            this.lisa.sendVoice(sentence).catch(error => this.emit('error', error))
        }
    }
}