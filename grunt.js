module.exports = function(grunt) {

  grunt.initConfig({
    min: {
      dist: {
        src: ['js/slideshow.js'],
        dest: 'js/slideshow.min.js'
      }
    },
    lint: {
      files: ['grunt.js', 'js/slideshow.js']
    },
    jshint: {
      options: {
        trailing: true,
        browser: true
      },
      globals: {
        jQuery: true
      }
    }
  });

  grunt.registerTask('default', 'lint min');

};