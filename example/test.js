import LISA from '../index.js';

const language = 'fr-FR'

const lisa = new LISA({
  matrix: {
    ip: '192.168.1.45',
    //nbLeds: 18,
    idleMode: {
      brightness: 0.02
    }
  },//or false to disable the support (false by default)
  //url: 'http://localhost:3000',
  speaker: false,/*{
    module: require('lisa-speaker-polly'),
    options: {
      voiceId: language === 'fr-FR' ? 'Celine' : 'Kimberly'
    }
  },*/
  language: language,
  gSpeech: './speech/LISA-gfile.json',
  hotwords: [{ file: './speech/hey_lisa.pmdl', hotword: 'hey lisa' }]
})

lisa.on('hotword', () => console.log('hotword detected'))
lisa.on('error', error => console.log('error', error))
lisa.on('final-result', sentence => console.log(sentence + ' detected'))
lisa.on('bot-result', result => console.log('bot-result', result))

setTimeout(() => {
  //lisa.trigger(1)
}, 30000000);


process.on('uncaughtException', function(err) {
  console.log('Caught exception: ' + err);
  console.log(err.stack);
});

