import sys
import RPi.GPIO as GPIO
import time

#from TMC_2209.TMC_2209_StepperDriver import *

MIN_STEP_DELAY_MS = 0.001
STEP_WAIT_TIME = 0.03;
MOVE_CURRENT = 600

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
    GPIO.output(enable_pin, GPIO.LOW)
    if dir == 'down':
        GPIO.output(dir_pin, GPIO.HIGH)
    elif dir == 'up':
        GPIO.output(dir_pin, GPIO.LOW)
#    tmc.setCurrent(MOVE_CURRENT)
    curr_steps = 0
    try:
        while curr_steps < steps:
            GPIO.output(step_pin, GPIO.HIGH)
            time.sleep(MIN_STEP_DELAY_MS)
            GPIO.output(step_pin, GPIO.LOW)
            curr_steps += 1
            print(curr_steps, flush=True)
            time.sleep(STEP_WAIT_TIME / speed_multiplier)
    except KeyboardInterrupt:
        print("Received interrupt. Cleaning up...")
        GPIO.cleanup()
    GPIO.output(enable_pin, GPIO.HIGH)

setup(enable_pin, step_pin, dir_pin)
move(int(sys.argv[4]), sys.argv[5], int(sys.argv[6]))
