const cron = require('node-cron');

class BlindsScheduler {
    constructor(blinds) {
        this.blinds = blinds;
    }

    scheduleBlindsOpen(hour, minute) {
        console.log(`Scheduling blinds to open at 
            ${this.getTimeFormattedString(hour)}:${this.getTimeFormattedString(minute)}`);
        this.scheduleCallback(hour, minute, () => this.blinds.moveUpToEnd());
    }

    scheduleBlindsClose(hour, minute) {
        console.log(`Scheduling blinds to close at 
            ${this.getTimeFormattedString(hour)}:${this.getTimeFormattedString(minute)}`);
        this.scheduleCallback(hour, minute, () => this.blinds.moveDownToEnd());
    }

    scheduleCallback(hour, minute, callback) {
        cron.schedule(`${minute} ${hour} * * *`, callback)
    }

    getTimeFormattedString(number) {
        return String(number).padStart(2, '0');
    }
}

module.exports = BlindsScheduler;