const { delay } = require("./util");

const DOWN = "down";
const UP = "up";
const STEP_WAIT_TIME = 15;
// const STEP_WAIT_TIME = 1;
const DEFAULT_SPEED = 1;

class Blinds {
  constructor(motor, initialBlindsPosition, maxSteps) {
    if (isNaN(maxSteps) || maxSteps < 0) {
      throw "maxSteps needs to be a number above 0, but was " + maxSteps;
    }
    if (isNaN(initialBlindsPosition) || initialBlindsPosition < 0) {
      throw (
        "initialBlindsPosition has to be a number above 0, but was " +
        initialBlindsPosition
      );
    }
    if (initialBlindsPosition > maxSteps) {
      throw "initialBlindsPosition has to be lass or equal to maxSteps";
    }
    this.motor = motor;
    this.currentBlindsPosition = initialBlindsPosition;
    this.maxSteps = maxSteps;
    this.blindsInMotion = false;
    this.blindsStatusObservers = [];
    this.blindsPositionObservers = [];
    this.blindsResetObservers = [];
  }

  async moveToPosition(percentage, speed = DEFAULT_SPEED) {
    let steps =
      Math.floor((percentage / 100) * this.maxSteps) -
      this.currentBlindsPosition;
    let dir = steps < 0 ? DOWN : UP;
    await this.move(Math.abs(steps), dir, speed);
  }

  async moveUp(steps, speed = DEFAULT_SPEED) {
    await this.move(steps, UP, speed);
  }

  async moveDown(steps, speed = DEFAULT_SPEED) {
    await this.move(steps, DOWN, speed);
  }

  async move(steps, dir, speed) {
    if (this.blindsInMotion) {
      return;
    }
    console.log(
      `Current position: ${this.currentBlindsPosition}. Moving blinds ${dir}, steps: ${steps}`
    );
    this.motor.setEnabled(true);
    this.motor.setIRun(31);
    this.motor.setDirection(dir == DOWN ? 0 : 1);
    this.setBlindsInMotion(true);
    this.interrupted = false;
    let counter = 0;
    while (true) {
      let newBlindsPosition =
        this.currentBlindsPosition + (dir == DOWN ? -1 : 1);
      if (
        counter >= steps ||
        this.interrupted ||
        newBlindsPosition < 0 ||
        newBlindsPosition > this.maxSteps
      ) {
        if (this.interrupted) {
          console.log(`interrupted: ${this.interrupted}`);
        }
        break;
      }
      await this.motor.runStep();
      await delay(STEP_WAIT_TIME / speed);
      counter++;
      this.setBlindsPosition(newBlindsPosition);
    }
    // TODO: Make this one of the observers
    // storeBlindsPosition(currentBlindsPosition);
    console.log(
      `Blinds stopped: current position: ${this.currentBlindsPosition}`
    );
    this.setBlindsInMotion(false);
    this.interrupted = false;
    this.motor.setIRun(6);
  }

  stopBlinds() {
    this.interrupted = true;
  }

  setBlindsInMotion(inMotion) {
    if (this.blindsInMotion && !inMotion) {
      this.interrupted = true;
    }
    this.blindsInMotion = inMotion;
    this.blindsStatusObservers.forEach((observer) => observer(inMotion));
  }

  setBlindsPosition(position) {
    this.currentBlindsPosition = position;
    this.blindsPositionObservers.forEach((observer) =>
      observer(position, this.maxSteps)
    );
  }

  getBlindsPosition() {
    return this.currentBlindsPosition;
  }

  resetBlinds() {
    if (this.blindsInMotion) {
      return;
    }
    this.currentBlindsPosition = 0;
    this.blindsResetObservers.forEach((observer) => observer());
  }

  registerBlindsPositionObservers(observers) {
    this.blindsPositionObservers.push(...observers);
  }

  unregisterBlindsPositionObservers(observers) {
    this.blindsPositionObservers = this.blindsPositionObservers.filter(
      (item) => !observers.includes(item)
    );
  }

  registerBlindsStatusObservers(observers) {
    this.blindsStatusObservers.push(...observers);
    observers.forEach((observer) => observer(this.blindsInMotion));
  }

  unregisterBlindsStatusObservers(observers) {
    this.blindsStatusObservers = this.blindsStatusObservers.filter(
      (item) => !observers.includes(item)
    );
  }

  registerBlindsResetObservers(observers) {
    this.blindsResetObservers.push(...observers);
  }

  unregisterBlindsResetObservers(observers) {
    this.blindsResetObservers = this.blindsResetObservers.filter(
      (item) => !observers.includes(item)
    );
  }

  cleanup() {
    this.motor.cleanup();
  }
}

module.exports = { Blinds, DOWN, UP };
