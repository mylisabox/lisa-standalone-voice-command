import http from 'http';
import https from 'https';

export default class LISAWebservice {
  constructor(identifier, baseUrl = 'http://mylisabox:3000') {
    this.baseUrl = `${baseUrl}/api/v1`
    this.deviceIdentifier = identifier
  }

  sendVoice(sentence) {
    const request = this.baseUrl.startsWith('https') ? https : http;
    const data = {
      sentence: sentence
    };

    return new Promise((resolve, reject) => {
      const req = request.request(`${this.baseUrl}/chatBots/interact`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Device-Id': this.deviceIdentifier,
          'Content-Type': 'application/json'
        },
      }, (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`Status Code: ${res.statusCode}`));
        }
        const data = [];
        res.on("data", chunk => {
          data.push(chunk);
        });
        res.on("end", () => resolve(Buffer.concat(data).toString()));
      });
      req.on("error", reject);
      req.write(JSON.stringify(data));
    });
  }
}
