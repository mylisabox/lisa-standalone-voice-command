'use strict'

const request = require('request-promise-native')

module.exports = class LISAWebservice {
  constructor(identifier, baseUrl = 'http://mylisabox:3000') {
    this.baseUrl = `${baseUrl}/api/v1`
    this.deviceIdentifier = identifier
  }

  sendVoice(sentence) {
    return request({
      method: 'POST',
      url: `${this.baseUrl}/chatbot/interact`,
      headers: {
        'Accept': 'application/json',
        'Device-Id': this.deviceIdentifier,
        'Content-Type': 'application/json'
      },
      json: {
        sentence: sentence
      }
    }).catch(error => {
      return Promise.reject(error)
    })
  }
}
