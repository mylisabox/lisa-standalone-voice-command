'use strict'

const LISA = require('../lib/lisa-webservice')
const assert = require('assert')

describe('LISA', () => {
  let lisa
  before(() => {
    lisa = new LISA('test', 'http://localhost:3000')
  })

  it('should send the sentence ', () => {
    return lisa.sendVoice('test voice')
  })

})
