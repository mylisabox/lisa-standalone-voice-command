'use strict'

const zmq = require('zmq')
const matrixMalos = require("matrix-protos").matrix_io.malos.v1
const driverConfig = matrixMalos.driver.DriverConfig
const everloopImage = matrixMalos.io.EverloopImage
const ledValue = matrixMalos.io.LedValue
const NUMBER_OF_LEDS = 35
const PORT = 20013 + 8 //leds everloop port
const ERROR_PORT = 20013 + 8 + 2 //error everloop port

const MODE = {
    STATIC: 'static',
    GRADIENT: 'gradient',
    PULSE: 'pulse',
    RAINBOW: 'rainbow'
}

let LEDS = []

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
    static get MODE() {
        return MODE
    }

    constructor(options) {
        if (typeof options === 'string') {
            options = {
                ip: options,
                idleMode: {
                    mode: MODE.RAINBOW,
                    leds: RAINBOW
                }
            }
        }
        if (!options.idleMode) {
            options.idleMode = {
                mode: MODE.RAINBOW,
                leds: RAINBOW
            }
        }
        const ip = options.ip
        this.idleMode = options.idleMode
        this.stateMode = options.stateMode
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

    setColor(mode, rgb) {
        rgb = this._getRGBValue(rgb)
        this.stop()
        const message = this._createEmptyMessage()
        if (mode !== MODE.PULSE) {
            for (let j = 0; j < NUMBER_OF_LEDS; ++j) {
                if (mode === MODE.STATIC) {
                    message.image.led.push(this._getLedValue(rgb))
                }
                else if (mode === MODE.GRADIENT) {
                    const redDelta = Math.floor(rgb.r / NUMBER_OF_LEDS) * 1.1
                    const greenDelta = Math.floor(rgb.g / NUMBER_OF_LEDS) * 1.1
                    const blueDelta = Math.floor(rgb.b / NUMBER_OF_LEDS) * 1.1
                    const whiteDelta = Math.floor(rgb.w / NUMBER_OF_LEDS) * 1.1

                    LEDS[j] = {
                        r: rgb.r - (j * redDelta),
                        g: rgb.g - (j * greenDelta),
                        b: rgb.b - (j * blueDelta),
                        w: rgb.w - (j * whiteDelta)
                    }
                }
            }
        }
        if (mode === MODE.STATIC) {
            this._send(message)
        }
        else if (mode === MODE.GRADIENT) {
            this.setColors(mode, LEDS)
        }
        else if (mode === MODE.PULSE) {
            this._setPulse(rgb, Math.max(rgb.r, rgb.g, rgb.b, rgb.w))
        }
    }

    _setPulse(rgb, maxIntensity) {
        this._stopIdle()
        this._stopState()
        const message = this._createEmptyMessage()
        for (let j = 0; j < NUMBER_OF_LEDS; ++j) {
            message.image.led.push(this._getLedValue(this._getRGBValue({
                    r: rgb.r - this.loopLed,
                    g: rgb.g - this.loopLed,
                    b: rgb.b - this.loopLed,
                    w: rgb.w - this.loopLed
                }))
            )
        }
        this._send(message)
        this.stateTimer = setInterval(() => {
            this.loopLed += Math.ceil(maxIntensity / NUMBER_OF_LEDS)
            if (this.loopLed >= maxIntensity) {
                this.loopLed = 0
            }
            this._setPulse(rgb, maxIntensity)
        }, 10)
    }

    setColors(mode, rgbs) {
        if (rgbs.length !== NUMBER_OF_LEDS) {
            throw new Error(`need ${NUMBER_OF_LEDS} values`)
        }
        this._stopIdle()
        const message = this._createEmptyMessage()
        for (let j = this.loopLed; j < this.loopLed + NUMBER_OF_LEDS; ++j) {
            let index = j
            if (index > NUMBER_OF_LEDS - 1) {
                index -= NUMBER_OF_LEDS - 1
            }
            message.image.led.push(this._getLedValue(this._getRGBValue(rgbs[index])))
        }
        this._send(message)
        this._stopState()

        if (mode === MODE.GRADIENT) {
            this.stateTimer = setInterval(() => {
                this.loopLed += 1
                if (this.loopLed >= NUMBER_OF_LEDS) {
                    this.loopLed = 0
                }
                this.setColors(mode, rgbs)
            }, this.animationSpeed)
        }
    }

    idle() {
        this._stopState()
        if (this.isIdle) {
            const message = this._createEmptyMessage()
            for (let j = this.loopLed; j < this.loopLed + NUMBER_OF_LEDS; ++j) {
                let index = j
                if (index > NUMBER_OF_LEDS - 1) {
                    index -= NUMBER_OF_LEDS - 1
                }
                const rgb = this.idleMode.leds[index]
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
        if (this.loopLed > NUMBER_OF_LEDS) {
            this.loopLed = 0
        }
        this.idle()
        if (this.idleTimer) clearInterval(this.idleTimer)

        this.idleTimer = setInterval(() => {
            this.loopLed += 1
            if (this.loopLed >= NUMBER_OF_LEDS) {
                this.loopLed = 0
            }
            this.idle()
        }, this.animationSpeed)
    }

    _stopState() {
        if (this.stateTimer) clearInterval(this.stateTimer)
        this.stateTimer = null
    }

    _stopIdle() {
        this.isIdle = false
        if (this.idleTimer) clearInterval(this.idleTimer)
        this.idleTimer = null
    }

    stop() {
        this._stopIdle()
        this._stopState()
    }

    quit() {
        this.stop()
        this.setColor('static', { r: 0, g: 0, b: 0 })
    }

    _send(message) {
        this._configSocket.send(driverConfig.encode(message).finish());
    }

    _getRGBValue(rgb) {
        return {
            r: Math.max(rgb.r || 0, 0),
            g: Math.max(rgb.g || 0, 0),
            b: Math.max(rgb.b || 0, 0),
            w: Math.max(rgb.w || 0, 0)
        }
    }

    _getLedValue(rgb) {
        return ledValue.create({
            red: rgb.r,
            green: rgb.g,
            blue: rgb.b,
            white: rgb.w
        })
    }
}
