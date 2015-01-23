define([
    'async',
    'buffer',
    './array2buffer',
    './promise',
    './readstream'
], function (async, buffer, arrayBufferToBuffer, getDonePromise, ReadStream) {
    'use stricts';

    var Buffer = buffer.Buffer;

    var FileReader = null;
    var requestFileSystem = null;
    var File = null;

    var CoFS = function () {
        this.initialize.apply(this, arguments);
    };

    CoFS.VERSION = '0.4.3';

    CoFS.prototype.initialize = function (options) {
 
        var self = this;

        if (!FileReader) FileReader = window.FileReader  || null;
        if (!requestFileSystem) requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem || null;
        if (!File) File = window.File || null;

        if (!FileReader || !File) 
            throw new Error("Objects of file API does not exists!");

        this._eventsListeners = {}; 
        this._fs = null;

        options = options || {};

        this._options = options;

    };

    CoFS.prototype._log = function () {
        if (this._options.logger) {
            this._options.logger.apply({}, arguments);
        }
    };

    CoFS.prototype._error = function (err) {

        if (typeof err !== 'object')
            err = new Error(err);

        this._log("CoFS Error" + err.message);

        if (!this.emit('error', err))
            throw err; // Throw error if not is listened

        return err;

    };

    CoFS.prototype.on = function (eventName, callback, once) {

        if (typeof this._eventsListeners[eventName] === 'undefined')
            this._eventsListeners[eventName] = [];

        this._eventsListeners[eventName].push({
            cb: callback,
            once: once || false 
        });

    };

    CoFS.prototype.once = function (eventName, callback) {
        return this.on(eventName, callback, true); 
    };

    CoFS.prototype.emit = function () {
        if (!arguments.length) return false;

        var args = Array.prototype.slice.call(arguments, 0);
        var eventName = args.shift();
        var listeners = this._eventsListeners[eventName] || [];
        var i;

        this._log("emiting " + eventName);

        for (i=0; i<args.length;i++) {
            if (!listeners[i]) continue;
            listeners[i].cb.apply(this, args);
            if (listeners[i].once) {
                listeners[i] = null;
            }
        }

        return i;

    };

    CoFS.prototype.getFileSystem = function (options, callback) {
        
        var self = this;

        if (!requestFileSystem) {
            return callback(new Error("The browser has not requestFileSystem"));
        }

        if (typeof options === 'function') {
            callback = options;
            options = {};
        }
        
        this._log("Open FileSystem", options);

        //if (this._fs && !options.force) return callback(null, this._fs);

        requestFileSystem(
                window[options.fs || 'PERSISTENT'],
                0,
                function (fs) {
                    self._fs = fs;
                    callback(null, fs);
                },
                function (err) {
                    self._log("Error getting FileSystem", err);
                    self._error(err); 
                }
        );

    };
    
    CoFS.prototype.getDirectory = function (dirName, options, cb) {
        var self = this;

        if (typeof options === 'function') {
            cb = options;
            options = undefined;
        }

        var op = false;
        options = options || {};

        this.getFileSystem(function (err, fs) {
            fs.root.getDirectory(
                dirName,
                options,
                function (dirEntry) {
                    if (op) return;
                    op = true;
                    return cb(undefined, dirEntry);
                },
                function (err) {
                    if (op) return;
                    op = true;
                    self._log("Error getting directory entry", err);
                    self._error(err);
                    return cb(err);
                }
            ); 
        });

    };

    CoFS.prototype.getFileEntry = function (fileName, options, callback) {

        if (typeof options === 'function') {
            callback = options;
            options = {};
        }

        var root = options.root || undefined;

        this._log ("Getting FileEntry for", fileName, options);

        if (typeof fileName === 'object') return callback(null,fileName);

        var self = this;

        this.getFileSystem (function (err, fs) {

            if (err) return callback(err);

            if (typeof root === 'undefined')
                root = fs.root;

            root.getFile(
                fileName,
                options,
                function(fileEntry) {
                    self.emit('fileentry:' + fileName, fileEntry);
                    callback(null, fileEntry);
                },
                function (err) {
                    self._log("Error getting FileEntry", err);
                    callback(err);
                }
            );
        });

    };

    CoFS.prototype.readFromFileObject = function (file, callback) {
        var self = this;

        this._log("Creating filereader object", file);
        var reader = new FileReader();

        reader.onloadend = function (evt) {
            self._log("load end call! with large (relative): ", this.result.length );

            if (!this.result) return null;

            var Buf  = arrayBufferToBuffer(this.result);

            callback(null, Buf);
        };

        reader.onerror = function (ev) {
            self._log("Error Reading file", ev);
            callback(new Error('Reading file'));
        };

        reader.onabort = function (ev) {
            self._log("Reading file Abort!!");
            callback(new Error('Reading abort')); 
        };

        reader.readAsArrayBuffer(file);

    };

    CoFS.prototype.readFromFileEntry = function (fileEntry, callback) {
        var self = this;

        fileEntry.file(function (file) {
            self.readFromFileObject(file, callback);
        });

    };

    CoFS.prototype.readFile = function (fileName, callback) {
        var self = this;

        if (fileName instanceof File || fileName instanceof Blob) {
            return this.readFromFileObject(fileName, callback);
        } else {
            this.getFileEntry(fileName, function (err, fileEntry) {
                if (err)
                    return callback(err);

                self.readFromFileEntry(fileEntry, callback);

            });
        }

    };

    CoFS.prototype.writeFile = function (fileName, data, encoding, callback) {
    
        var self = this;

        if (Buffer.isBuffer(data)) {
            callback = encoding;
            encoding = undefined;
        } else {
            data = new Buffer(data, encoding);
        }

        this.getFileSystem(function (err, fs) {

            if (err) return callback(err);

            var op = {
                create: true,
                exclusive: true
            };

            self.getFileEntry(fileName, op, function (err, fileEntry) {

                if (err)
                    return callback(
                        new Error("Error getting file access " + err.message));

                fileEntry.createWriter(function(fileWriter) {
               
                    fileWriter.onwriteend = function () {
                        callback(null);
                    };

                    fileWriter.onerror = function(e) {
                        callback(new Error(e.toString()));
                    };

                    var blob = new Blob(
                        [data],
                        {
                            type: 'application/octet-stream'
                        }
                    );

                    fileWriter.write(blob);

                }, function () {
                    callback(new Error('Error writing ' + fileName));
                }); 
            });

        });

    };

    CoFS.prototype.readFilePart = function (file, start, end, cb) {

        // For compatibility
        if (typeof file.slice !== 'function') {
            if (file.mozSlice === 'function') {
                file.slice = file.mozSlice;
            } else if (file.webkitSlice === 'function') {
                file.slice = file.webkitSlice;
            } else {
                var err = this._error("File has not slice method");
                return cb(err); 
            }
        }

        return this.readFromFileObject(file.slice(start, end), cb);

    };

    CoFS.prototype.createReadStream = function (file, options) {
        var readStream = new ReadStream(this, file, options);
        return readStream;
    };

    return CoFS;

});
