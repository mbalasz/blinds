// Initialize Socket.IO connection
const socket = io();

// DOM elements (loaded after DOM is ready)
let elements = {};

// Animation configuration
const ANIMATION_SPEED = 300;

// Position tracking
let currentPosition = 0;
let targetPosition = null;

// Constants (must match server.js)
const MOVE_STEPS = 300;
const MAX_STEPS = 16500;

/**
 * Initialize the application
 */
function init() {
  // Get all DOM elements
  elements = {
    progressBar: document.getElementById('progress-bar'),
    progressTarget: document.getElementById('progress-target'),
    progressLabel: document.getElementById('progress-label'),
    progressContainer: document.querySelector('.progress-container'),
    up: document.getElementById('up'),
    upEnd: document.getElementById('up-end'),
    down: document.getElementById('down'),
    downEnd: document.getElementById('down-end'),
    stop: document.getElementById('stop'),
    resetUp: document.getElementById('reset-up'),
    resetDown: document.getElementById('reset-down'),
    scheduleToggle: document.getElementById('schedule-toggle'),
    schedulePanel: document.getElementById('schedule-panel'),
    scheduleOpen: document.getElementById('schedule-open'),
    scheduleClose: document.getElementById('schedule-close'),
    scheduleSave: document.getElementById('schedule-save'),
    scheduleStatus: document.getElementById('schedule-status'),
  };

  // Set up event listeners
  setupEventListeners();
  setupScheduleListeners();

  // Set up socket listeners
  setupSocketListeners();

  // Initial state
  setButtonEnabled(elements.up, false);
  setButtonEnabled(elements.down, false);
  setButtonEnabled(elements.stop, false);

  // Request current schedule from server
  socket.emit('get-schedule');
}

/**
 * Set up DOM event listeners
 */
