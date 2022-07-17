const cron = require('node-cron');

class BlindsScheduler {
    constructor(blinds) {
        this.blinds = blinds;
    }

    scheduleBlindsOpen(hour, minute) {
        console.log(`Scheduling blinds to open at 
            ${this.getTimeFormattedString(hour)}:${this.getTimeFormattedString(minute)}`);
        this.scheduleMoveBlindsToPosition(hour, minute, 0);
    }

    scheduleBlindsClose(hour, minute) {
        console.log(`Scheduling blinds to close at 
            ${this.getTimeFormattedString(hour)}:${this.getTimeFormattedString(minute)}`);
        this.scheduleMoveBlindsToPosition(hour, minute, 100);
    }

    scheduleMoveBlindsToPosition(hour, minute, position) {
        cron.schedule(`${minute} ${hour} * * *`, () => {
            this.blinds.moveToPosition(position);
        })
    }

    getTimeFormattedString(number) {
        return String(number).padStart(2, '0');
    }
}

module.exports = BlindsScheduler;