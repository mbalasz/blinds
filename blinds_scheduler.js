const cron = require('node-cron');

class BlindsScheduler {
    constructor(blinds) {
        this.blinds = blinds;
        this.openTask = null;
        this.closeTask = null;
    }

    scheduleBlindsOpen(hour, minute) {
        console.log(`Scheduling blinds to open at
            ${this.getTimeFormattedString(hour)}:${this.getTimeFormattedString(minute)}`);

        // Stop existing task if any
        if (this.openTask) {
            this.openTask.stop();
        }

        // Create new task
        this.openTask = cron.schedule(`${minute} ${hour} * * *`, () => this.blinds.moveUpToEnd());
    }

    scheduleBlindsClose(hour, minute) {
        console.log(`Scheduling blinds to close at
            ${this.getTimeFormattedString(hour)}:${this.getTimeFormattedString(minute)}`);

        // Stop existing task if any
        if (this.closeTask) {
            this.closeTask.stop();
        }

        // Create new task
        this.closeTask = cron.schedule(`${minute} ${hour} * * *`, () => this.blinds.moveDownToEnd());
    }

    updateSchedule(openHour, openMinute, closeHour, closeMinute) {
        // Update both schedules atomically
        this.scheduleBlindsOpen(openHour, openMinute);
        this.scheduleBlindsClose(closeHour, closeMinute);
    }

    disableSchedule() {
        if (this.openTask) {
            this.openTask.stop();
        }
        if (this.closeTask) {
            this.closeTask.stop();
        }
        console.log('Schedule disabled');
    }

    enableSchedule() {
        if (this.openTask) {
            this.openTask.start();
        }
        if (this.closeTask) {
            this.closeTask.start();
        }
        console.log('Schedule enabled');
    }

    getTimeFormattedString(number) {
        return String(number).padStart(2, '0');
    }
}

module.exports = BlindsScheduler;