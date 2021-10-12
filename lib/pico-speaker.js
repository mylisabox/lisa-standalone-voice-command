import {exec} from 'child_process';
import crypto from 'crypto';

const speaker = (function () {
  /* DEFAULT CONFIG */
  const CONFIG = {
    AUDIO_DEVICE: null,
    LANGUAGE: 'en-US'
  };
  let lastText = '';
  return {
    init: function (props) {
      if (props) {
        Object.assign(CONFIG, props);
      }
    },
    speak: function (text) {
      const md5 = crypto.createHash('md5');
      const fileName = '/tmp/' + md5.update(text).digest('hex') + '.wav';

      return new Promise((resolve, reject) => {
        let cmd;
        if (CONFIG.AUDIO_DEVICE) {
          cmd = 'pico2wave -l ' + CONFIG.LANGUAGE + ' -w ' + fileName + ' " ' + text + '" && aplay -D ' + CONFIG.AUDIO_DEVICE + ' ' + fileName;
        }
        else {
          cmd = 'pico2wave -l ' + CONFIG.LANGUAGE + ' -w ' + fileName + ' " ' + text + '" && aplay ' + fileName;
        }
        exec(cmd, function (error) {
          // command output is in stdout
          if (error) {
            console.log('error while executing command ', cmd);
            return reject(error);
          }
          lastText = text;
          resolve();
        });
      });
    },
    repeat: function () {
      return this.speak(lastText);
    },
    shutUp: function () {
      const cmd = 'killall aplay';
      return new Promise((resolve, reject) => {
        exec(cmd, function (error, stdout, stderr) {
          // command output is in stdout
          if (error) {
            console.log('error while executing command ', cmd);
            return reject(error);
          }
          resolve();
        });
      });
    }
  };
})();

export default speaker;
