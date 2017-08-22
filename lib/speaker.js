'use strict'
const picoSpeaker = require('pico-speaker');

module.exports = {
    init: (config = {}) => {
        if (!config.language) {
            config.language = 'en-US'
        }
        picoSpeaker.init({
            LANGUAGE: config.language
        })
        return Promise.resolve()
    },

    repeat: () => {
        return picoSpeaker.repeat()
    },

    speak: (text) => {
        return picoSpeaker.speak(text)
    },

    shutUp: () => {
        return picoSpeaker.shutUp()
    }
}