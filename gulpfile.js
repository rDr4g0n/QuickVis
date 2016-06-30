/* jshint node: true */

"use strict";
// TODO - test runner
// TODO - transpiler
// TODO - lint

var gulp = require("gulp"),
    concat = require("gulp-concat"),
    livereload = require("gulp-livereload"),
    sourcemaps = require("gulp-sourcemaps"),
    source = require("vinyl-source-stream"),
    buffer = require("vinyl-buffer"),
    sequence = require("gulp-sequence"),
    serv = require("./serv"),
    exec = require("child_process").exec,
    globule = require("globule"),
    rollup = require("rollup-stream"),
    rollupIncludePaths = require("rollup-plugin-includepaths"),
    fs = require("fs");

var paths = {
    src: "src/",
    build: "build/",
    www: "www/",
    css: "css/",
    lib: "lib/"
};

gulp.task("default", function(callback){
    sequence("build", "injectCSS", "copy", "reload")(callback);
});

gulp.task("build", ["concatJS", "concatCSS"]);

gulp.task("concatJS", function(){
    return rollup({
        entry: paths.src + "app.js",
        sourceMap: true,
        format: "iife",
        plugins: [
            // hacky workaround for make sure rollup
            // knows where to look for deps
            rollupIncludePaths(paths.src)
        ]
    })
    .pipe(source("app.js", paths.src))
    .pipe(buffer())
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(sourcemaps.write("."))
    .pipe(gulp.dest(paths.build));
});

gulp.task("concatCSS", function(){
    return gulp.src(paths.css + "**/*.css")
        .pipe(concat("app.css"))
        .pipe(gulp.dest(paths.build));
});

gulp.task("injectCSS", function(cb){
    fs.readFile(paths.build + "app.css", "utf-8", function(err, data){
        if (err) {
            cb(err);
            return;
        }
        var css = data.replace(/(?:\r\n|\r|\n)/g, "")
            .replace(/"/g, "'")
            .replace(/\t/g, "")
            .replace("    ", "");
        var injectorScript = `
(function injectCSS(){
    let style = document.createElement("style");
    style.innerHTML = "${css}";
    document.body.appendChild(style);
    // force layout/paint
    document.querySelector("body").clientWidth;
})();
        `;
        fs.readFile(paths.build + "app.js", "utf-8", function(err, data){
            if (err) {
                cb(err);
                return;
            }
            let edited = injectorScript + "\n\n" + data;
            fs.writeFile(paths.build + "app.js", edited, "utf-8", function (err) {
                cb(err);
            });
        });
    });
});

gulp.task("copy", function(callback){
    sequence(["copyBuild", "copyIndex", "copyLib"])(callback);
});

gulp.task("copyBuild", function(){
    return gulp.src(paths.build + "**/*")
        .pipe(gulp.dest(paths.www));
});
gulp.task("copyIndex", function(){
    return gulp.src("index.html")
        .pipe(gulp.dest(paths.www));
});
gulp.task("copyLib", function(){
    return gulp.src(paths.lib + "**/*")
        .pipe(gulp.dest(paths.www));
});

gulp.task("reload", function(){
    livereload.reload();
});

gulp.task("watch", ["default"], function(){
    var port = 3006,
        hostname = "localhost";

    livereload.listen();

    gulp.watch(paths.src + "**/*.js", ["default"]);
    gulp.watch(paths.css + "**/*.css", ["default"]);
    gulp.watch("index.html", ["default"]);

    // start webserver
    serv(paths.www, port);

    // open in browser
    // TODO - reuse existing tab
    exec("xdg-open http://"+ hostname +":"+ port, function(err, stdout, stderr){
        if(err){
            console.error("Huh...", stdout, stderr);
        }
    });
});
