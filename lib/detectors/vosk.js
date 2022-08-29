import fs from 'fs';
import recorder from 'node-record-lpcm16';
import path from 'path';
import vosk from 'vosk';
import Detector from './base.js';

const _MODEL_PATH = "./models";
const _SAMPLE_RATE = 16000;

const _LANGUAGE = 'en';

export default class VoskDetector extends Detector {
  async init(options = {}) {
    options = Object.assign({
      modelPath: _MODEL_PATH,
      sampleRate: _SAMPLE_RATE,
      language: _LANGUAGE,
      device: null
    }, options);
    vosk.setLogLevel(0);

    const lang = options.language.substring(0, 2);
    const modelPath = path.join(options.modelPath, lang);
    options.modelPath = modelPath;

    if (!fs.existsSync(modelPath)) {
      console.warn("Please download the model from https://alphacephei.com/vosk/models and unpack as " + modelPath + " in the current folder.")
      process.exit()
    }
    this.options = options;
    this.model = null;
    this.rec = null;
  }

  async pause() {
    this.recorder.pause();
  }

  async resume() {
    this.recorder.resume();
  }

  async start() {
    if (this.model == null) {
      this.model = new vosk.Model(this.options.modelPath);
      this.rec = new vosk.Recognizer({model: this.model, sampleRate: this.options.sampleRate});
      this.recorder = recorder.record({
        threshold: 0,
        device: this.options.device,
        sampleRate: this.options.sampleRate,
        verbose: false
      });
      const scope = this;
      this.recorder.stream().on('data', (data) => {
        //prevent crash if rec has been already free from memory
        if (scope.rec) {
          if (scope.rec.acceptWaveform(data)) {
            scope.emit('result', this.rec.result().text);
          }
          else {
            scope.emit('partial', this.rec.partialResult().partial);
          }
        }
      });
    }
  }

  async stop() {
    if (this.recorder) {
      this.recorder.stop();
    }
    if (this.rec) {
      this.rec.free();
    }
    if (this.model) {
      this.model.free();
    }
    this.model = null;
    this.rec = null;

  }
}
