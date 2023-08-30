const express = require("express");
const path = require("path");
const { Server } = require("socket.io");
const fs = require("fs");
const { Blinds } = require("./blinds");
const BlindsScheduler = require('./blinds_scheduler')
const Motor = require("./motor");

const app = express();
const port = 3000;
const blindsPositionFilePath = "blinds.txt";
const blindsScheduleFilePath = "blinds_schedule.txt";

const MOVE_UP_STEPS = 50;
const MOVE_DOWN_STEPS = 50;
const MAX_STEPS = 16500;

const motor = new Motor(/* enablePin= */ 21, /*dirPin= */ 23, /* stepPin= */ 24, 'motor.py');
const initialBlindsPosition = readBlindsPositionSync() || 0;
const blinds = new Blinds(motor, initialBlindsPosition, MAX_STEPS);
const blindsScheduler = new BlindsScheduler(blinds);
const storedBlindsSchedule = readBlindsScheduleSync();
blindsScheduler.scheduleBlindsOpen(
  storedBlindsSchedule['open'].hour, storedBlindsSchedule['open'].minute);
blindsScheduler.scheduleBlindsClose(
  storedBlindsSchedule['close'].hour, storedBlindsSchedule['close'].minute);

const storeCurrentBlindsPosition = (blindsInMotion) => {
  if (!blindsInMotion) {
    storeBlindsPositionSync(blinds.getBlindsPosition());
  }
};
blinds.registerBlindsStatusObservers([storeCurrentBlindsPosition]);

app.use(express.static("public"));
app.get("/", (_, res) => {
  res.sendFile(path.join(__dirname, "/public/index.html"));
});

const server = app.listen(port, () => {
  console.log(`Blinds server listening at http://localhost:${port}`);
});

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
  const statusObservers = [
    setArrowsEnabled,
    setStopEnabled,
    setSliderEnabled,
    setResetEnabled,
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
  console.log("Storing blinds position: " + value);
  fs.writeFileSync(blindsPositionFilePath, value.toString());
}

function readBlindsPositionSync() {
  try {
    return parseInt(fs.readFileSync(blindsPositionFilePath, "utf8"));
  } catch (err) {
    console.log("Couldn't read the blinds position from disk", err);
    return null;
  }
}

function readBlindsScheduleSync() {
  try {
    const file = fs.readFileSync(blindsScheduleFilePath, "utf-8")
    const schedule = {}
    file.split(/\r?\n/).forEach((line) => {
      const idxOfTimeSubstr = line.search(/[0-9]/);
      const idxOfTimeSeparator = line.search(/:/)
      const hour = Number(line.substring(idxOfTimeSubstr, idxOfTimeSeparator));
      const minute = Number(line.substring(idxOfTimeSeparator + 1));
      if (isNaN(hour) || isNaN(minute)) {
        console.log("Error: couldn't parse the schedule");
        return;
      }
      if (line.startsWith('open')) {
        schedule['open'] = {
          hour: hour,
          minute: minute
        }
      } else if (line.startsWith('close')) {
        schedule['close'] = {
          hour: hour,
          minute: minute
        }
      }
    });
    return schedule;
  } catch (err) {
    console.log("Couldn't read the blinds schedule", err);
    return null;
  }
}

process.on("SIGINT", (_) => {
  console.log(`curr ${initialBlindsPosition}`);
  if (blinds) {
    storeBlindsPositionSync(blinds.getBlindsPosition());
    blinds.cleanup();
  }
  blinds.unregisterBlindsStatusObservers([storeCurrentBlindsPosition]);
  process.exit();
});
