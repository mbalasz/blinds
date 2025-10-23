#!/usr/bin/env python3
"""
Test script to debug current setting issues.
This script will attempt to set the current and immediately verify it was written.
"""

import sys
try:
    from tmc.src.tmc_driver.tmc_2209 import *
except ImportError:
    print("ERROR: tmc_driver library not installed.")
    sys.exit(1)

# Configuration constants
ENABLE_PIN = 21
STEP_PIN = 24
DIR_PIN = 23
UART_PORT = "/dev/serial0"
TEST_CURRENT = 600  # 600mA test current

print("=" * 70)
print(" TMC2209 Current Setting Debug Test")
print("=" * 70)
print()

try:
    # Initialize TMC2209
    print("Initializing TMC2209...")
    tmc = Tmc2209(
        TmcEnableControlPin(ENABLE_PIN),
        TmcMotionControlStepDir(STEP_PIN, DIR_PIN),
        TmcComUart(UART_PORT),
        loglevel=Loglevel.DEBUG  # Use DEBUG for detailed output
    )
    print("✓ Connected\n")

    # Read current settings BEFORE
    print("=" * 70)
    print(" BEFORE Setting Current")
    print("=" * 70)
    tmc.ihold_irun.read()
    print(f"  IRUN:       {tmc.ihold_irun.irun}/31")
    print(f"  IHOLD:      {tmc.ihold_irun.ihold}/31")
    print(f"  IHOLDDELAY: {tmc.ihold_irun.iholddelay}")
    print()

    # Try to set current
    print("=" * 70)
    print(f" Setting Current to {TEST_CURRENT}mA...")
    print("=" * 70)
    print()

    tmc.set_current(
        run_current=TEST_CURRENT,
        hold_current_multiplier=0.5,
        hold_current_delay=10
    )

    print("\n✓ set_current() completed")
    print()

    # Read current settings AFTER
    print("=" * 70)
    print(" AFTER Setting Current")
    print("=" * 70)
    tmc.ihold_irun.read()
    irun_after = tmc.ihold_irun.irun
    ihold_after = tmc.ihold_irun.ihold
    iholddelay_after = tmc.ihold_irun.iholddelay

    print(f"  IRUN:       {irun_after}/31")
    print(f"  IHOLD:      {ihold_after}/31")
    print(f"  IHOLDDELAY: {iholddelay_after}")
    print()

    # Verify the write worked
    print("=" * 70)
    print(" Verification")
    print("=" * 70)

    if irun_after > 0:
        print(f"  ✓ SUCCESS: IRUN was written (value = {irun_after})")
    else:
        print(f"  ✗ FAILED: IRUN is still 0 - write did not work!")

    if ihold_after > 0:
        print(f"  ✓ SUCCESS: IHOLD was written (value = {ihold_after})")
    else:
        print(f"  ✗ FAILED: IHOLD is still 0 - write did not work!")

    if iholddelay_after == 10:
        print(f"  ✓ SUCCESS: IHOLDDELAY was written (value = {iholddelay_after})")
    else:
        print(f"  ✗ FAILED: IHOLDDELAY is {iholddelay_after}, expected 10")

    print()

    # Read GCONF to check if motor output is enabled
    print("=" * 70)
    print(" Additional Diagnostics")
    print("=" * 70)
    tmc.gconf.read()
    print(f"  PDN_DISABLE: {tmc.gconf.pdn_disable} (should be True for UART)")

    tmc.ioin.read()
    print(f"  ENN pin:     {tmc.ioin.enn} (False = motor enabled)")
    print()

    # Calculate what the current should be
    tmc.chopconf.read()
    vsense = tmc.chopconf.vsense
    vfs = 0.180 if vsense else 0.325
    rsense = 0.11

    if irun_after > 0:
        actual_current = (irun_after + 1) / 32.0 * vfs / (rsense + 0.02) / 1.41421 * 1000
        print(f"  Calculated run current: ~{int(actual_current)} mA (target was {TEST_CURRENT} mA)")

    print()
    print("=" * 70)

    del tmc

except Exception as e:
    print(f"\n✗ ERROR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
