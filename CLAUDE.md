# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Raspberry Pi-based automated blinds control system. The system uses a stepper motor controlled via GPIO pins to move blinds up and down. It provides:
- Real-time web interface for manual control
- WebSocket-based communication for live position updates
- Scheduled automatic opening/closing via cron
- Persistent position storage across restarts

## Hardware Integration

The system controls a stepper motor through a Python script (`motor.py`) that interfaces with Raspberry Pi GPIO pins:
- **Enable Pin**: 21
- **Direction Pin**: 23
- **Step Pin**: 24

The motor control includes an overshoot mechanism (160 steps) that moves slightly beyond the target position then reverses, helping prevent mechanical binding.

## Architecture

### Core Components

1. **Motor (`motor.js`)**: Node.js wrapper that spawns Python processes to control the stepper motor. Communicates via stdout parsing to track progress.

2. **Blinds (`blinds.js`)**: Main business logic managing blinds state and movement
   - Tracks current position (0 = fully closed/bottom, maxSteps = fully open/top)
   - Prevents concurrent movements via `blindsInMotion` flag
   - Uses observer pattern for position, status, and reset events
   - Position is measured in steps (MAX_STEPS = 16500 for full travel)

3. **BlindsScheduler (`blinds_scheduler.js`)**: Cron-based scheduling wrapper that schedules daily open/close operations

4. **Server (`server.js`)**: Express + Socket.IO server
   - Serves static web UI from `public/`
   - Manages WebSocket connections for real-time control
   - Handles observer registration/cleanup per connection
   - Persists blinds position to `blinds.txt` on motion changes
   - Reads schedule from `blinds_schedule.txt` (format: `open HH:MM` and `close HH:MM`)

### Observer Pattern

The `Blinds` class implements an observer pattern with three event types:
- **Position observers**: Fired during movement with current step count
- **Status observers**: Fired when motion starts/stops (controls UI enable/disable)
- **Reset observers**: Fired when position is manually reset without movement

Observers are registered/unregistered per Socket.IO connection to prevent memory leaks and ensure proper cleanup.

### Position Tracking

Position is tracked in steps and converted to percentage for the UI:
- Internal: 0 to MAX_STEPS (16500)
- UI: 0% (closed) to 100% (open)
- Position persisted to `blinds.txt` after each movement completes
- Position loaded from disk on server startup

### Movement Control

Movement safety is built in:
- `moveUp(steps)` and `moveDown(steps)` automatically cap to safe limits
- `moveToPosition(percentage)` calculates required steps and direction
- Only one movement allowed at a time (`blindsInMotion` guard)
- Motor reports progress via stdout, parsed line-by-line to update position

## Development Commands

### Running the server
```bash
node server.js
```
Server runs on port 3000 and serves the web interface at `http://localhost:3000`

### Compiling styles
```bash
npm run sass:compile
```
Compiles `public/style.scss` to `public/style.css`

### Manual motor testing
```bash
python3 motor.py <enable_pin> <dir_pin> <step_pin> <steps> <direction> <speed_multiplier>
```
Example: `python3 motor.py 21 23 24 1000 up 5`

## Configuration Files

### blinds_schedule.txt
Defines daily open/close schedule:
```
open HH:MM
close HH:MM
```
Changes require server restart to take effect.

### blinds.txt
Stores current blinds position in steps. Written automatically after movements and on SIGINT.

## Key Constants (server.js)

- `MAX_STEPS`: 16500 (full travel distance)
- `MOVE_UP_STEPS`: 300 (incremental up button movement)
- `MOVE_DOWN_STEPS`: 300 (incremental down button movement)
- Default speed: 5 (higher = faster)

## Socket.IO Events

### Client → Server
- `slider-changed`: Move to percentage position
- `move-up` / `move-down`: Incremental movement
- `move-up-end` / `move-down-end`: Full open/close
- `stop-blinds`: Emergency stop
- `reset-up` / `reset-down`: Set current position without movement

### Server → Client
- `start-pos`: Initial position on connect
- `blinds-position`: Position update with animate flag
- `set-arrows-enabled`: Enable/disable movement buttons
- `set-stop-enabled`: Enable/disable stop button
- `set-slider-enabled`: Enable/disable slider
- `set-reset-enabled`: Enable/disable reset buttons

## Important Notes

- The Python motor script must run on a Raspberry Pi with GPIO access
- Motor control uses RPi.GPIO library (BCM pin numbering)
- Graceful shutdown (SIGINT) ensures position is saved before exit
- Observer cleanup on socket disconnect prevents memory leaks
- The overshoot mechanism in `motor.py` (lines 37-43) is critical for smooth operation
