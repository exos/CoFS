# CoFS

Manage the HTML 5 File API *like a Sir*.

    Atention: this is a alpha package.

## Ventages

* Callbacks like Node.js *(err, result)*
* Use Buffer *(No encoding problem, binaries easy)*
* AMD *(CommonJS, RequireJS, etc)*
* Works with Cordova/Phonegap

## Dependencies

* **Buffer**: http://github.com/anodynos/node2web_buffer

## Instalation

    $ bower install cofs

## Usage

```JavaScript
var fs = new CoFS();

fs.readFile($('input[type="file"]').files[0], function (err, data) {

    if (err) {
        // Display, ignore, kills, love, etc
    }

    console.log("Data of file:" + data.toString('utf-8'));

});

```
