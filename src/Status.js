/* jshint esnext: true */
(function(){
    "use strict";

    // from https://github.com/mapbox/simple-linear-scaleA
    // TODO - check license for this function
    function linearScale(domain, range, clamp) {
        return function(value) {
            if (domain[0] === domain[1] || range[0] === range[1]) {
                return range[0];
            }
            let ratio = (range[1] - range[0]) / (domain[1] - domain[0]),
                result = range[0] + ratio * (value - domain[0]);
            return clamp ? Math.min(range[1], Math.max(range[0], result)) : result;
        };
    }

    // http://stackoverflow.com/a/37411738
    function createNode(n, v) {
        n = document.createElementNS("http://www.w3.org/2000/svg", n);
        for (let p in v){
            n.setAttributeNS(null, p.replace(/[A-Z]/g, function(m, p, o, s) { return "-" + m.toLowerCase(); }), v[p]);
        }
        return n;
    }

    function defaultTemplate(vm){
        return `
            <strong>hi</strong>
        `;
    }

    let SYMBOLS = {
        "-8": "y",
        "-7:": "z",
        "-6": "a",
        "-5": "f",
        "-4": "p",
        "-3": "n",
        "-2": "u",
        "-1": "m",
        "0": "",
        "1": "K",
        "2": "M",
        "3": "G",
        "4": "T",
        "5": "P",
        "6": "E",
        "7": "Z",
        "8": "Y"
    };

    // max number of places after the decimal point.
    // actual number may be less than this
    const DEFAULT_MAX_FLOAT_PRECISION = 1;

    function toEng(val, preferredUnit, width=DEFAULT_MAX_FLOAT_PRECISION+1, base=1000) {
        val = Math.abs(val);

        let result,
            unit,
            symbol;

        // if preferredUnit is provided, target that value
        if (preferredUnit !== undefined) {
            unit = preferredUnit;
        } else if (val === 0) {
            unit = 0;
        } else {
            unit = Math.floor(Math.log(Math.abs(val)) / Math.log(base));
        }

        symbol = SYMBOLS[unit];

        // TODO - if Math.abs(unit) > 8, return value in scientific notation
        result = val / Math.pow(base, unit);

        return [shortenNumber(result, width), symbol];
    }

    // attempts to make a long floating point number
    // fit in `length` characters. It will trim the
    // fractional part of the number, but never the
    // whole part of the number
    // NOTE - does not round the number! it just chops it off
    function shortenNumber(num, targetLength) {
        let numStr = num.toString(),
            parts = numStr.split("."),
            whole = parts[0],
            fractional = parts[1] || "";

        // if the number is already short enough
        if (whole.length + fractional.length <= targetLength) {
            return num;
        }

        // if the whole part of the number is
        // too long, return it as is. we tried our best.
        if (whole.length >= targetLength) {
            return +whole;
        }

        return parseFloat(whole + "." + fractional.substring(0, targetLength - whole.length));
    }

    // a quick n purty visualization
    class QuickVis {
        // creates a dom element for the vis to live in
        constructor(){
            this.el = document.createElement("div");
            this.template = defaultTemplate;
        }

        // stores the data then calls render
        // NOTE: el must be attached to the DOM to get
        // predictable results here
        render(data){
            this._update(data);
            // TODO - if not attached to DOM, throw
            this._render();
        }

        // do some work with incoming data
        _update(data){
            this.data = data;
        }

        // private implementation of render. applies
        // vm to template and replaces html inside of
        // vis's dom el
        _render(){
            let htmlStr = this.template(this);
            // NOTE - make sure any event listeners
            // or references to DOM elements have
            // been cleared or this will leak!
            this.el.innerHTML = htmlStr;
        }
    }

    function sparklineTemplate(vm){
        return `
            <div class="metric">${vm.metric}</div>
            <div class="hbox spark-content">
                <svg class="graph"></svg>
                <div class="last">${vm.getFriendly(vm.last)}</div>
                <div class="vbox spark-value">
                    <div class="units">${vm.getMagnitude(vm.last) + vm.unit}</div>
                    <div class="hbox spark-trend ${vm.getDeltaDirectionClass()}">
                        <div class="trend">${vm.getDeltaDirectionArrow()}</div>
                        <div class="delta">${vm.getFriendlyDelta()}</div>
                    </div>
                </div>
                <div class="indicator ${vm.getIndicatorStatus()}"></div>
            </div>
        `;
    }

    const SPARKLINE_PADDING = 4;
    const SPARKLINE_DATA_PADDING = 1;

    class Sparkline extends QuickVis {
        constructor(config){
            super();
            this.el.classList.add("sparkline");
            this.metric = config.metric;
            this.threshold = config.threshold;
            this.template = sparklineTemplate;
            this.unit = config.unit;
            this.style = config.style || "line";
        }

        _update(data){
            this.data = data;
            this.last = data[data.length - 1];
            // TODO - dont use 0 to start average calc
            this.avg = this.data.reduce((acc, val) => acc + val, 0) / (this.data.length - 1);
            this.delta = this.last - this.avg;
        }

        /*******************
         * rendering and drawing functions are the only place
         * that it is ok to touch the dom!
         */
        _render(){
            super._render();
            this.svg = this.el.querySelector(".graph");
            let {width, height} = this.svg.getBoundingClientRect(),
                xRange = [0, this.data.length],
                yRange = [Math.max.apply(Math, this.data) + SPARKLINE_DATA_PADDING,
                    Math.min.apply(Math, this.data) - SPARKLINE_DATA_PADDING];
            this.xScale = linearScale(xRange, [SPARKLINE_PADDING, width-SPARKLINE_PADDING]);
            this.yScale = linearScale(yRange, [SPARKLINE_PADDING, height-SPARKLINE_PADDING]);
            this.drawableArea = {
                x1: this.xScale(xRange[0]),
                y1: this.yScale(yRange[0]),
                x2: this.xScale(xRange[1]),
                y2: this.yScale(yRange[1])
            };
            this.drawableArea.width = this.drawableArea.x2 - this.drawableArea.x1;
            this.drawableArea.height = this.drawableArea.y2 - this.drawableArea.y1;

            switch(this.style){
                case "line":
                    this.fillSparkline()
                        .drawSparkline()
                        .drawThreshold()
                        .drawLastPoint();
                    break;
                case "area":
                    this.drawSparkline()
                        .drawThreshold()
                        .drawLastPoint();
                    break;
                case "bar":
                    this.drawBars()
                        .drawThreshold();
                    break;
                case "scatter":
                    this.drawScatter()
                        .drawThreshold();
                    break;
            }
        }

        fillSparkline(){
            this.drawSparkline(true);
            return this;
        }

        drawSparkline(shaded=false){
            let {svg, xScale, yScale} = this,
                {x1, y1, x2, y2} = this.drawableArea,
                d = [];

            if(shaded){
                d.push(`M${x1},${y2}`);
                d.push(`L${x1},${y1}`);
            } else {
                //d.push(`M${x1},${y2}`);
                d.push(`M${x1},${yScale(this.data[0])}`);
            }
            this.data.forEach((dp, i) => {
                d.push(`L${xScale(i)},${yScale(dp)}`);
            });
            if(shaded){
                d.push(`L${x2},${y2}`);
            }

            svg.appendChild(createNode("path", {
                d: d.join(" "),
                stroke: shaded ? "transparent" : "#555",
                strokeWidth: 1,
                // TODO - configurable fill
                fill: shaded ? "#CCC" : "transparent"
            }));
            return this;
        }

        drawBars(){
            const BAR_PADDING = 1;
            let {svg, xScale, yScale} = this,
                {x2, y2, width} = this.drawableArea,
                barWidth = (width / this.data.length) - BAR_PADDING;

            this.data.forEach((dp, i) => {
                let barDiff = this.yScale(dp),
                    barHeight = Math.ceil(y2 - barDiff) || 1;
                svg.appendChild(createNode("rect", {
                    x: this.xScale(i),
                    y: y2 - barHeight,
                    width: barWidth,
                    height: barHeight,
                    stroke: "transparent",
                    fill: dp > this.threshold ? "red" : "#AAA"
                }));
            });
            return this;
        }

        drawScatter(){
            let {svg, xScale, yScale} = this,
                {x2, y2, width} = this.drawableArea;

            this.data.forEach((dp, i) => {
                svg.appendChild(createNode("circle", {
                    cx: this.xScale(i),
                    cy: this.yScale(dp),
                    r: 4,
                    fill: dp > this.threshold ? "red" : "#AAA"
                }));
            });
            return this;
        }

        drawLastPoint(){
            let {svg, xScale, yScale} = this,
                x = this.data.length - 1,
                y = this.data[this.data.length-1];
            svg.appendChild(createNode("circle", {
                cx: xScale(x),
                cy: yScale(y),
                r: 3,
                fill: this.lastExceedsThreshold() ? "red" : "#555"
            }));
            return this;
        }

        drawThreshold(){
            return this;
            if(this.threshold === undefined){
                return this;
            }

            let {svg, xScale, yScale} = this,
                {x1, y1, x2, y2} = this.drawableArea;
            svg.appendChild(createNode("line", {
                x1: x1,
                y1: yScale(this.threshold),
                x2: x2,
                y2: yScale(this.threshold),
                stroke: "#AAA",
                strokeWidth: 2,
                strokeDasharray: "2,2",
                fill: "transparent"
            }));
            return this;
        }

        /*************
         * vm methods transform model data into something
         * the view can use to make data useful to the user
         */
        getFriendly(val){
            if(Math.abs(val) < 1){
                return shortenNumber(val);
            }
            return toEng(val)[0];
        }

        getMagnitude(val){
            if(Math.abs(val) < 1){
                return "";
            }
            return toEng(val)[1];
        }

        getFriendlyDelta(){
            let delta = this.delta;
            if(Math.abs(delta) < 1){
                return Math.abs(shortenNumber(delta)) + this.unit;
            }
            let [val,magnitude] = toEng(delta);

            return Math.abs(val) + magnitude + this.unit;
        }

        getDeltaDirectionArrow(){
            let delta = this.delta;
            if(Math.abs(delta) < 1){
                delta = shortenNumber(delta);
            }
            return delta > 0 ? "▴" : delta === 0 ? "" : "▾";
        }

        getDeltaDirectionClass(){
            let delta = this.delta;
            if(Math.abs(delta) < 1){
                delta = shortenNumber(delta);
            }
            return delta > 0 ? "up" : delta === 0 ? "" : "down";
        }

        lastExceedsThreshold(){
            return this.last > this.threshold;
        }

        getIndicatorStatus(){
            return this.lastExceedsThreshold() ? "on" : "off";
        }
    }

    function stackedBarTemplate(vm){
        return `
            <div class="hbox stacked-title">
                <div class="name">${vm.name}</div>
                <div class="capacity">${vm.capacity}TB</div>
            </div>
            <div class="bars">
                ${vm.data.map(bar => barTemplate(vm, bar)).join("")}
                <!-- empty bar for free space -->
                ${barTemplate(vm, {name:"free", val: vm.capacity - vm.getTotal()})}
            </div>
        `;
    }

    function barTemplate(vm, bar){
        return `
            <div class="bar" style="flex: ${vm.getRatio(bar.val)} 0 0; background-color: ${vm.getColor(bar)};"
            title="${bar.name +": "+ bar.val}">
                ${bar.name.replace(" ", "&nbsp;")}
            </div>
        `;
    }

    // TODO - better palette
    let colors = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
        "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"];

    class StackedBar extends QuickVis {
        constructor(config){
            super();
            this.el.classList.add("stacked-bar");
            this.name = config.name;
            this.capacity = config.capacity;
            this.template = stackedBarTemplate;
        }

        _render(){
            super._render();
            this.barsEl = this.el.querySelector(".bars");
        }

        getTotal(){
            return this.data.reduce((acc, d) => acc + d.val, 0);
        }

        // returns fraction of capacity that val occupies
        getRatio(val){
            return this.capacity / val;
        }

        getColor(bar){
            // empty bar for free space
            if(bar.name === "free"){
                return "transparent";
            } else {
                // TODO - choose colors
                return colors[this.getIndexOf(bar)];
            }
        }

        getIndexOf(bar){
            return this.data.indexOf(bar);
        }
    }

    if(!window.quickVis){
        window.quickVis = {};
    }
    window.quickVis.QuickVis = QuickVis;
    window.quickVis.Sparkline = Sparkline;
    window.quickVis.StackedBar = StackedBar;
})();
