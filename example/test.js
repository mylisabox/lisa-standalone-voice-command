const LISA = require('../index')

const lisa = new LISA({
    mode: LISA.MODE_EXTERNAL,
    url: 'http://localhost:3000',
    login: 'jimmy.aumard@gmail.com',
    password: 'adminadmin',
    gSpeech: './speech/LISA-gfile.json',
    hotwords: [{file: './speech/hey_lisa.pmdl', hotword: 'hey lisa'}]
})

lisa.on('hotword', () => console.log('hotword detected'))
lisa.on('error', error => console.log(error))
lisa.on('final-result', sentence => console.log(sentence + ' detected'))
lisa.on('bot-result', result => console.log(result + ' detected'))
