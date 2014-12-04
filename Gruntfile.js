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
        uglify: {
            options: {
                banner: '<%= meta.banner  %>', 
                compress: true
            },
            fs: {
                files: {
                    'dist/fs.min.js': ['src/fs.js']
                }
            }
            
        },
        jshint: {
            files: [
                'Gruntfile.js',
                'src/*.js'
            ]
        }    
    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-update-json');

    grunt.registerTask('default', ['jshint','clean','uglify', 'update_json']);
    grunt.registerTask('check', ['jshint']);

};
