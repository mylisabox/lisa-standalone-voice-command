const LISA = require('../index')

const lisa = new LISA({
    mode: LISA.MODE_EXTERNAL,
    url: 'http://localhost:3000/api/v1',
    login: 'jimmy.aumard@gmail.com',
    password: 'adminadmin',
    gSpeech: './speech/LISA-gfile.json'
})

lisa.on('hotword', () => console.log('hotword detected'))
lisa.on('final-result', sentence => console.log(sentence + ' detected'))

setTimeout(function () {
    lisa.stop()
}, 10000)