function setupEventListeners() {
  // Button click events with target position tracking
  elements.upEnd.addEventListener('click', () => {
    setTargetPosition(100);
    socket.emit('move-up-end');
  });

  elements.up.addEventListener('click', () => {
    const target = Math.min(currentPosition + (MOVE_STEPS / MAX_STEPS * 100), 100);
    setTargetPosition(target);
    socket.emit('move-up');
  });

  elements.down.addEventListener('click', () => {
    const target = Math.max(currentPosition - (MOVE_STEPS / MAX_STEPS * 100), 0);
    setTargetPosition(target);
    socket.emit('move-down');
  });

  elements.downEnd.addEventListener('click', () => {
    setTargetPosition(0);
    socket.emit('move-down-end');
  });

  elements.stop.addEventListener('click', () => {
    hideTargetIndicator();
    socket.emit('stop-blinds');
  });

  elements.resetUp.addEventListener('click', () => {
    socket.emit('reset-up');
  });

  elements.resetDown.addEventListener('click', () => {
    socket.emit('reset-down');
  });

  // Add haptic feedback on button press (if supported)
  const buttons = [
    elements.up, elements.upEnd, elements.down,
    elements.downEnd, elements.stop, elements.resetUp, elements.resetDown
  ];

  buttons.forEach(button => {
    button.addEventListener('touchstart', () => {
      // Trigger haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    });
  });
}

/**
 * Set up schedule event listeners
 */
function setupScheduleListeners() {
  // Toggle schedule panel
  elements.scheduleToggle.addEventListener('click', () => {
    const isExpanded = elements.scheduleToggle.getAttribute('aria-expanded') === 'true';
    elements.scheduleToggle.setAttribute('aria-expanded', !isExpanded);
    elements.schedulePanel.classList.toggle('open');
  });

  // Save schedule
  elements.scheduleSave.addEventListener('click', () => {
    const openTime = elements.scheduleOpen.value;
    const closeTime = elements.scheduleClose.value;

    if (!openTime || !closeTime) {
      showScheduleStatus('Please set both open and close times', 'error');
      return;
    }

    const [openHour, openMinute] = openTime.split(':').map(Number);
    const [closeHour, closeMinute] = closeTime.split(':').map(Number);

    // Validate times
    if (isNaN(openHour) || isNaN(openMinute) || isNaN(closeHour) || isNaN(closeMinute)) {
      showScheduleStatus('Invalid time format', 'error');
      return;
    }

    // Send to server
    socket.emit('update-schedule', {
      open: { hour: openHour, minute: openMinute },
      close: { hour: closeHour, minute: closeMinute }
    });

    showScheduleStatus('Saving...', 'success');
  });
}

/**
 * Set up Socket.IO event listeners
 */
function setupSocketListeners() {
  socket.on('start-pos', (value) => {
    const position = Math.round(value);
    currentPosition = position;
    setProgress(position, ANIMATION_SPEED);
    updateProgressLabel(position);
  });

  socket.on('set-arrows-enabled', (enabled) => {
    setButtonEnabled(elements.up, enabled);
    setButtonEnabled(elements.upEnd, enabled);
    setButtonEnabled(elements.down, enabled);
    setButtonEnabled(elements.downEnd, enabled);

    // Hide target indicator when movement completes
    if (enabled && targetPosition !== null) {
      // Check if we've reached the target
      if (Math.abs(currentPosition - targetPosition) < 1) {
        hideTargetIndicator();
      }
    }
  });

  socket.on('set-stop-enabled', (enabled) => {
    setButtonEnabled(elements.stop, enabled);
  });

  socket.on('set-slider-enabled', (enabled) => {
    // Slider removed - no-op
  });

  socket.on('set-reset-enabled', (enabled) => {
    setButtonEnabled(elements.resetUp, enabled);
    setButtonEnabled(elements.resetDown, enabled);
  });

  socket.on('blinds-position', (data) => {
    const position = Math.round(data.blindsPosition);
    currentPosition = position;
    setProgress(position, data.animate ? ANIMATION_SPEED : 0);
    updateProgressLabel(position);
  });

  // Schedule events
  socket.on('schedule-data', (schedule) => {
    if (schedule && schedule.open && schedule.close) {
      const openTime = `${String(schedule.open.hour).padStart(2, '0')}:${String(schedule.open.minute).padStart(2, '0')}`;
      const closeTime = `${String(schedule.close.hour).padStart(2, '0')}:${String(schedule.close.minute).padStart(2, '0')}`;
      elements.scheduleOpen.value = openTime;
      elements.scheduleClose.value = closeTime;
    }
  });

  socket.on('schedule-updated', (data) => {
    if (data.success) {
      showScheduleStatus('Schedule saved successfully!', 'success');
    } else {
      showScheduleStatus(data.message || 'Failed to save schedule', 'error');
    }
  });
}

/**
 * Set the progress bar height
 * @param {number} percentage - Position percentage (0-100)
 * @param {number} animationSpeed - Animation duration in ms
 */
function setProgress(percentage, animationSpeed) {
  const targetHeight = 100 - percentage;

  if (animationSpeed > 0) {
    // Animate the progress bar
    elements.progressBar.style.transition = `height ${animationSpeed}ms ease-out`;
    elements.progressBar.style.height = `${targetHeight}%`;
  } else {
    // Instant update
    elements.progressBar.style.transition = 'none';
    elements.progressBar.style.height = `${targetHeight}%`;
    // Force reflow to ensure transition is removed
    void elements.progressBar.offsetHeight;
    elements.progressBar.style.transition = 'height 0.3s ease-out';
  }
}

/**
 * Update the progress label text
 * @param {number} percentage - Position percentage (0-100)
 */
function updateProgressLabel(percentage) {
  const rounded = Math.round(percentage);
  elements.progressLabel.textContent = `${rounded}%`;
}

/**
 * Enable or disable a button
 * @param {HTMLElement} button - Button element
 * @param {boolean} enabled - Whether to enable the button
 */
function setButtonEnabled(button, enabled) {
  if (button) {
    button.disabled = !enabled;
  }
}

/**
 * Set and show the target position indicator
 * @param {number} percentage - Target position percentage (0-100)
 */
function setTargetPosition(percentage) {
  targetPosition = percentage;

  // Calculate position with offset to align edges properly
  // At 0%, bottom edge aligns with bottom
  // At 100%, top edge aligns with top (need to offset by bar height)
  const barHeightPx = 8;
  const containerHeightPx = elements.progressContainer.offsetHeight;
  const offsetPx = (percentage / 100) * barHeightPx;

  // First, instantly move the bar to current position
  elements.progressTarget.style.transition = 'none';
  const currentOffsetPx = (currentPosition / 100) * barHeightPx;
  elements.progressTarget.style.bottom = `calc(${currentPosition}% - ${currentOffsetPx}px)`;
  elements.progressTarget.classList.add('visible');

  // Force reflow
  void elements.progressTarget.offsetHeight;

  // Re-enable transition and animate to target
  elements.progressTarget.style.transition = '';
  elements.progressTarget.style.bottom = `calc(${percentage}% - ${offsetPx}px)`;
}

/**
 * Hide the target position indicator
 */
function hideTargetIndicator() {
  targetPosition = null;
  elements.progressTarget.classList.remove('visible');
}

/**
 * Show schedule status message
 * @param {string} message - Status message to display
 * @param {string} type - Status type: 'success' or 'error'
 */
function showScheduleStatus(message, type) {
  elements.scheduleStatus.textContent = message;
  elements.scheduleStatus.className = `schedule-status visible ${type}`;

  // Auto-hide after 3 seconds
  setTimeout(() => {
    elements.scheduleStatus.classList.remove('visible');
  }, 3000);
}

/**
 * Handle connection status
 */
socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
