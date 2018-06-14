const VoiceCommand = require('.')
const pico = require('./lib/speaker')
const fs = require('fs')
const os = require('os')
let polly = null

const language = process.env.LANG || 'en-US'
const isPollyCredentialsPresent = fs.existsSync(os.homedir() + '/.aws/credentials')

if (isPollyCredentialsPresent) {
  polly = require('lisa-speaker-polly')
}

let voiceId
switch (language) {
  case 'fr-FR':
    voiceId = 'Celine'
    break
  case 'ru-RU':
    voiceId = 'Tatyana'
    break
  default:
    voiceId = 'Kimberly'
}

const voiceCommand = new VoiceCommand({
  matrix: 'mylisabox',
  speaker: {
    module: isPollyCredentialsPresent ? polly : pico,
    options: {
      voiceId: voiceId // see http://docs.aws.amazon.com/polly/latest/dg/voicelist.html for other voices
    }
  },
  url: 'http://mylisabox:3000',
  gSpeech: './speech/LISA-gfile.json',
  language: language,
  hotwords: [{
    file: './speech/hey_lisa.pmdl',
    hotword: 'hey lisa'
  }]
})
voiceCommand.on('hotword', () => console.log('hey lisa detected'))
voiceCommand.on('error', error => console.error(error))
voiceCommand.on('final-result', sentence => console.log(sentence + ' detected'))

process.on('unhandledRejection', (reason, p) => {
  console.error("Unhandled Rejection at: Promise ", p, " reason: ", reason)
})
process.on('uncaughtException', exception => {
  console.error(exception)
})
