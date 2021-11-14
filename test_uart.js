const Motor = require("./motor");

let motor = new Motor();
console.log("reading general info");
motor.readGeneralInfo();
motor.setIHoldIRun(3, 9, 10);
