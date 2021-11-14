const Gpio = require("onoff").Gpio;
const { delay } = require("./util");

class Motor {
  static minStepDelayMs = 0.0001;
  static IHOLD_IRUN = 0x10;
  static GCONF = 0x00;

  constructor(enablePin, dirPin, stepPin) {
    // this.enablePin = new Gpio(enablePin, "out");
    // this.dirPin = new Gpio(dirPin, "out");
    // this.stepPin = new Gpio(stepPin, "out");
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
    return this.#readRegister(GCONF);
  }

  #readRegister(reg) {}
}

module.exports = Motor;
