const Gpio = require("onoff").Gpio;
const express = require("express");
const path = require("path");
const { Server } = require("socket.io");
const fs = require("fs");

const app = express();
const port = 3000;
const blindsPositionFilePath = "blinds.txt";

const DOWN = "down";
const UP = "up";
const STEP_WAIT_TIME = 15;
const DEFAULT_SPEED = 1;
const MAX_STEPS = 16500;

let blindsInMotion = false;
let dirPin;
let pullPin;
let enablePin;
let currentBlindsPosition = readBlindsPosition() || 0;
let interrupted = false;

app.use(express.static("public"));
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "/public/index.html"));
});

const server = app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});

const io = new Server(server);
io.on("connection", (socket) => {
    socket.on("slider-changed", (percentage) => {
        console.log("On slider changed");
        if (currentBlindsPosition == null) {
            console.log(
                "Error currentBlindsPosition is set to null. Ignoring the request"
            );
            return;
        }
        let steps =
            Math.floor((percentage / 100) * MAX_STEPS) - currentBlindsPosition;
        let dir = steps < 0 ? DOWN : UP;
        moveBlinds(dir, Math.abs(steps), DEFAULT_SPEED);
    });

    socket.on("reset-blinds", () => {
        currentBlindsPosition = 0;
        storeBlindsPosition(0);
    });

    socket.on("stop blinds", () => {
        if (blindsInMotion) {
            interrupted = true;
        }
    });

    socket.emit("current-pos", (currentBlindsPosition / MAX_STEPS) * 100);
});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function storeBlindsPosition(value) {
    fs.writeFileSync(blindsPositionFilePath, value);
}

function readBlindsPosition() {
    try {
        return parseInt(fs.readFileSync(blindsPositionFilePath, "utf8"));
    } catch (err) {
        console.log(err);
        return null;
    }
}

function setupBlinds() {
    if (blindsInMotion) {
        return;
    }
    if (dirPin == null) {
        dirPin = new Gpio(18, "out");
    }
    if (pullPin == null) {
        pullPin = new Gpio(16, "out");
    }
    if (enablePin == null) {
        enablePin = new Gpio(7, "out");
    }
}

async function moveBlinds(dir, steps, speed) {
    if (blindsInMotion) {
        return;
    }
    console.log(
        `Current position: ${currentBlindsPosition}. Moving blinds ${dir}, steps: ${steps}`
    );
    // setupBlinds();
    // setMotorEnabled(true);

    // dirPin.writeSync(dir == DOWN ? Gpio.HIGH : Gpio.LOW);
    blindsInMotion = true;
    let counter = 0;
    while (true) {
        // pullPin.writeSync(Gpio.HIGH);
        // console.log("prestep");
        await delay(1);
        console.log("counter: " + counter);
        // pullPin.writeSync(Gpio.LOW);
        await delay(STEP_WAIT_TIME / speed);
        if (counter >= steps || interrupted) {
            if (interrupted) {
                console.log(`interrupted: ${interrupted}`);
            }
            break;
        }
        counter++;
        currentBlindsPosition += dir == DOWN ? -1 : 1;
    }
    storeBlindsPosition(currentBlindsPosition.toString());
    blindsInMotion = false;
    interrupted = false;
    // setMotorEnabled(false);
}

function setMotorEnabled(isEnabled) {
    enablePin.writeSync(isEnabled ? Gpio.HIGH : Gpio.LOW);
}

function cleanup() {
    if (dirPin) {
        dirPin.unexport();
        dirPin = null;
    }
    if (pullPin) {
        pullPin.unexport();
        pullPin = null;
    }
    if (enablePin) {
        enablePin.unexport();
        enablePin = null;
    }
}

process.on("SIGINT", (_) => {
    console.log(`curr ${currentBlindsPosition}`);
    storeBlindsPosition(currentBlindsPosition.toString());
    cleanup();
    process.exit();
});

// def setup():
//         GPIO.setmode(GPIO.BCM)
//         GPIO.setup(dir_pin, GPIO.OUT)
//         GPIO.setup(pull_pin, GPIO.OUT)
//         GPIO.setup(enable_pin, GPIO.OUT)
//         GPIO.output(enable_pin, GPIO.LOW)
//         set_microstep()

// def set_microstep():
//         GPIO.setup(ms1_pin, GPIO.OUT)
//         GPIO.setup(ms2_pin, GPIO.OUT)
//         GPIO.output(ms1_pin, GPIO.LOW)
//         GPIO.output(ms2_pin, GPIO.LOW)

// def move_blinds(dir, steps=DEFAULT_STEPS, speed=DEFAULT_SPEED_MULTIPLIER):
//         setup()
//         dir_gpio = GPIO.HIGH if dir == "down" or dir == "d" else GPIO.LOW
//         GPIO.output(dir_pin, dir_gpio)
//         counter=0
//         while True:
//                 GPIO.output(pull_pin, GPIO.HIGH)
//                 time.sleep(0.001)
//                 GPIO.output(pull_pin, GPIO.LOW)
//                 time.sleep(SPEED/speed)
//                 counter = counter + 1
//                 print("Counter: {}".format(counter))
//                 if counter >= steps:
//                         break
//         GPIO.setup(enable_pin, GPIO.HIGH)

// def main():
//         dir = input("which direction (up/down/schedule)? ")
//         if dir != "up" and dir != "down" and dir != "u" and dir != "d" and dir != "schedule" and dir != "s":
//                 print("wrong input")
//                 return
//         try:
//                 if dir == "s" or dir == "schedule":
//                         schedule_time_down = DEFAULT_SCHEDULE_TIME_DOWN
//                         #schedule_time_down_full = DEFAULT_SCHEDULE_TIME_DOWN_FULL
//                         schedule_time_up = DEFAULT_SCHEDULE_TIME_UP
//                         steps = DEFAULT_STEPS
//                         #schedule.every().day.at(schedule_time_down).do(move_blinds, "d", steps * DEFAULT_PARTIAL_STEPS_FACTOR)
//                         #schedule.every().day.at(schedule_time_down_full).do(move_blinds, "d", steps * (1 - DEFAULT_PARTIAL_STEPS_FACTOR))
//                         schedule.every().day.at(schedule_time_down).do(move_blinds, "d", steps)
//                         schedule.every().day.at(schedule_time_up).do(move_blinds, "u")
//                         print("Scheduling blinds going down at {} and up at {}".format(schedule_time_down, schedule_time_up))
//                         while True:
//                                 schedule.run_pending()
//                                 time.sleep(1)
//                 else:
//                         steps = input("How many steps? ")
//                         try:
//                                 steps = DEFAULT_STEPS if steps == "" else int(steps)
//                                 speed = input("What speed multiplier? ")
//                                 speed = DEFAULT_SPEED_MULTIPLIER if speed == "" else int(speed)
//                                 move_blinds(dir, steps, speed)
//                         except ValueError:
//                                 print("Steps value must be a number")
//         except KeyboardInterrupt:
//                 GPIO.cleanup()
