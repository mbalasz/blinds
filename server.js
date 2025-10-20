const express = require("express");
const path = require("path");
const { Server } = require("socket.io");
const fs = require("fs");
const { Blinds } = require("./blinds");
const BlindsScheduler = require('./blinds_scheduler')

// Conditionally load real or mock motor based on environment variable
const useMockMotor = process.env.USE_MOCK_MOTOR === 'true';
const Motor = useMockMotor ? require("./mock-motor") : require("./motor");

const app = express();
const port = 3000;
const blindsPositionFilePath = "blinds.txt";
const blindsScheduleFilePath = "blinds_schedule.txt";

const MOVE_UP_STEPS = 300;
const MOVE_DOWN_STEPS = 300;
const MAX_STEPS = 16500;

// Display server mode
if (useMockMotor) {
  console.log("=".repeat(60));
  console.log("  BLINDS TEST SERVER - Using Mock Motor");
  console.log("  No hardware required - safe for UI testing");
  console.log("=".repeat(60));
} else {
  console.log("=".repeat(60));
  console.log("  BLINDS PRODUCTION SERVER - Using Real Motor");
  console.log("  Connected to GPIO hardware");
  console.log("=".repeat(60));
}

const motor = new Motor(/* enablePin= */ 21, /*dirPin= */ 23, /* stepPin= */ 24, 'motor.py');
const initialBlindsPosition = readBlindsPositionSync() || 0;
const blinds = new Blinds(motor, initialBlindsPosition, MAX_STEPS);

console.log(`Initial blinds position: ${initialBlindsPosition} steps (${((initialBlindsPosition / MAX_STEPS) * 100).toFixed(1)}%)`);

const blindsScheduler = new BlindsScheduler(blinds);
const storedBlindsSchedule = readBlindsScheduleSync();

if (storedBlindsSchedule && storedBlindsSchedule['open'] && storedBlindsSchedule['close']) {
  console.log("Blinds schedule:", storedBlindsSchedule);
  blindsScheduler.scheduleBlindsOpen(
    storedBlindsSchedule['open'].hour, storedBlindsSchedule['open'].minute);
  blindsScheduler.scheduleBlindsClose(
    storedBlindsSchedule['close'].hour, storedBlindsSchedule['close'].minute);
} else {
  console.log("No valid schedule file found - scheduling disabled");
}

const storeCurrentBlindsPositionOnMotionChange = (blindsInMotion) => {
  if (!blindsInMotion) {
    storeBlindsPositionSync(blinds.getBlindsPosition());
  }
};
blinds.registerBlindsStatusObservers([storeCurrentBlindsPositionOnMotionChange]);
const storeCurrentBlindsPositionOnReset = (resetPosition) => {
  storeBlindsPositionSync(resetPosition);
}
blinds.registerBlindsResetObservers([storeCurrentBlindsPositionOnReset]);

app.use(express.static("public"));
app.get("/", (_, res) => {
  res.sendFile(path.join(__dirname, "/public/index.html"));
});

const server = app.listen(port, () => {
  console.log(`\nServer running at http://localhost:${port}`);
  console.log("Press Ctrl+C to stop\n");
});

const io = new Server(server);
io.on("connection", (socket) => {
  socket.on("slider-changed", (percentage) => {
    blinds.moveToPosition(percentage);
  });

  socket.on("reset-up", () => {
    blinds.resetBlindsUp();
  });

  socket.on("reset-down", () => {
    blinds.resetBlindsDown();
  });

  socket.on("stop-blinds", () => {
    blinds.stopBlinds();
  });

  socket.on("move-up", () => {
    blinds.moveUp(MOVE_UP_STEPS);
  });

  socket.on("move-up-end", () => {
    blinds.moveUpToEnd();
  });

  socket.on("move-down", () => {
    blinds.moveDown(MOVE_DOWN_STEPS);
  });

  socket.on("move-down-end", () => {
    blinds.moveDownToEnd();
  });

  console.log("[Socket] Client connected");

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

  const resetBlinds = (position) =>
    socket.emit("blinds-position", {
      blindsPosition: position / MAX_STEPS * 100,
      animate: true,
    });
  const resetObservers = [resetBlinds];
  blinds.registerBlindsResetObservers(resetObservers);

  socket.on("disconnect", () => {
    console.log("[Socket] Client disconnected");
    blinds.unregisterBlindsStatusObservers(statusObservers);
    blinds.unregisterBlindsPositionObservers(positionObservers);
    blinds.unregisterBlindsResetObservers(resetObservers);
  });

  socket.emit("start-pos", (blinds.getBlindsPosition() / MAX_STEPS) * 100);
});

function storeBlindsPositionSync(value) {
  console.log(`[Storage] Storing blinds position: ${value} steps`);
  fs.writeFileSync(blindsPositionFilePath, value.toString());
}

function readBlindsPositionSync() {
  try {
    return parseInt(fs.readFileSync(blindsPositionFilePath, "utf8"));
  } catch (err) {
    console.log("[Storage] Couldn't read the blinds position from disk (will start at 0)");
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
  console.log("\n[Server] Shutting down...");
  if (blinds) {
    storeBlindsPositionSync(blinds.getBlindsPosition());
    blinds.cleanup();
  }
  blinds.unregisterBlindsStatusObservers([storeCurrentBlindsPositionOnMotionChange]);
  process.exit();
});
