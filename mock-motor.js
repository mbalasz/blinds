/**
 * MockMotor - A test-only mock implementation of the Motor class
 *
 * This simulates the behavior of the real Motor/Python script without
 * requiring GPIO hardware or Python dependencies. It emits the same
 * stdout messages and callbacks as the real motor.
 *
 * Usage: Replace Motor with MockMotor in test environments
 */

class MockMotor {
  constructor(enablePin, dirPin, stepPin, motorPythonScriptPath) {
    this.enablePin = enablePin;
    this.dirPin = dirPin;
    this.stepPin = stepPin;
    this.motorPythonScriptPath = motorPythonScriptPath;
    this.motor_process = null;
    this.currentInterval = null;

    // Timing constants from motor.py
    this.MIN_STEP_DELAY_MS = 1;     // motor.py line 7
    this.STEP_WAIT_TIME = 30;        // motor.py line 8 (converted to ms)
    this.OVERSHOOT = 160;            // motor.py line 10
  }

  /**
   * Simulate motor movement
   * @param {number} steps - Number of steps to move
   * @param {string} dir - Direction: 'up' or 'down'
   * @param {number} speed_multiplier - Speed multiplier (higher = faster)
   * @param {function} dataCallback - Called with progress updates
   * @param {function} exitCallback - Called when movement completes
   */
  move(steps, dir, speed_multiplier, dataCallback, exitCallback) {
    // Simulate a running process
    this.motor_process = {
      pid: Math.floor(Math.random() * 10000),
      killed: false
    };

    let currentStep = 0;
    const totalSteps = parseInt(steps);

    // Calculate timing per step (mimics motor.py timing)
    // Total delay = MIN_STEP_DELAY_MS + (STEP_WAIT_TIME / speed_multiplier)
    const stepDelay = this.MIN_STEP_DELAY_MS + (this.STEP_WAIT_TIME / speed_multiplier);

    console.log(`[MockMotor] Starting movement: ${totalSteps} steps ${dir} at ${speed_multiplier}x speed (${stepDelay.toFixed(1)}ms/step)`);

    // Simulate step-by-step movement
    this.currentInterval = setInterval(() => {
      if (this.motor_process.killed) {
        // Motor was stopped
        clearInterval(this.currentInterval);
        this.currentInterval = null;
        console.log(`[MockMotor] Movement interrupted at step ${currentStep}`);
        exitCallback(0);
        this.motor_process = null;
        return;
      }

      currentStep++;

      // Emit progress updates (mimics motor.py line 50: print(curr_steps, flush=True, end=""))
      // The real motor prints individual numbers without newlines
      if (currentStep <= totalSteps) {
        dataCallback(`${currentStep}`);
      }

      // Check if movement is complete
      if (currentStep >= totalSteps) {
        clearInterval(this.currentInterval);
        this.currentInterval = null;

        // Simulate successful completion
        console.log(`[MockMotor] Movement complete: ${totalSteps} steps ${dir}`);

        // Small delay before calling exitCallback (mimics process cleanup)
        setTimeout(() => {
          exitCallback(0); // Exit code 0 = success
          this.motor_process = null;
        }, 10);
      }
    }, stepDelay);
  }

  /**
   * Stop the motor (mimics killing the Python process)
   */
  stop() {
    const process = this.motor_process;
    if (!process) {
      return;
    }

    console.log(`[MockMotor] Stop requested`);
    process.killed = true;

    // The interval will detect this and clean up
  }
}

module.exports = MockMotor;
