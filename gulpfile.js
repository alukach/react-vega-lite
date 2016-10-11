'use strict';

var _             = require('lodash');
var del           = require('del');
var browserSync   = require('browser-sync');
var gulp          = require('gulp');
var $             = require('gulp-load-plugins')();
var Server        = require('karma').Server;
var webpack       = require('webpack');
var webpackStream = require('webpack-stream');
var argv          = require('yargs').argv;
var runSequence   = require('run-sequence');
var webpackConfig = require('./webpack.config.js')();

// -------------------------------------------
// Configuration
// -------------------------------------------

var paths = {
  src      : __dirname + '/src',
  dist     : __dirname + '/dist',
  examples : __dirname + '/examples',
  bower    : __dirname + '/examples/bower_components'
};

var patterns = {
  js          : paths.src + '/**/*.js'
};

gulp.task('clean', function () {
  return del([
    paths.dist + '/**/*',
    paths.examples + '/dist/**/*'
  ]);
});

gulp.task('webpack', function() {
  if(argv.production){
    webpackConfig.plugins.push(
      new webpack.DefinePlugin({
        'process.env': {
          NODE_ENV: JSON.stringify('production')
        }
      })
    );
  }
  return gulp.src(paths.src + '/index.js')
    .pipe(webpackStream(_.extend(webpackConfig, {
      output: {
        filename: 'react-vega-lite.js',
        sourceMapFilename: '[file].map',
        library: 'ReactVegaLite',
        libraryTarget: 'umd',
        umdNamedDefine: false
      },
      externals: {
        'vega': {
          root: 'vg',
          commonjs2: 'vega',
          commonjs: 'vega',
          amd: 'vega'
        },
        'vega-lite': {
          root: 'vl',
          commonjs2: 'vega-lite',
          commonjs: 'vega-lite',
          amd: 'vega-lite'
        },
        'react': {
          root: 'React',
          commonjs2: 'react',
          commonjs: 'react',
          amd: 'react'
        },
        'react-vega': {
          root: 'ReactVega',
          commonjs2: 'react-vega',
          commonjs: 'react-vega',
          amd: 'react-vega'
        }
      },
      devtool: argv.debug ? 'eval' : undefined
    })))
    .pipe(gulp.dest(paths.dist))
    .pipe(gulp.dest(paths.examples+'/dist'))
    .pipe($.uglify({
      report: 'min',
      mangle: true,
      compress: true, //true,
      preserveComments: false
    }))
    .pipe($.rename({
      suffix: '.min'
    }))
    .pipe(gulp.dest(paths.dist))
    .pipe(gulp.dest(paths.examples+'/dist'));
});

/* Run test once and exit */
gulp.task('test', function (done) {
  new Server({
    configFile: __dirname + '/karma.conf.js',
    singleRun: true
  }, done).start();
});

/* Watch for file changes and re-run tests on each change */
gulp.task('tdd', function (done) {
  new Server({
    configFile: __dirname + '/karma.conf.js'
  }, done).start();
});

/* Start browser-sync */
gulp.task('browser-sync', ['build'], function() {
  browserSync.init({
    server: './examples',
    files: ['examples/**/*.*'],
    browser: 'google chrome',
    port: 7000,
  });
});

var buildTasks = [];

/* Build everything */
gulp.task('build', function(done){
  runSequence('clean', buildTasks.concat(['webpack']), done);
});

/* Watch for individual file changes and build as needed */
gulp.task('watch', ['build'], function(){
  buildTasks.forEach(function(task){
    gulp.watch(patterns[task], [task]);
  });

  gulp.watch(patterns.js, ['webpack']);
});

gulp.task('run', ['watch', 'browser-sync']);
gulp.task('default', ['run']);

/* Deployment */
gulp.task('gh-pages', ['build'], function() {
  return gulp.src(paths.examples + '/**/*')
    .pipe($.ghPages());
});