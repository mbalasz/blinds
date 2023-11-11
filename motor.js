const spawn = require("child_process").spawn;

class Motor {

    constructor(enablePin, dirPin, stepPin, motorPythonScriptPath) {
        this.enablePin = enablePin;
        this.dirPin = dirPin;
        this.stepPin = stepPin;
        this.motorPythonScriptPath = motorPythonScriptPath;
        this.motor_process = null;
    }

    move(steps, dir, speed_multiplier, dataCallback, exitCallback) {
        const process = spawn('python3', ["./motor.py", this.enablePin, this.dirPin, this.stepPin, steps, dir, speed_multiplier]);
        this.motor_process = process;

        process.stdout.on('data', (chunk) => {
            const textChunk = chunk.toString('utf8');
            dataCallback(textChunk);
        });

        process.stdout.on('close', (code) => {
            console.log(`Python process finished with code ${code}`);
            exitCallback(code);
            this.motor_process = null;
        });
    }

    stop() {
        const process = this.motor_process;
        if (!process) {
            return;
        }
        process.kill('SIGINT');
    }
}

module.exports = Motor;
