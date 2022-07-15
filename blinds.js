const DOWN = "down";
const UP = "up";
const DEFAULT_SPEED = 5;

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
    let dir = steps > 0 ? DOWN : UP;
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
    this.setBlindsInMotion(true);
    let lastBlindsPosition = this.currentBlindsPosition;
    this.motor.move(steps, dir, speed, (message) => {
      const counter = parseInt(
        message.split(/\r?\n/).reverse().find((s) => !isNaN(s) && !isNaN(parseInt(s))))
      if (!counter) {
        return;
      }
      let newBlindsPosition =
      // Moving blinds down increases the motor counter, thus blind's position.
        lastBlindsPosition + (dir == DOWN ? counter : -counter);
      if (
        newBlindsPosition < 0 ||
        newBlindsPosition > this.maxSteps
      ) {
        this.stopBlinds();
      } else {
        this.setBlindsPosition(newBlindsPosition);
      }
    },
      (exitCode) => {
        this.setBlindsInMotion(false);
      });
  }

  stopBlinds() {
    this.motor.stop();
  }

  setBlindsInMotion(inMotion) {
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
  }
}

module.exports = { Blinds, DOWN, UP };
