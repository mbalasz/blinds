#!/usr/bin/env python3
"""
Configure TMC2209 stepper driver for quiet, reliable blinds operation.

This script configures the TMC2209 driver via UART for:
- StealthChop mode (quiet operation)
- Optimal current for no skipped steps
- High microstepping for smooth movement
- Interpolation for even smoother operation

Run this script once at server startup to configure the driver.
The settings persist in the TMC2209 registers until power cycle.
"""

import sys
try:
    from tmc_driver.tmc_2209 import *
except ImportError:
    print("ERROR: tmc_driver library not installed.")
    print("Install with: cd tmc-driver && pip3 install .")
    sys.exit(1)

# Configuration constants
ENABLE_PIN = 21
STEP_PIN = 24
DIR_PIN = 23
UART_PORT = "/dev/serial0"

# Motor current settings (adjust these based on testing)
RUN_CURRENT_MA = 600        # Running current in milliamps (start with 600, increase if skipping)
HOLD_CURRENT_MULT = 0.3     # Hold current multiplier (30% of run current when stationary)
HOLD_CURRENT_DELAY = 10     # Delay before reducing to hold current

# Microstepping and movement settings
MICROSTEPPING = 16          # 16 microsteps = smooth and quiet (options: 1,2,4,8,16,32,64,128,256)

def configure_tmc2209():
    """Configure TMC2209 for quiet, reliable operation"""

    print("---")
    print("TMC2209 Configuration Script")
    print("---")

    try:
        # Initialize TMC2209 with UART communication
        print(f"Initializing TMC2209 on {UART_PORT}...")
        tmc = Tmc2209(
            TmcEnableControlPin(ENABLE_PIN),
            TmcMotionControlStepDir(STEP_PIN, DIR_PIN),
            TmcComUart(UART_PORT),
            loglevel=Loglevel.INFO
        )

        print("\nConfiguring for QUIET operation...")

        # Set motor current
        print(f"  Setting current: {RUN_CURRENT_MA}mA run, {int(RUN_CURRENT_MA * HOLD_CURRENT_MULT)}mA hold")
        tmc.set_current(
            run_current=RUN_CURRENT_MA,
            hold_current_multiplier=HOLD_CURRENT_MULT,
            hold_current_delay=HOLD_CURRENT_DELAY
        )

        # Enable StealthChop for quiet operation
        print("  Enabling StealthChop mode (quiet)")
        tmc.set_spreadcycle(False)  # False = StealthChop (quiet), True = SpreadCycle (powerful)

        # Enable interpolation for smoother movement
        print("  Enabling interpolation (smoother)")
        tmc.set_interpolation(True)

        # Set microstepping resolution
        print(f"  Setting microstepping: 1/{MICROSTEPPING}")
        tmc.set_microstepping_resolution(MICROSTEPPING)

        # Set direction (can be changed if motor runs backwards)
        tmc.set_direction_reg(False)

        print("\n---")
        print("Configuration Summary:")
        print("---")

        # Read back and display configuration
        tmc.read_gconf()
        tmc.read_chopconf()
        tmc.read_drv_status()

        print("\n---")
        print("TMC2209 configured successfully!")
        print("Settings will persist until power cycle.")
        print("---")

        # Clean up
        del tmc
        return 0

    except TmcComException as e:
        print(f"\nERROR: UART Communication failed: {e}")
        print("\nTroubleshooting:")
        print("1. Check UART wiring (RX/TX to TMC2209 PDN_UART)")
        print("2. Verify serial port is enabled: sudo raspi-config")
        print("3. Check permissions: sudo chmod 660 /dev/serial0")
        print("4. Ensure TMC2209 has power")
        return 1

    except Exception as e:
        print(f"\nERROR: Configuration failed: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(configure_tmc2209())
