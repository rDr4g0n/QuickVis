/* jshint node: true */

"use strict";
// TODO - es6 transpiler
// TODO - lint
// TODO - minify

var gulp = require("gulp"),
    sequence = require("gulp-sequence"),
    clean = require("gulp-clean");

let {paths, srcSubdirectories} = require("./gulp/config");

// get all them other gulp tasks in here
require("./gulp/test.js");
require("./gulp/injectcss.js");
require("./gulp/demoapp.js");
require("./gulp/buildjs.js");

gulp.task("default", ["dist"]);

// quickvis distributable bundle
gulp.task("dist", function(callback){
    sequence("buildJS", "injectCSS")(callback);
});

gulp.task("clean", function(){
    return gulp.src([
            paths.build + "*",
            paths.www + "*"
        ])
        .pipe(clean());
});

// build the demo page/app
gulp.task("demo", function(callback){
    sequence("dist", "copyDemo", "copyDemoDist")(callback);
});

