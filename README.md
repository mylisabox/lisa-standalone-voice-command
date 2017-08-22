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
 
 `matrix`: IP to the matrix board, default to false, compatibility with Matrix Creator board leds, rainbow idle mode, green when listening, red errors, yellow unknown command and blue when pause
 
 `url` : url of the L.I.S.A. server instance, default to `http://mylisabox.com`
 
 `login` : user email of L.I.S.A. account
 
 `password` : user password of L.I.S.A. account
 
 `speaker` : speaker object to answer the user after L.I.S.A. responses
 
 `gSpeech` : google speech configuration file, default to `./speech/LISA-gfile.json` but need to be provided
 
 `options` : sonus options, see sonus doc for all possibilities default to : `{
                 encoding: 'LINEAR16',
                 sampleRateHertz: 16000
             }`
             
 `autoStart` : true | false to start listen after instantiation, default to `true` 
             
 `language` : language use for translations, default to `en-UK`
 
 `hotwords`: sonus hotwords configuration, see sonus documentation for more, default to `[{file: './node_modules/lisa-standalone-voice-command/speech/hey_lisa.pmdl', hotword: 'hey lisa'}]`

# Speaker capabilities
The default speaker use PICO TTS, so it need to be installed on your system in order to work.

If you want to create a custom speaker all you need to do is to provide an object with those methods: 
```js 
{
    //Initialize the speaker
    init: (config) => {return Promise.result()}, //For now config only have the 'language' field
    //Speak the given text
    speak: (text) => {return Promise.result()},
    //Repeat last sentence
    repeat: () => {return Promise.result()},
    //If text currently playing it stop directly
    shutUp: () => {return Promise.result()}
}
```

# Matrix LEDs customization

You can pass a more complex configuration to change the LEDs color depending of the state.

Here is the possible configuration :
```
{
  ip: 'IP_TO_MATRIX_CREATOR_BOARD',
  idleMode: {
     leds: [] // array length 35 with each rgb LEDs states, default to rainbow color
  },
  stateMode: {
     mode: LISA.MODE.GRADIENT, // mode can be static, gradient or pulse
     listening: { g: 150 }, // color for listening mode, default to green
     error: { r: 150 }, // color for error mode, default to red
     pause: { b: 150 }, // color for pause mode, default to blue
     unknown: { g: 150, b: 150 } // color for unknown mode, default to yellow
  }
}
```