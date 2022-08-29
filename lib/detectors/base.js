import EventEmitter from 'events';

export default class Detector extends EventEmitter {
  async init (options = {}) {
    throw Error('must be implemented');
  }

  async start () {
    throw Error('must be implemented');
  }

  async pause () {
    throw Error('must be implemented');
  }

  async resume () {
    throw Error('must be implemented');
  }

  async restart() {
    await this.stop();
    await this.start();
  }

  async stop () {
    throw Error('must be implemented');
  }
}
