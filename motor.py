import sys
import RPi.GPIO as GPIO
import time

#from TMC_2209.TMC_2209_StepperDriver import *

MIN_STEP_DELAY_MS = 0.001
STEP_WAIT_TIME = 0.03
MOVE_CURRENT = 600
OVERSHOOT = 160

enable_pin = int(sys.argv[1])
dir_pin = int(sys.argv[2])
step_pin = int(sys.argv[3])
#tmc = TMC_2209()

def setup(enable_pin, step_pin, dir_pin):
    GPIO.setmode(GPIO.BCM)
    GPIO.setup(dir_pin, GPIO.OUT)
    GPIO.setup(step_pin, GPIO.OUT)
    GPIO.setup(enable_pin, GPIO.OUT)

def move(steps, dir, speed_multiplier):
    print("Move by steps {}, and dir {}".format( steps, dir) , flush=True)
    if steps <= 0:
        return
    GPIO.output(enable_pin, GPIO.LOW)
#    curr_position = tmc.getMicrostepCounter()
#    print("Curr pos before: ", curr_position)
    if dir == 'up':
        GPIO.output(dir_pin, GPIO.LOW)
    else:
        GPIO.output(dir_pin, GPIO.HIGH)
    time.sleep(MIN_STEP_DELAY_MS)
#    tmc.setCurrent(MOVE_CURRENT)
    curr_steps = 0
    overshoot_triggered = False
    try:
        while curr_steps < steps + 2 * OVERSHOOT:
            if curr_steps >= steps + OVERSHOOT and not overshoot_triggered:
                if dir == 'up':
                    print("Reversing from up to down", flush=True)
                    GPIO.output(dir_pin, GPIO.HIGH)
                else:
                    print("Reversing from down to up", flush=True)
                    GPIO.output(dir_pin, GPIO.LOW) 
                overshoot_triggered = True
                time.sleep(MIN_STEP_DELAY_MS)

            GPIO.output(step_pin, GPIO.HIGH)
            time.sleep(MIN_STEP_DELAY_MS)
            GPIO.output(step_pin, GPIO.LOW)
            curr_steps += 1
            if curr_steps < steps:
                print(curr_steps, flush=True, end="")
            time.sleep(STEP_WAIT_TIME / speed_multiplier)
    except KeyboardInterrupt:
        print("Received interrupt. Cleaning up...")
        GPIO.cleanup()
#    curr_position = tmc.getMicrostepCounter()
#    print("Curr pos after: ", curr_position)

    GPIO.output(enable_pin, GPIO.HIGH)

setup(enable_pin, step_pin, dir_pin)
move(int(sys.argv[4]), sys.argv[5], int(sys.argv[6]))
