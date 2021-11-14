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

  #readRegister(reg) {
		let sync = 0x55;
		let slave_addr = 0;
		let datagram = [sync, slave_addr, reg];
		let crc = this.#computeCrc(datagram, 0);
		this.port.write([...datagram, crc], function(err) {
			if (err) {
				return console.log("error in reading register ", err.message);
			}
			console.log("Successfully wrote register read");
		});
		this.port.on("data", function() {
			console.log("Data: ", this.port.read());
		});
  }
}

module.exports = Motor;

