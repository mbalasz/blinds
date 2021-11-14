const express = require("express");
const path = require("path");
const { Server } = require("socket.io");
const fs = require("fs");
const { Blinds } = require("./blinds");
const Motor = require("./motor");

const app = express();
const port = 3000;
const blindsPositionFilePath = "blinds.txt";

const MOVE_UP_STEPS = 50;
const MOVE_DOWN_STEPS = 50;
const MAX_STEPS = 16500;

let initialBlindsPosition = readBlindsPositionSync() || 0;
let blinds;

app.use(express.static("public"));
app.get("/", (_, res) => {
  res.sendFile(path.join(__dirname, "/public/index.html"));
});

const server = app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

let motor = new Motor(7, 18, 16);
blinds = new Blinds(motor, initialBlindsPosition, MAX_STEPS);

const io = new Server(server);
io.on("connection", (socket) => {
  socket.on("slider-changed", (percentage) => {
    blinds.moveToPosition(percentage);
  });

  socket.on("reset", () => {
    blinds.resetBlinds();
  });

  socket.on("stop-blinds", () => {
    blinds.stopBlinds();
  });

  socket.on("move-up", () => {
    blinds.moveUp(MOVE_UP_STEPS);
  });

  socket.on("move-down", () => {
    blinds.moveDown(MOVE_DOWN_STEPS);
  });

  console.log("Connected");

  const setArrowsEnabled = (blindsInMotion) =>
    socket.emit("set-arrows-enabled", !blindsInMotion);
  const setStopEnabled = (blindsInMotion) =>
    socket.emit("set-stop-enabled", blindsInMotion);
  const setSliderEnabled = (blindsInMotion) =>
    socket.emit("set-slider-enabled", !blindsInMotion);
  const setResetEnabled = (blindsInMotion) =>
    socket.emit("set-reset-enabled", !blindsInMotion);
  const storeCurrentBlindsPosition = (blindsInMotion) => {
    if (!blindsInMotion) {
      storeBlindsPositionSync(blinds.getBlindsPosition());
    }
  };
  const statusObservers = [
    setArrowsEnabled,
    setStopEnabled,
    setSliderEnabled,
    setResetEnabled,
    storeCurrentBlindsPosition,
  ];
  blinds.registerBlindsStatusObservers(statusObservers);

  const updateBlindsPosition = (blindsPosition, maxPosition) =>
    socket.emit("blinds-position", {
      blindsPosition: (blindsPosition / maxPosition) * 100,
      animate: false,
    });
  const positionObservers = [updateBlindsPosition];
  blinds.registerBlindsPositionObservers(positionObservers);

  const resetBlinds = () =>
    socket.emit("blinds-position", {
      blindsPosition: 0,
      animate: true,
    });
  const resetObservers = [resetBlinds, storeCurrentBlindsPosition];
  blinds.registerBlindsResetObservers(resetObservers);

  socket.on("disconnect", () => {
    console.log("Disconnecting...");
    blinds.unregisterBlindsStatusObservers(statusObservers);
    blinds.unregisterBlindsPositionObservers(positionObservers);
    blinds.unregisterBlindsResetObservers(resetObservers);
  });

  socket.emit("start-pos", (blinds.getBlindsPosition() / MAX_STEPS) * 100);
});

function storeBlindsPositionSync(value) {
  console.log("Storing " + value);
  fs.writeFileSync(blindsPositionFilePath, value.toString());
}

function readBlindsPositionSync() {
  try {
    return parseInt(fs.readFileSync(blindsPositionFilePath, "utf8"));
  } catch (err) {
    console.log("Couldn't read the blinds position from disk");
    return null;
  }
}

process.on("SIGINT", (_) => {
  console.log(`curr ${initialBlindsPosition}`);
  if (blinds) {
    storeBlindsPositionSync(blinds.getBlindsPosition());
    blinds.cleanup();
  }
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
