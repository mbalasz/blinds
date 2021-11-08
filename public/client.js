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

let bgGradient = generateGradient(bgBrightColor, bgDarkColor, bgSteps);

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
        stop = $("#stop");
    const maxProgressValue = progressContainer.height();

    function setProgress(percentage, animate) {
        currentProgress.animate(
            {
                height: (percentage / 100) * maxProgressValue,
            },
            animate,
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

    range.on("input", function () {
        changeBackground(this.value, this.max);
    });
    range.on("mouseup", function () {
        socket.emit("slider-changed", this.value);
    });

    up.attr("disabled", true);
    stop.attr("disabled", true);

    socket.on("start-pos", (value) => {
        range.attr("value", value);
        setProgress(value, 300);
        changeBackground(range.attr("value"), range.attr("max"));
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
    socket.on("blinds-position", (position) => {
        // console.log(position);
        setProgress(position, 0);
    });
});
