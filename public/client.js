// Initialize Socket.IO connection
const socket = io();

// DOM elements (loaded after DOM is ready)
let elements = {};

// Animation configuration
const ANIMATION_SPEED = 300;

/**
 * Initialize the application
 */
function init() {
  // Get all DOM elements
  elements = {
    progressBar: document.getElementById('progress-bar'),
    progressLabel: document.getElementById('progress-label'),
    progressContainer: document.querySelector('.progress-container'),
    up: document.getElementById('up'),
    upEnd: document.getElementById('up-end'),
    down: document.getElementById('down'),
    downEnd: document.getElementById('down-end'),
    stop: document.getElementById('stop'),
    resetUp: document.getElementById('reset-up'),
    resetDown: document.getElementById('reset-down'),
  };

  // Set up event listeners
  setupEventListeners();

  // Set up socket listeners
  setupSocketListeners();

  // Initial state
  setButtonEnabled(elements.up, false);
  setButtonEnabled(elements.down, false);
  setButtonEnabled(elements.stop, false);
}

/**
 * Set up DOM event listeners
 */
function setupEventListeners() {
  // Button click events
  elements.upEnd.addEventListener('click', () => socket.emit('move-up-end'));
  elements.up.addEventListener('click', () => socket.emit('move-up'));
  elements.down.addEventListener('click', () => socket.emit('move-down'));
  elements.downEnd.addEventListener('click', () => socket.emit('move-down-end'));
  elements.stop.addEventListener('click', () => socket.emit('stop-blinds'));
  elements.resetUp.addEventListener('click', () => socket.emit('reset-up'));
  elements.resetDown.addEventListener('click', () => socket.emit('reset-down'));

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
 * Set up Socket.IO event listeners
 */
function setupSocketListeners() {
  socket.on('start-pos', (value) => {
    const position = Math.round(value);
    setProgress(position, ANIMATION_SPEED);
    updateProgressLabel(position);
  });

  socket.on('set-arrows-enabled', (enabled) => {
    setButtonEnabled(elements.up, enabled);
    setButtonEnabled(elements.upEnd, enabled);
    setButtonEnabled(elements.down, enabled);
    setButtonEnabled(elements.downEnd, enabled);
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
    setProgress(position, data.animate ? ANIMATION_SPEED : 0);
    updateProgressLabel(position);
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
