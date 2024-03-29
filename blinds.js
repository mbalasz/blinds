const DOWN = "down";
const UP = "up";
const DEFAULT_SPEED = 5;

/**
 * 0 represents the blinds at the very bottom (fully closed)
 * maxSteps represents the blinds at the very top (fully open)
 */
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

  /**
   * 0% represents the blinds at the very bottom (fully closed)
   * 100% represents the blinds at the very top (fully open)
   */
  async moveToPosition(percentage, speed = DEFAULT_SPEED) {
    let steps =
      Math.floor((percentage / 100) * this.maxSteps) -
      this.currentBlindsPosition;
    let dir = steps > 0 ? UP : DOWN;
    await this.move(Math.abs(steps), dir, speed);
  }

  async moveUpToEnd(speed = DEFAULT_SPEED) {
    this.moveToPosition(/* percentage = */ 100, speed);
  }

  async moveDownToEnd(speed = DEFAULT_SPEED) {
    this.moveToPosition(/* percentage = */ 0, speed);
  }

  async moveUp(steps, speed = DEFAULT_SPEED) {
    const maxSafeSteps = Math.min(steps, this.maxSteps - this.currentBlindsPosition);
    await this.move(maxSafeSteps, UP, speed);
  }

  async moveDown(steps, speed = DEFAULT_SPEED) {
    const maxSafeSteps = Math.min(steps, this.currentBlindsPosition);
    await this.move(maxSafeSteps, DOWN, speed);
  }

  async move(steps, dir, speed) {
    if (this.blindsInMotion) {
      return;
    }
    this.setBlindsInMotion(true);
    let lastBlindsPosition = this.currentBlindsPosition;
    return new Promise((resolve, reject) => this.motor.move(steps, dir, speed, (message) => {
      const counter = parseInt(
        message.split(/\r?\n/).reverse().find((s) => !isNaN(s) && !isNaN(parseInt(s))))
      if (!counter) {
        return;
      }
      let newBlindsPosition = lastBlindsPosition + (dir == UP ? counter : -counter);
      if (
        newBlindsPosition < 0 ||
        newBlindsPosition > this.maxSteps
      ) {
        //this.stopBlinds();
      } else {
        this.setBlindsPosition(newBlindsPosition);
      }
    },
      (exitCode) => {
        this.setBlindsInMotion(false);
        resolve();
      }));
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

  resetBlindsUp() {
    if (this.blindsInMotion) {
      return;
    }
    this.currentBlindsPosition = this.maxSteps;
    this.blindsResetObservers.forEach((observer) => observer(this.currentBlindsPosition));
  }

  resetBlindsDown() {
    if (this.blindsInMotion) {
      return;
    }
    this.currentBlindsPosition = 0;
    this.blindsResetObservers.forEach((observer) => observer(this.currentBlindsPosition));
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
