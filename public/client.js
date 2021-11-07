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
console.log(bgGradient);

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
        up = $("#up"),
        down = $("#down"),
        stop = $("#stop");

    range.on("input", function () {
        changeBackground(this.value, this.max);
    });
    range.on("mouseup", function () {
        // socket.emit("slider-changed", this.value);
    });

    up.attr("disabled", true);
    stop.attr("disabled", true);

    socket.on("current-pos", (value) => {
        range.attr("value", value);
        changeBackground(range.attr("value"), range.attr("max"));
    });
    socket.on("set-controls-enabled", (enabled) => {});
});