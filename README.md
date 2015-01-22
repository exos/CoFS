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
* **Async.js**: https://github.com/caolan/async

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


# API

## CoFS (Object)

### new CoFS([options]);

CoFS object is a Class, options parameter is optional:

```Javascript
var fs = new CoFS();
```

**Options can be:**

* **fs**: Type of FileSystem request, by Default is *PERSISTENT* (see [this page](https://developer.mozilla.org/en-US/docs/WebGuide/API/File_System/Introduction#The_File_System_API_can_use_different_storage_types)) 
* **logger**: Callback for debug logger

### CoFS.noConflict()

Returns CoFS object and restore the var CoFS to back definition.

## ~CoFS (Instance)

### ~CoFs.on(eventName, callback)

Subcribe callback to event.

### ~CoFS.once(eventname, callback)

Like *on*, but the callback only runs once time.

### ~CoFS.getFileSystem([options], callback)

Get a *FileSystem* instance.

**Options can be:**

* **fs**: Type of filesystem, by default is *PERSISTENT*

### ~CoFS.getDirectory(dirName, [options], callback)

Get *[DirectoryEntry](https://developer.mozilla.org/en-US/docs/Web/API/DirectoryEntry)*, the options are passed to the
natie API, see [this article](https://developer.mozilla.org/en-US/docs/Web/API/DirectoryEntry#getDirectory).

### ~CoFS.getFileEntry(fileName, [options], callback)

Get a *[FileEntry](https://developer.mozilla.org/en-US/docs/Web/API/FileEntry)* instance, from a path

The options are pass to the native API, but accept a **root** param for define a directory, for example:

```JavaScript
var fs = new CoFS();

fs.getDirectory('data', function (err, directory) {

    // ...

    fs.getFileEntry('myFile.dat', { root: directory }, function (err, file) {
        //...
    });
});

```

### ~CoFS.readFromFileObject(file, callback)

Read a file from a native *[File](https://developer.mozilla.org/en-US/docs/Web/API/File)* instance.

### ~CoFS.readFromFileEntry(fileEntry, callback)

Read a file from a native *FileEntry* object.

### ~CoFS.readFile(file, callback)

Identify the object passed and read a file, the first param cab be a File object, FileEntry object, or a String with the file path.

### ~CoFS.writeFile(fileName, data, [encoding], callback)

Write a file with the content of data, if data is a *Buffer* object, encoding is not expected, is data is a String, encoding is needed.

# Development environment

You needs:

* [Node.js](http://nodejs.org/) for tools
* [Grunt](http://gruntjs.com/) for tasks
* [Bower](http://bower.io/) for install dependencies

## First clone the repo (this or your fork)

    $ git clone https://github.com/exos/CoFS.git

## Install the cli-tools:

    $ sudo npm install -g bower grunt-cli 

## Install dependencies

    $ npm install
    $ bower install

## Check if you can build, etc:

    $ grunt

## Grunt tasks

* **check**: Check the code with [JSHint](http://jshint.com/)
* **build**: Build the dist CoFS.js file minified and ready to use 

# Contrib

You can contrib with:

* Use and testing it
* Reporting errors, ideas on [Issues section](https://github.com/exos/cofs/issues)
* Add or fixing code, fork this repo and send Pull Requests :)
* Fix documentation
* Donate :P BTC [14NvJxpQsxs4EK8MTq2rubTDwuy54uCesu](bitcoin:14NvJxpQsxs4EK8MTq2rubTDwuy54uCesu?label=CoFS%20dontaions&message=Donations%20for%20CoFS%20library.%20By%20Exos%20%3Coscar%40gentisoft.com%3E)

