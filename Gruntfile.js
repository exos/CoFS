/*global module:false*/
module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        meta: {
            banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
                       '<%= grunt.template.today("yyyy-mm-dd") %>' + '\n' +
                       '<%= pkg.homepage ? "* " + pkg.homepage : "" %>' + '\n' +
                       ' * Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author %>;' + '\n' +
                       ' * License: (<%= pkg.license %>)' + '\n' +
                       ' */\n\n'
        },
        update_json: {
            bower: {
                src: 'package.json',
                dest: 'bower.json',
                fields: [
                    'name',
                    'version',
                    'authors',
                    'description',
                    'keywords',
                    'license'
                ]
            }
        },
        clean: {
            build: ['dist/*']
        },
        jshint: {
            options: {
                reporter: require('jshint-stylish'), 
                curly: false,
                eqeqeq: true,
                immed: true,
                latedef: true,
                newcap: true,
                noarg: true,
                sub: true,
                undef: true,
                boss: true,
                devel: true,
                eqnull: true,
                browser: true,
                globals: {
                  define: true,
                  require: true,
                  exports: true
                }
            },
            files: [
                'Gruntfile.js',
                'src/*.js'
            ]
        },    
        requirejs: {
            compile: {
                options: {
                    paths: {
                        cofs: 'src',
                        buffer: 'bower_components/buffer/buffer',
                        async: 'bower_components/async/lib/async',
                        underscore: 'bower_components/underscore/underscore'
                    },
                    name: 'cofs/fs',
                    out: "dist/<%= pkg.name %>.js",
                    optimize: 'none',
                    //optimize: "uglify",
                    wrap: true
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-update-json');
    grunt.loadNpmTasks('grunt-contrib-requirejs');

    grunt.registerTask('build', ['clean', 'update_json', 'requirejs']);
    grunt.registerTask('check', ['jshint']);
    grunt.registerTask('default', ['jshint', 'update_json', 'build']);

};
