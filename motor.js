const Gpio = require("rpi-gpio");
const { delay } = require("./util");
const SerialPort = require("serialport");

class Motor {
  static minStepDelayMs = 0.0001;
  static IHOLD_IRUN = 0x10;
  static GCONF = 0x00;
  static GSTAT = 0x01;
  static IHOLD_IRUN = 0x10;
  static BAUD_RATE = 57600;

  constructor(enablePin, dirPin, stepPin) {
    this.enablePin = enablePin;
    this.dirPin = dirPin;
    this.stepPin = stepPin;
    Gpio.setup(enablePin, Gpio.DIR_OUT);
    Gpio.setup(dirPin, Gpio.DIR_OUT);
    Gpio.setup(stepPin, Gpio.DIR_OUT);

    this.communicationPause = 500 / Motor.BAUD_RATE;
    this.port = new SerialPort("/dev/serial0", {
      baudRate: Motor.BAUD_RATE,
      dataBits: 8,
      stopBits: 1,
      parity: "none",
    });
    this.port.on("error", function (err) {
      console.log("Error: ", err.message);
    });
  }

  setEnabled(enabled) {
    if (enabled) {
      Gpio.write(this.enablePin, 0);
    } else {
      Gpio.write(this.enablePin, 1);
    }
  }

  setDirection(dir) {
    if (dir === 1) {
      Gpio.write(this.dirPin, 0);
    } else if (dir === 0) {
      Gpio.write(this.dirPin, 1);
    }
  }

  async runStep() {
    Gpio.write(this.stepPin, 1);
    await delay(Motor.minStepDelayMs);
    Gpio.write(this.stepPin, 0);
    await delay(Motor.minStepDelayMs);
  }

  cleanup() {
    Gpio.reset();
    this.enablePin = null;
    this.dirPin = null;
    this.stepPin = null;
    this.port.close();
  }

  async readGeneralInfo() {
    await this.#readRegister(Motor.GCONF);
  }

  setIRun(val) {
    this.#setIHoldIRun(val / 2, val, 10);
  }

  // IHold = 0-31; IRun = 0-31; IHoldDelay = 0-15
  #setIHoldIRun(ihold, irun, ihold_delay = 5) {
    let ihold_irun = 0;
    ihold_irun |= ihold << 0;
    ihold_irun |= irun << 8;
    ihold_irun |= ihold_delay << 16;
    this.#writeRegister(Motor.IHOLD_IRUN, ihold_irun);
  }

  #computeCrc(datagram, init_value) {
    let crc = init_value;
    datagram.forEach((byte) => {
      for (let i = 0; i < 8; i++) {
        if ((crc >> 7) ^ (byte & 0x01)) {
          crc = ((crc << 1) ^ 0x07) & 0xff;
        } else {
          crc = (crc << 1) & 0xff;
        }
        byte = byte >> 1;
      }
    });
    return crc;
  }

  #writeRegister(reg, val) {
    let sync = 0x55;
    let slave_addr = 0;
    let data = [];
    data[0] = (val >> 24) & 0xff;
    data[1] = (val >> 16) & 0xff;
    data[2] = (val >> 8) & 0xff;
    data[3] = val & 0xff;
    reg = reg | 0x80;
    let datagram = [sync, slave_addr, reg, ...data];
    let crc = this.#computeCrc(datagram, 0);
    this.port.write([...datagram, crc], (err) => {
      if (err) {
        return console.log("error in writing register ", err.message);
      }
    });
  }

  async #readRegister(reg) {
    let sync = 0x55;
    let slave_addr = 0;
    let datagram = [sync, slave_addr, reg];
    let crc = this.#computeCrc(datagram, 0);
    this.port.write([...datagram, crc], (err) => {
      if (err) {
        return console.log("error in reading register ", err.message);
      }
    });
    for (let i = 0; i < 10; i++) {
      let rtn = this.port.read(12);
      if (rtn != null) {
        let val = [];
        for (let j = 7; j < 11; j++) {
          val[j - 7] = rtn[j].toString(16).padStart(2, "0");
        }
        console.log(
          "Int return value for register " +
            reg +
            " : " +
            parseInt(val.join(""), 16)
        );
        break;
      }

      await delay(this.communicationPause);
    }
  }
}

module.exports = Motor;
