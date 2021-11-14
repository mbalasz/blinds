const Gpio = require("onoff").Gpio;
const { delay } = require("./util");
const SerialPort = require('serialport')

class Motor {
  static minStepDelayMs = 0.0001;
  static IHOLD_IRUN = 0x10;
  static GCONF = 0x00;

  constructor(enablePin, dirPin, stepPin) {
    // this.enablePin = new Gpio(enablePin, "out");
    // this.dirPin = new Gpio(dirPin, "out");
    // this.stepPin = new Gpio(stepPin, "out");
		this.port = new SerialPort('/dev/serial0', {
			baudRate: 57600
		})
		this.port.on('error', function(err) {
			console.log("Error: ", err.message);
		});
  }

  setEnabled(enabled) {
    if (enabled) {
      this.enablePin.writeSync(Gpio.LOW);
    } else {
      this.enablePin.writeSync(Gpio.HIGH);
    }
  }

  setDirection(dir) {
    if (dir === 1) {
      this.dirPin.writeSync(Gpio.LOW);
    } else if (dir === 0) {
      this.dirPin.writeSync(Gpio.HIGH);
    }
  }

  async runStep() {
    this.stepPin.writeSync(Gpio.HIGH);
    await delay(minStepDelayMs);
    this.stepPin.writeSync(Gpio.LOW);
    await delay(minStepDelayMs);
  }

  // setCurrent(current) {}

  cleanup() {
    if (this.dirPin) {
      this.dirPin.unexport();
      this.dirPin = null;
    }
    if (this.pullPin) {
      this.pullPin.unexport();
      this.pullPin = null;
    }
    if (this.enablePin) {
      this.enablePin.unexport();
      this.enablePin = null;
    }
  }

  readGeneralInfo() {
    return this.#readRegister(Motor.GCONF);
  }

	// setCurrent(current) {}

	setIHoldIRun(ihold, irun, delay) {
		let ihold_irun = 0;
		ihold_irun |= ihold;
		ihold_irun |= (irun << 8);
		ihold_irun |= (delay << 16);

		this.#writeRegister(Motor.IHOLD_IRUN, ihold_irun);  
	}

	#computeCrc(datagram, init_value) {
		let crc = init_value;
		datagram.forEach((byte) => {
			for (let i = 0; i < 8; i++) {
				if ((crc >> 7) ^ (byte & 0x01)) {
					crc = (crc << 1) ^ 0x07;
				} else {
					crc = crc << 1;
				}
				byte = byte >> 1;
			}
		});
		return crc;
	}

	async #writeRegister(reg, data) {
		let sync = 0x55;
		let slave_addr = 0x55;
		reg = reg | 0x80 // Setting the write bit.
		// We send data in 4 bytes, starting with the highest byte.
		let dataArr = [data >> 24 & 0xFF, data >> 16 & 0xFF, data >> 8 & 0xFF, data & 0xFF];
		let datagram = [sync, slave_addr, reg, ...dataArr];
		let crc = this.#computeCrc(datagram, 0);
		this.port.write([...datagram, crc], function(err) {
			if (err) {
				return console.log("error in writing register ", err.message);
			}
			console.log("Register write successful");
		});
	}

  async #readRegister(reg) {
		let sync = 0x55;
		let slave_addr = 0;
		let datagram = [sync, slave_addr, reg];
		let crc = this.#computeCrc(datagram, 0);
		this.port.write([...datagram, crc], function(err) {
			if (err) {
				return console.log("error in reading register ", err.message);
			}
			console.log("Register read successful");
		});
		await delay(8);
		console.log("reading...");
		let ret = this.port.read(12);
		console.log("Finished reading. " + ret);
  }
}

module.exports = Motor;

