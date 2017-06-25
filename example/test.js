const LISA = require('../index')

const lisa = new LISA({
    mode: LISA.MODE_EXTERNAL,
    matrix: 'IP_TO_MATRIX_CREATOR_BOARD',//or false to disable the support (false by default)
    url: 'http://localhost:3000',
    login: 'jimmy.aumard@gmail.com',
    password: 'adminadmin',
    gSpeech: './speech/LISA-gfile.json',
    hotwords: [{file: './speech/hey_lisa.pmdl', hotword: 'hey lisa'}]
})

lisa.on('hotword', () => console.log('hotword detected'))
lisa.on('error', error => console.log('error', error))
lisa.on('final-result', sentence => console.log(sentence + ' detected'))
lisa.on('bot-result', result => console.log('bot-result', result))

//setTimeout(() => lisa.stop(), 10000)
