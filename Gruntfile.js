module.exports = function(grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('slideshow.jquery.json'),
        uglify: {
            options: {
                banner: [
                '/*!',
                ' * @name        <%= pkg.title %>',
                ' * @author      <%= pkg.author.name %> <<%= pkg.homepage %>>',
                ' * @modified    <%= grunt.template.today("dddd, mmmm dS, yyyy, HH:MM:ss") %>',
                ' * @version     <%= pkg.version %>',
                ' */'].join('\n')
            },
            my_target: {
                files: {
                    'dist/slideshow.js': ['<banner>', 'src/slideshow.js']
                }
            }
        },
        jshint: {
            all: ['Gruntfile.js', 'src/*.js'],
            options: {
                trailing: true,
                browser: true,
                globals: {
                    jQuery: true,
                    define: false,
                    module: true
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');

    grunt.registerTask('default', ['jshint', 'uglify']);

};
