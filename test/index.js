'use strict'

const LISA = require('../lib/lisa-webservice')
const assert = require('assert')

describe('LISA', () => {
    let lisa
    before(() => {
        lisa = new LISA('jimmy.aumard@gmail.com', 'adminadmin', 'http://localhost:3000')
    })

    it('should send the sentence without specific login call', () => {
        return lisa.sendVoice('test voice')
    })

    it('should login to LISA', () => {
        return lisa.login().then(() => {
            assert(lisa.token)
        })
    })

    it('should logout from LISA', () => {
        return lisa.logout().then(() => {
            assert.equal(lisa.token, null)
        })
    })
})
