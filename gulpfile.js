/**
 * Created by theun on 12-8-2016.
 */
// Require
var gulp = require('gulp');
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');

// Compile SASS
gulp.task('sass', function(){
    return gulp.src('./scss/**/*.scss')
        .pipe(sourcemaps.init())
        .pipe(sass().on('error', sass.logError))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('./css'));
});

gulp.task('watch', function(){
    gulp.run(['sass']);
    gulp.watch('./scss/**/*.scss', ['sass']);
});