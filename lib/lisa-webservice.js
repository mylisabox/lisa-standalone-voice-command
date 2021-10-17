import axios from 'axios';

export default class LISAWebservice {
  constructor(identifier, baseUrl = 'http://mylisabox:3000') {
    this.baseUrl = `${baseUrl}/api/v1`
    this.deviceIdentifier = identifier
  }

  sendVoice(sentence) {
    const data = {
      sentence: sentence
    };

    return axios.post('http://192.168.1.20:3000/api/v1/chatBots/interact', data, {
      headers: {
        'Accept': 'application/json',
        'Device-Id': this.deviceIdentifier,
        'Content-Type': 'application/json'
      }
    });
  }
}
