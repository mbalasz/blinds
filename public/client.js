const bgBrightColor = {
  r: 255,
  g: 151,
  b: 112,
};
const bgDarkColor = {
  r: 0,
  g: 0,
  b: 0,
};
const bgSteps = 100;

function generateGradient(startColor, endColor, steps) {
  rStep = (endColor.r - startColor.r) / steps;
  gStep = (endColor.g - startColor.g) / steps;
  bStep = (endColor.b - startColor.b) / steps;

  let gradient = [];
  for (i = 0; i <= steps; i++) {
    gradient.push({
      r: startColor.r + i * rStep,
      g: startColor.g + i * gStep,
      b: startColor.b + i * bStep,
    });
  }
  return gradient;
}

let bgGradient = generateGradient(bgDarkColor, bgBrightColor, bgSteps);

function changeBackground(sliderValue, sliderMax) {
  let idx = Math.floor((sliderValue / sliderMax) * bgSteps);
  let bgColor = bgGradient[idx];
  document.body.style.backgroundColor =
    "rgb(" + [bgColor.r, bgColor.g, bgColor.b].join(",") + ")";
}

let socket = io();

$(document).ready(function (e) {
  var range = $(".input-range"),
    value = $(".range-value"),
    currentProgress = $(".progress-bar"),
    progressContainer = $(".progress-container"),
    up = $("#up"),
    down = $("#down"),
    stop = $("#stop"),
    reset = $("#reset");
  const maxProgressValue = progressContainer.height();
  const ANIMATION_SPEED = 300;

  function setProgress(percentage, animationSpeed) {
    currentProgress.animate(
      {
        height: (percentage / 100) * maxProgressValue,
      },
      animationSpeed,
      function () {}
    );
  }

  stop.click(() => {
    socket.emit("stop-blinds");
  });
  up.click(() => {
    socket.emit("move-up");
  });
  down.click(() => {
    socket.emit("move-down");
  });
  reset.click(() => {
    socket.emit("reset");
  });

  range.on("input", function () {
    changeBackground(this.value, this.max);
  });
  range.on("mouseup touchend", function () {
    socket.emit("slider-changed", this.max - this.value);
  });

  up.attr("disabled", true);
  stop.attr("disabled", true);

  socket.on("start-pos", (value) => {
    range.attr("value", value);
    setProgress(value, ANIMATION_SPEED);
    changeBackground(range.attr("max") - range.attr("value"), range.attr("max"));
  });
  socket.on("set-arrows-enabled", (enabled) => {
    up.attr("disabled", !enabled);
    down.attr("disabled", !enabled);
  });
  socket.on("set-stop-enabled", (enabled) => {
    stop.attr("disabled", !enabled);
  });
  socket.on("set-slider-enabled", (enabled) => {
    range.attr("disabled", !enabled);
  });
  socket.on("set-reset-enabled", (enabled) => {
    reset.attr("disabled", !enabled);
  });
  socket.on("blinds-position", (data) => {
    // console.log(position);
    setProgress(data.blindsPosition, data.animate ? ANIMATION_SPEED : 0);
  });
});
