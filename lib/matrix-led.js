'use strict'

const zmq = require('zmq')
const protoBuf = require("protobufjs")
const protoBuilder = protoBuf.loadSync(__dirname + '/driver.proto')
const driverConfig = protoBuilder.lookupType('matrix_malos.DriverConfig')
const everloopImage = protoBuilder.lookupType('matrix_malos.EverloopImage')
const ledValue = protoBuilder.lookupType('matrix_malos.LedValue')
const NUMBER_OF_LEDS = 35
const PORT = 20013 + 8 //leds everloop port
const ERROR_PORT = 20013 + 8 + 2 //error everloop port

const RAINBOW = [
    { r: 128, g: 0, b: 0 },
    { r: 128, g: 19, b: 0 },
    { r: 128, g: 37, b: 0 },
    { r: 128, g: 56, b: 0 },
    { r: 128, g: 74, b: 0 },
    { r: 128, g: 93, b: 0 },
    { r: 128, g: 111, b: 0 },
    { r: 125, g: 128, b: 0 },
    { r: 106, g: 128, b: 0 },
    { r: 88, g: 128, b: 0 },
    { r: 69, g: 128, b: 0 },
    { r: 51, g: 128, b: 0 },
    { r: 32, g: 128, b: 0 },
    { r: 13, g: 128, b: 0 },
    { r: 0, g: 128, b: 5 },
    { r: 0, g: 128, b: 24 },
    { r: 0, g: 128, b: 42 },
    { r: 0, g: 128, b: 61 },
    { r: 0, g: 128, b: 79 },
    { r: 0, g: 128, b: 98 },
    { r: 0, g: 128, b: 117 },
    { r: 0, g: 120, b: 128 },
    { r: 0, g: 101, b: 128 },
    { r: 0, g: 83, b: 128 },
    { r: 0, g: 64, b: 128 },
    { r: 0, g: 46, b: 128 },
    { r: 0, g: 27, b: 128 },
    { r: 0, g: 8, b: 128 },
    { r: 10, g: 0, b: 128 },
    { r: 29, g: 0, b: 128 },
    { r: 47, g: 0, b: 128 },
    { r: 66, g: 0, b: 128 },
    { r: 85, g: 0, b: 128 },
    { r: 103, g: 0, b: 128 },
    { r: 122, g: 0, b: 128 }
]

module.exports = class MatrixLed {
    constructor(ip) {
        this.idleMode = 'rainbow'
        this.isIdle = true
        this.loopLed = 0
        this.animationSpeed = 60
        this.creatorIp = ip || '127.0.0.1'
        this._errorSocket = zmq.socket('sub')
        this._errorSocket.connect('tcp://' + this.creatorIp + ':' + ERROR_PORT)
        this._errorSocket.subscribe('')
        this._errorSocket.on('message', function (error_message) {
            console.log('Message received: Pressure error: ' + error_message.toString('utf8') + '\n')
        })

        this._configSocket = zmq.socket('push')
        this._configSocket.connect('tcp://' + this.creatorIp + ':' + PORT)
        this.idle()
        this.start()
    }

    _createEmptyMessage() {
        return driverConfig.create({ image: everloopImage.create() })
    }

    _HSVtoRGB(h, s, v) {
        let r, g, b, i, f, p, q, t;

        i = Math.floor(h * 6);
        f = h * 6 - i;
        p = v * (1 - s);
        q = v * (1 - f * s);
        t = v * (1 - (1 - f) * s);
        switch (i % 6) {
            case 0:
                r = v, g = t, b = p;
                break;
            case 1:
                r = q, g = v, b = p;
                break;
            case 2:
                r = p, g = v, b = t;
                break;
            case 3:
                r = p, g = q, b = v;
                break;
            case 4:
                r = t, g = p, b = v;
                break;
            case 5:
                r = v, g = p, b = q;
                break;
        }
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }

    _rainbow(position) {
        return this._HSVtoRGB(position / parseFloat(NUMBER_OF_LEDS) * 0.85, 1.0, 0.5);
    }

    setColor(rgb) {
        this.stop()
        const message = this._createEmptyMessage()
        for (let j = 0; j < 35; ++j) {
            message.image.led.push(this._getLedValue(rgb))
        }
        this._send(message)
    }

    setColors(rgbs) {
        if (rgbs.length !== NUMBER_OF_LEDS) {
            throw new Error(`need ${NUMBER_OF_LEDS} values`)
        }
        this.stop()
        const message = this._createEmptyMessage()
        for (let j = 0; j < 35; ++j) {
            message.image.led.push(this._getLedValue(rgb))
        }
        this._send(message)
    }

    idle() {
        if (this.isIdle) {
            const message = this._createEmptyMessage()
            for (let j = this.loopLed; j < this.loopLed + 35; ++j) {
                let index = j
                if (index > 34) {
                    index -= 34;
                }
                const rgb = RAINBOW[index]
                message.image.led.push(this._getLedValue(rgb))
            }
            this._send(message)
        }
        else {
            this.start()
        }
    }

    start() {
        this.isIdle = true
        this.idle()
        if (this.timer) clearInterval(this.timer)

        this.timer = setInterval(() => {
            this.loopLed += 1
            if (this.loopLed >= NUMBER_OF_LEDS)
                this.loopLed = 0
            this.idle()
        }, this.animationSpeed)
    }

    stop() {
        this.isIdle = false
        if (this.timer) clearInterval(this.timer)
        this.timer = null
    }

    quit() {
        this.stop()
        this.setColor({ r: 0, g: 0, b: 0 })
    }

    _send(message) {
        this._configSocket.send(driverConfig.encode(message).finish());
    }

    _getLedValue(rgb) {
        return ledValue.create({
            red: rgb.r || 0,
            green: rgb.g || 0,
            blue: rgb.b || 0,
            white: rgb.w || 0
        })
    }
}
