var gulp = require('gulp'),
    rollup = require('gulp-rollup'),
    sourcemaps = require('gulp-sourcemaps'),
    sass = require('gulp-sass'),
    file = require('gulp-file'),
    bulkSass = require('gulp-sass-bulk-import'),
    concat = require('gulp-concat'),
    browsersync = require('browser-sync').create(),
    manifest = require('./src/manifest.json.env'),
    argv = require('yargs').argv;
    gulpVuejsComponent = require('./build_tools/gulp-vuejs-component/gulp-vuejs-component'),
    gulpVuejsStyle = require('./build_tools/gulp-vuejs-style/gulp-vuejs-style');

// add --env=dev or --env=prod in commandline to choose which manifest to use
let env = argv.env;
if(typeof env !== 'string' || Object.keys(manifest).indexOf(env) === -1) env = manifest.default;

gulp.task('app-js', function(cb){
    gulp.src(['./src/inbox/js/**/*.js', './src/global/js/**/*.js', './src/inbox/vue/**/*.vue', 'src/inbox/vue/**/*.js'])
        .pipe(sourcemaps.init())
        .pipe(gulpVuejsComponent().on('error', (e) => {
            console.error("\x1b[31m\x1b[1m%s \x1b[2m%s\x1b[0m", '[ERROR]', e.plugin);
            console.log(e.loc);
            console.log(e.stack);
        }))
        .pipe(rollup({
            format: 'es',
            entry: 'src/inbox/js/app.js',
            useStrict: false,
            treeshake: false
        }).on('error', (e) => {
            console.error("\x1b[31m\x1b[1m%s \x1b[2m%s\x1b[0m", '[ERROR]', e.plugin);
            console.log(e.loc);
            console.log(e.stack);
        }))
        .pipe(sourcemaps.write('../sourcemaps'))
        .pipe(gulp.dest('./dest/inbox/js'));

    cb();
});

gulp.task('scanner-js', function(cb){
    gulp.src(['./src/scanner/js/**/*.js'])
        .pipe(sourcemaps.init())
        .pipe(sourcemaps.write('../sourcemaps'))
        .pipe(gulp.dest('./dest/scanner/js'));

    cb();
});

gulp.task('background', function(cb){
    gulp.src(['./src/background/js/**/*.js'])
        .pipe(gulp.dest('./dest/background/js'));

    gulp.src(['src/background/background.' + env + '.html'])
        .pipe(concat('background.html'))
        .pipe(gulp.dest('./dest/background'));

    gulp.src(['src/background/background-imports.html'])
        .pipe(gulp.dest('./dest/background'));

    cb();
});

gulp.task('app-styles', function(cb){
    gulp.src(['src/inbox/scss/main.scss', 'src/inbox/vue/**/*.vue'])
        .pipe(sourcemaps.init())
        .pipe(gulpVuejsStyle())
        .pipe(concat({ path: 'src/inbox/scss/app.scss' }))    // I need to include the path here so that the sass pipe knows where to find imports
        .pipe(bulkSass())
        .pipe(sass().on('error', sass.logError))
        .pipe(concat('app.css'))                        // I need to run concat again so that my file doesn't end up in dest/css/src/scss
        .pipe(sourcemaps.write('../sourcemaps'))
        .pipe(gulp.dest('dest/inbox/css').on('error', sass.logError));

    cb();
});

gulp.task('scanner-styles', function(cb){
    gulp.src(['src/scanner/scss/scanner.scss'])
        .pipe(sourcemaps.init())
        .pipe(bulkSass())
        .pipe(sass().on('error', sass.logError))
        .pipe(sourcemaps.write('../sourcemaps'))
        .pipe(gulp.dest('dest/scanner/css').on('error', sass.logError));

    cb();
});

gulp.task('copy:html', function(cb){
    if(env === 'test') {
        gulp.src(['src/inbox/index.html'])
            .pipe(gulp.dest('dest/inbox'));
    }

    cb();
});

gulp.task('copy:globaljs', function(cb){
    gulp.src(['src/global/**/*']).pipe(gulp.dest('dest/global/'));
    cb();
});

gulp.task('copy:reddit_files', function(cb){
    gulp.src(['src/inbox/reddit_files/**/*']).pipe(gulp.dest('dest/inbox/reddit_files'));
    cb();
});

gulp.task('copy:assets', function(cb){
    gulp.src(['src/icons/**/*']).pipe(gulp.dest('dest/icons'));
    gulp.src(['src/inbox/img/**/*']).pipe(gulp.dest('dest/inbox/img'));
    cb();
});

gulp.task('manifest', function(cb){
    file('manifest.json', manifest[env], { src: true })
        .pipe(gulp.dest('dest'));

    cb();
});

gulp.task('watch', function(cb) {
    gulp.watch(['./src/inbox/js/**/*.js', './src/global/js/**/*.js', './src/inbox/vue/View.js'], ['app-js']);
    gulp.watch(['./src/scanner/js/**/*.js'], ['scanner-js']);
    gulp.watch(['./src/background/js/**/*.js', './src/background/*.html'], ['background']);
    gulp.watch(['./src/inbox/scss/**/*.scss', './src/inbox/vue/**/*.vue'], ['app-js', 'app-styles']);
    gulp.watch(['./src/scanner/scss/**/*.js'], ['scanner-styles']);
    gulp.watch(['./src/inbox/*.html'], ['copy:html']);
    gulp.watch(['./src/global/**/*'], ['copy:globaljs']);
    gulp.watch(['./src/inbox/reddit_files/**/*'], ['copy:reddit_files']);
    gulp.watch(['./src/inbox/img/**/*'], ['copy:assets']);
    gulp.watch(['./src/manifest.json'], ['manifest']);

    cb();
});

gulp.task('copy', ['copy:html', 'copy:globaljs', 'copy:reddit_files', 'copy:assets']);

gulp.task('build', ['app-js', 'scanner-js', 'background', 'app-styles', 'scanner-styles', 'copy', 'manifest']);

gulp.task('host', ['build', 'watch'], function(cb) {
    browsersync.init({
        server: {
            baseDir: './dest'
        }
    });

    gulp.watch(['./dest/**/*']).on('change', browsersync.reload);
});

gulp.task('dev', ['build', 'watch']);

gulp.task('default', ['dev']);