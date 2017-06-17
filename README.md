# lisa-standalone-voice-command
Module to listen hotword, translate the user sentence and send the result to a L.I.S.A. instance

# Install

`npm i lisa-standalone-voice-command` 

# Usage

```
const LISA = require('lisa-standalone-voice-command')

const lisa = new LISA({
    mode: LISA.MODE_EXTERNAL,
    url: 'http://IP:LISA:BOX:SERVER:3000/api/v1',
    login: 'LISA_EMAIL',
    password: 'LISA_PASSWORD',
    gSpeech: './speech/LISA-gfile.json'
})

lisa.on('hotword', () => console.log('hotword detected'))
lisa.on('final-result', sentence => console.log(sentence + ' detected'))

setTimeout(function () {
    lisa.stop()
}, 10000)
```

# Configuration

Here is all the possible configuration you can use :
 
 `mode` : LISA.MODE_EXTERNAL or LISA.MODE_INTERNAL, internal will not send the sentence to L.I.S.A., default to `LISA.EXTERNAL`
 
 `url` : url of the L.I.S.A. server instance, default to `http://mylisabox.com`
 
 `login` : user email of L.I.S.A. account
 
 `password` : user password of L.I.S.A. account
 
 `gSpeech` : google speech configuration file, default to `./speech/LISA-gfile.json` but need to be provided
 
 `options` : sonus options, see sonus doc for all possibilities default to : `{
                 encoding: 'LINEAR16',
                 sampleRateHertz: 16000
             }`
             
 `autoStart` : true | false to start listen after instantiation, default to `true` 
             
 `language` : language use for translations, default to `en-UK`
 
 `hotwords`: sonus hotwords configuration, see sonus documentation for more, default to `[{file: './node_modules/lisa-standalone-voice-command/speech/hey_lisa.pmdl', hotword: 'hey lisa'}]`

