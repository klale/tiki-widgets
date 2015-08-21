var fs = require("fs");
var gulp = require('gulp');
var browserify = require("browserify");
var buffer = require("gulp-buffer");
var replace = require("gulp-replace");
var source = require("vinyl-source-stream");
var babelify = require("babelify");


gulp.task("bundle-amd", function () {

  // Build dist/amd/sticky-elements.js
  browserify('tiki/js/sticky-elements', {
      debug: false,
      standalone: 'StickyElements',
      bundleExternal: false
    })
    .transform(babelify)
    .bundle()
    .on("error", function (err) { console.log(err.message); })
    .pipe(source("sticky-elements.js"))
    .pipe(buffer())
    .pipe(replace(/define\.amd\)\{define\(\[\]/, 'define.amd){define(["jquery","underscore","events"]'))
    .pipe(gulp.dest('./dist/amd'));


  // Build dist/amd/events.js
  browserify('node_modules/events/events', {
      debug: false,
      standalone: 'Events',
      bundleExternal: false
    })
    .bundle()
    .on("error", function (err) { console.log(err.message); })
    .pipe(fs.createWriteStream("./dist/amd/events.js"));

});

