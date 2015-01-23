
requirejs.config({
    baseUrl: '../',
    paths: {
        cofs: 'src',
        buffer: 'bower_components/buffer/buffer',
        async: 'bower_components/async/lib/async',
        eventemitter2: 'bower_components/eventemitter2/lib/eventemitter2'
    }
});

require(['cofs/fs'], function (CoFS) {

    var $file = document.getElementById('ifile');
    var $cmdRead = document.getElementById('cmd-read');
    var $cmdSave = document.getElementById('cmd-save');
    var $filename = document.getElementById('filename');
    var $txt = document.getElementById('text');

    var fs = new CoFS();

    $cmdRead.onclick = function (ev) {
        var files = $file.files;

        if (!files || !files.length) {
            return alert("No file selected");
        }

        fs.readFile(files[0], function (err, data) {
            if (err) {
                return alert ("Error! " + err.toString());
            }

            $txt.value = data.toString('utf-8');

        });

    };

    $cmdSave.onclick = function (ev) {

        var fsWriteable = new CoFS({
            fs: window.TEMPORARY     
        });
        
        fsWriteable.writeFile($filename.value, $txt.value, 'utf-8', function (err) {
            if (err) {
                return alert("Error! " + err.toString());     
            }
        });

    };

});
