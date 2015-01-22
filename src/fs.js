
(function (root, factory) {

    if (typeof define === 'function' && define.amd) {
        define(['buffer', 'async', 'exports'], function (buffer, async, exports) {
            return factory(root, exports, async, buffer);
        });
    } else if (typeof exports !== 'undefined') {
        var buffer = require('buffer');
        var async = require('async');
        factory(root, exports, async, buffer);
    } else {
        root.CoFS = factory(root, {}, root.async, root.buffer);
    }

})(this, function (root, CoFS, async, buffer) {
    'use stricts';

    var _CoFS = root.CoFS;
    var Buffer = buffer.Buffer;

    var FileReader = null;
    var requestFileSystem = null;
    var File = null;
    var FileEntry = null;

    var arrayBufferToBuffer = function (arr) {
        var i,x,c, b, d;

        d = new Int8Array(arr);
        b = new Buffer(d);
        c = arr.byteLength;

        if (b.length || !c) {
            d = null;
            return b;
        } else {

            b = new Buffer(c);

            for (i = 0; i < c; i++) {
                x = d[i];
                b.writeUInt8(x, i);
            }

            d = null;
            return b;
        }

    };

    var getDonePromise = function (listener) {

        if (typeof listener !== 'function') {
            throw new Error("Listener not defined");
        }

        return function () {
            var args = Array.prototype.slice.call(arguments);
            listener.apply({}, args);
        };

    };

    CoFS = function () {
        this.initialize.apply(this, arguments);
    };

    CoFS.VERSION = '0.1.0';

    CoFS.noConflict = function () {
        root.CoFS = _CoFS;
        return this;
    };

    CoFS.prototype.initialize = function (options) {
 
        var self = this;

        if (!FileReader) FileReader = window.FileReader  || null;
        if (!requestFileSystem) requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem || null;
        if (!File) File = window.File || null;

        if (!FileReader ||  !requestFileSystem || !File) 
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
            listeners[i].cb.apply(root, args);
            if (listeners[i].once) {
                listeners[i] = null;
            }
        }

        return i;

    };

    CoFS.prototype.getFileSystem = function (options, callback) {
        
        var self = this;

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
        var self = this;

        options = options || {};
        var blockSize = options.blockSize || 4096;
        var start = options.start || 0;
        var end = options.end !== undefined ? options.end : undefined;
   
        if (end <= start) {
            throw new Error("Start byte has been bigger that end  byte");
        }

        var getFile = function (cb) {
            if (file instanceof File || file instanceof Blob) {
                return cb(undefined, file);
            } else {
                self.getFileEntry(file, function (err, fileEntry) {
                    
                    if (err) return cb(err);

                    fileEntry.file(function (file) {
                        return cb(undefined, file);
                    });
                });
            }
        };

        var startStream = function (file, interface) {
        
            var parts = [];

            if (typeof end === 'undefined')
                end = file.size;

            for (var i = start; i < end; i += blockSize) {

                parts.push({
                    start: i, 
                    end: i+blockSize
                });
            }

            async.eachSeries(
                parts,
                function (part, tcb) {

                    var done = getDonePromise(function (err) {
                        tcb(err || undefined);
                    }); 

                    self.readFilePart(
                        file,
                        part.start,
                        part.end,
                        function (err, data) {

                            if (err) {
                                done(err);
                                return;
                            }

                            var cr = interface.partComplete(data, done);

                            if (cr !== done)
                                done();

                        }
                    );

                }, function (err) {
                    if (err) {
                        return interface.error(err);
                    }
                    interface.readComplete();
                }
            );

        };

        var controlInterface = {
            partComplete: function () {},
            readComplete: function () {},
            error: function (e) {
                throw e;
            },
            start: function () {

                var me = this;

                getFile(function (err, file) {
                    if (err) {
                        return me.error(err);
                    }

                    startStream(file, me);

                });
            }
        };

        return controlInterface;

    };

    return CoFS;

});
