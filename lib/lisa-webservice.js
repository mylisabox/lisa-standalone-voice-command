const request = require('request-promise-native')

module.exports = class LISAWebservice {
    constructor(login, password, baseUrl = 'http://mylisabox:3000') {
        this.baseUrl = `${baseUrl}/api/v1`
        this.token = null
        this.identifier = login
        this.password = password
    }

    login(login = this.identifier, pass = this.password) {
        return request({
            method: 'POST',
            uri: `${this.baseUrl}/auth/local`,
            json: {
                identifier: login,
                password: pass
            }
        }).then(infos => {
            this.token = infos.token
        })
    }

    logout() {
        return request({
            method: 'GET',
            url: `${this.baseUrl}/auth/logout`,
            headers: {
                'Accept': 'application/json',
                'Authorization': `JWT ${this.token}`
            }
        }).then(() => {
            this.token = null
        })
    }

    sendVoice(sentence) {
        return request({
            method: 'POST',
            url: `${this.baseUrl}/chatbot/interact`,
            headers: {
                'Authorization': `JWT ${this.token}`
            },
            json: {
                sentence: sentence
            }
        }).catch(error => {
            if (error.statusCode === 401) {
                return this.login().then(() => this.sendVoice(sentence))
            }
        })
    }
}