const { spawn, execSync } = require("child_process");

class Motor {

    constructor(enablePin, dirPin, stepPin, motorPythonScriptPath) {
        this.enablePin = enablePin;
        this.dirPin = dirPin;
        this.stepPin = stepPin;
        this.motorPythonScriptPath = motorPythonScriptPath;
        this.motor_process = null;

        // Configure TMC2209 driver for quiet, reliable operation
        this._configureTMC2209();
    }

    _configureTMC2209() {
        console.log("[Motor] Configuring TMC2209 stepper driver for quiet operation...");
        try {
            const output = execSync('python3 configure_tmc.py', {
                encoding: 'utf8',
                stdio: ['inherit', 'pipe', 'pipe']
            });
            console.log(output);
            console.log("[Motor] TMC2209 configured successfully");
        } catch (error) {
            console.error("[Motor] WARNING: Failed to configure TMC2209:");
            console.error(error.stderr || error.message);
            console.error("[Motor] Continuing with default driver settings...");
            console.error("[Motor] Motor will still work but may not be optimally configured for quiet operation");
        }
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
