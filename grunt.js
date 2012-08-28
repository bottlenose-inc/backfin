module.exports = function(grunt) {
  
  // Project configuration.
  grunt.initConfig({
    clean: ['dist'],
    lint: {
      all: ['grunt.js', 'src/*.js']
    },
    jshint: {
      options: {
        browser: true
      }
    },
    server: {
      port: 8888,
      base: '.'
    },
    qunit: {
      index: ['http://localhost:8000/test/index.html']
    },
    concat: {
      dist: {
        src: ['src/**'],
        dest: 'dist/backfin.js'
      }
    }
  });
  
  // Load tasks from "grunt-sample" grunt plugin installed via Npm.
  grunt.loadNpmTasks('grunt-contrib');
  grunt.loadNpmTasks('grunt-requirejs');
  
  // Build task
  grunt.registerTask('build', 'clean concat');
  
  // Custom tasks
  grunt.registerTask('wait', 'Wait forever.', function() {
    grunt.log.write('Waiting...');
    this.async();
  });
  
  // Default task.
  grunt.registerTask('default', 'build');
  
  grunt.registerTask('server:run', 'server wait');

};