#!/usr/bin/env python3
"""
Read and display current TMC2209 configuration.

This script reads all configuration registers from the TMC2209 driver
and displays them in a human-readable format. Use this to:
- Verify UART connection is working
- Check current driver settings
- Debug configuration issues

Run manually with: python3 read_tmc_config.py
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

def read_tmc2209_config():
    """Read and display TMC2209 configuration"""

    print("=" * 70)
    print(" TMC2209 Configuration Reader")
    print("=" * 70)
    print()

    try:
        # Initialize TMC2209
        print(f"Connecting to TMC2209 on {UART_PORT}...")
        tmc = Tmc2209(
            TmcEnableControlPin(ENABLE_PIN),
            TmcMotionControlStepDir(STEP_PIN, DIR_PIN),
            TmcComUart(UART_PORT),
            loglevel=Loglevel.INFO
        )

        print("✓ Connected successfully!\n")
        print("=" * 70)
        print(" Current Configuration")
        print("=" * 70)
        print()

        # Read GCONF register
        print("--- GCONF (General Configuration) ---")
        gconf = tmc.read_gconf()
        print()

        # Read CHOPCONF register
        print("--- CHOPCONF (Chopper Configuration) ---")
        chopconf = tmc.read_chopconf()
        print()

        # Read current settings
        print("--- Current Settings (IHOLD_IRUN) ---")
        tmc.ihold_irun.read()
        irun = tmc.ihold_irun.irun
        ihold = tmc.ihold_irun.ihold
        ihold_delay = tmc.ihold_irun.ihold_delay

        # Calculate actual current (approximate)
        vsense = chopconf.vsense
        vfs = 0.180 if vsense else 0.325
        rsense = 0.11

        run_current_ma = (irun + 1) / 32.0 * vfs / (rsense + 0.02) / 1.41421 * 1000
        hold_current_ma = (ihold + 1) / 32.0 * vfs / (rsense + 0.02) / 1.41421 * 1000

        print(f"  IRUN (run current scale):    {irun}/31")
        print(f"  IHOLD (hold current scale):   {ihold}/31")
        print(f"  IHOLD_DELAY:                  {ihold_delay}")
        print(f"  Estimated run current:        ~{int(run_current_ma)} mA")
        print(f"  Estimated hold current:       ~{int(hold_current_ma)} mA")
        print()

        # Read driver status
        print("--- DRV_STATUS (Driver Status) ---")
        drvstatus = tmc.read_drv_status()
        print()

        # Read IO status
        print("--- IOIN (Input/Output Status) ---")
        ioin = tmc.read_ioin()
        print()

        # Summary of key settings
        print("=" * 70)
        print(" Key Settings Summary")
        print("=" * 70)
        print()

        mode = "StealthChop (QUIET)" if not gconf.spreadcycle else "SpreadCycle (POWERFUL)"
        print(f"  Mode:                  {mode}")
        print(f"  Microstepping:         1/{chopconf.mres_ms}")
        print(f"  Interpolation:         {'ENABLED' if chopconf.intpol else 'DISABLED'}")
        print(f"  Direction (shaft):     {'CW' if gconf.shaft else 'CCW'}")
        print(f"  VSense:                {'High sensitivity (0.180V)' if vsense else 'Low sensitivity (0.325V)'}")
        print(f"  Run Current:           ~{int(run_current_ma)} mA")
        print(f"  Hold Current:          ~{int(hold_current_ma)} mA")
        print(f"  Motor Enabled:         {'YES' if not ioin.enn else 'NO'}")
        print()

        # Additional helpful info
        print("=" * 70)
        print(" Pin Status")
        print("=" * 70)
        print()
        print(f"  EN pin (inverted):     {'HIGH (motor OFF)' if ioin.enn else 'LOW (motor ON)'}")
        print(f"  STEP pin:              {'HIGH' if ioin.step else 'LOW'}")
        print(f"  DIR pin:               {'HIGH' if ioin.dir else 'LOW'}")
        print()

        # Recommendations
        print("=" * 70)
        print(" Recommendations for Quiet Operation")
        print("=" * 70)
        print()

        recommendations = []
        if gconf.spreadcycle:
            recommendations.append("⚠ Consider switching to StealthChop for quieter operation")
        if chopconf.mres_ms < 16:
            recommendations.append("⚠ Consider increasing microstepping to 16 or 32 for smoother/quieter movement")
        if not chopconf.intpol:
            recommendations.append("⚠ Enable interpolation for smoother movement")
        if run_current_ma > 1200:
            recommendations.append("⚠ Current seems high - may cause unnecessary heat/noise")
        if run_current_ma < 400:
            recommendations.append("⚠ Current seems low - may cause skipped steps")

        if recommendations:
            for rec in recommendations:
                print(f"  {rec}")
        else:
            print("  ✓ Configuration looks good for quiet operation!")

        print()
        print("=" * 70)

        # Clean up
        del tmc
        return 0

    except TmcComException as e:
        print()
        print("=" * 70)
        print(" ERROR: UART Communication Failed")
        print("=" * 70)
        print()
        print(f"Error details: {e}")
        print()
        print("Troubleshooting steps:")
        print("  1. Check UART wiring:")
        print("     - RX (GPIO 15) → TMC2209 PDN_UART (direct)")
        print("     - TX (GPIO 14) → TMC2209 PDN_UART (via 1kΩ resistor)")
        print()
        print("  2. Verify serial port is enabled:")
        print("     sudo raspi-config → Interface Options → Serial Port")
        print()
        print("  3. Check serial port permissions:")
        print("     sudo chmod 660 /dev/serial0")
        print("     sudo usermod -a -G dialout $USER")
        print()
        print("  4. Ensure TMC2209 has power (VDD and VM pins)")
        print()
        print("  5. Try running with sudo (if permission issue):")
        print("     sudo python3 read_tmc_config.py")
        print()
        return 1

    except Exception as e:
        print()
        print("=" * 70)
        print(" ERROR: Unexpected Error")
        print("=" * 70)
        print()
        print(f"Error: {e}")
        print()
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(read_tmc2209_config())
