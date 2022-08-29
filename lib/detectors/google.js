import speech from '@google-cloud/speech';
import recorder from 'node-record-lpcm16';
import Detector from './base.js';

const _SAMPLE_RATE = 16000;
const _ENCODING = 'LINEAR16';
const _LANGUAGE = 'en-US';

export default class GoogleDetector extends Detector {
  async init(options = {}) {
    options = Object.assign({
      sampleRate: _SAMPLE_RATE,
      device: null,
      configFile: './speech/LISA-gfile.json',
      language: _LANGUAGE,
      encoding: _ENCODING
    }, options);
    this.options = options;
  }

  async pause() {
    throw Error('google recorder can\'t be paused');
  }

  async resume() {
    throw Error('google recorder can\'t be paused so can\'t be resumed');
  }

  async start() {
    const config = {
      encoding: this.options.encoding,
      sampleRateHertz: this.options.sampleRate,
      languageCode: this.options.language,
    };
    const request = {
      config,
      interimResults: false, //Get interim results from stream
    };
    // Creates a client
    this.client = new speech.SpeechClient({
      keyFilename: this.options.configFile
    });
    const scope = this;
    // Create a recognize stream
    this.recognizeStream = this.client
      .streamingRecognize(request)
      .on('error', console.error)
      .on('data', data => {
          if (data.results[0] && data.results[0].alternatives[0]) {
            scope.emit('result', data.results[0].alternatives[0].transcript);
          }
        }
      );
    // Start recording and send the microphone input to the Speech API
    this.recorder = recorder
      .record({
        sampleRateHertz: this.options.sampleRate,
        threshold: 0,
        device: this.options.device,
        recordProgram: 'rec', // Try also "arecord" or "sox"
      });
      this.recorder.stream()
      .on('error', console.error)
      .pipe(this.recognizeStream);
  }

  async stop() {
    if (this.recognizeStream) {
      this.recognizeStream.destroy();
    }
    if (this.client) {
      await this.client.close();
    }
    if (this.recorder) {
      this.recorder.stop();
    }
    this.recognizeStream = null;
    this.recorder = null;
    this.client = null;
  }
}
