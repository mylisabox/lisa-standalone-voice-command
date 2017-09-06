const LISA = require('../index')

const lisa = new LISA({
  matrix: '192.168.1.26',//or false to disable the support (false by default)
    url: 'http://localhost:3000',
  speaker: require('lisa-speaker-polly'),
    language: 'fr-FR',
    gSpeech: './speech/LISA-gfile.json',
    hotwords: [{ file: './speech/hey_lisa.pmdl', hotword: 'hey lisa' }]
})

lisa.on('hotword', () => console.log('hotword detected'))
lisa.on('error', error => console.log('error', error))
lisa.on('final-result', sentence => console.log(sentence + ' detected'))
lisa.on('bot-result', result => console.log('bot-result', result))

//lisa.trigger(1)
