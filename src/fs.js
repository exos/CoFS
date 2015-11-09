/** module CoFS **/

define([
    'async',
    'buffer',
    './array2buffer',
    './promise',
    './readstream',
    './writestream'
], function (async, buffer, arrayBufferToBuffer, getDonePromise, ReadStream,
                                                                WriteStream) {
    'use strict';

    var Buffer = buffer.Buffer;

    var FileReader = null;
    var requestFileSystem = null;
    var File = null;

    var resolveOut = function (data, encode) {
        if (!encode || encode === 'buffer') {
            return data;
        } else {
            return data.toString(encode);
        }
    };

    /**
     * CoFS
     * @class CoFS
     * @classdesc Manage the HTML 5 File API like a Sir.
     * @param {object} [options]    - Options
     * @param {string} [options.fs]    - FileSystem type, by default PERSISTENT
     * @param {int} [options.quota]     - Quota, by default 0
     * @param {DirectoryEntry} [options.root]   - Directory root (by default use
     *                                            the browser default)
     */

    var CoFS = function (options) {
        if (!FileReader) FileReader = window.FileReader  || null;
        if (!requestFileSystem) requestFileSystem = window.requestFileSystem ||
                                        window.webkitRequestFileSystem || null;
        if (!File) File = window.File || null;

        if (!FileReader || !File) 
            throw new Error("Objects of file API does not exists!");

        this._eventsListeners = {}; 
        this._fs = null;

        options = options || {};

        this._options = options;

    };

    CoFS.VERSION = '0.5.5';

    /**
     * Log
     * @method
     * @private
     */

    CoFS.prototype._log = function () {
        if (this._options.logger) {
            this._options.logger.apply({}, arguments);
        }
    };

    /**
     * Emit error, if not there are listeners, throw it 
     * @method
     * @private
     */

    CoFS.prototype._error = function (err) {

        if (typeof err !== 'object')
            err = new Error(err);

        this._log("CoFS Error" + err.message);

        if (!this.emit('error', err))
            throw err; // Throw error if not is listened

        return err;

    };

    /**
     * Subscribe event 
     * @method
     * @param {string} eventName            - Event name
     * @param {function} callback           - Callback function
     * @param {boolean} [once]              - Execute callback once time
     */

    CoFS.prototype.on = function (eventName, callback, once) {

        if (typeof this._eventsListeners[eventName] === 'undefined')
            this._eventsListeners[eventName] = [];

        this._eventsListeners[eventName].push({
            cb: callback,
            once: once || false 
        });

    };

    /**
     * Subscribe event once time
     * @method
     * @param {string} eventName            - Event name
     * @param {function} callback           - Callback function
     */

    CoFS.prototype.once = function (eventName, callback) {
        return this.on(eventName, callback, true); 
    };

    /**
     * Emit event 
     * @param {string} eventName            - Event to emit 
     * @param {mixed} [...*args]            - Arguments
     */

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

    /**
     * Get FileSystem 
     * @param {object} [options]            - Options 
     * @param {function} callback           - Callback 
     */

    CoFS.prototype.getFileSystem = function (options, callback) {
        
        var self = this;

        if (!requestFileSystem) {
            return callback(new Error("The browser has not requestFileSystem"));
        }

        if (typeof options === 'function') {
            callback = options;
            options = undefined;
        }
        
        options = options || {};

        this._log("Open FileSystem", options);

        if (this._fs && !options.force) {
            return callback(null, this._fs);
        }

        var fsType = options.fs || this._options.fs || 'PERSISTENT';
        var quota = options.quota || this._options.quota || 0;

        requestFileSystem(
            window[fsType],
            quota,
            function (fs) {
                self._fs = fs;
                callback(null, fs);
            },
            function (err) {
                self._log("Error getting FileSystem", err);
                self._error(err);
                callback(err); 
            }
        );

    };
   
    /**
     * Get directory 
     * @param {string} dirName      - Directory name
     * @param {object} [options]    - Options
     * @param {DirectoryEntry} [options.root]    - Root directory
     * @param {function} cb         - Callback
     */

    CoFS.prototype.getDirectory = function (dirName, options, cb) {
        var self = this;

        if (typeof options === 'function') {
            cb = options;
            options = undefined;
        }

        var op = false;
        options = options || {};

        this.getFileSystem(function (err, fs) {
            var root;

            if (options.root) {
                root = options.root;
            } else if (self._options.root) {
                root = self._options.root; 
            } else {
                root = fs.root;
            }

            root.getDirectory(
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

    /**
     * Get FileEntry object from path 
     * @param {string} filename             - File path 
     * @param {object} [options]            - Options 
     * @param {DirectoryEntry} [options.root]  - Root directory
     * @param {function} callback           - Callback
     */

    CoFS.prototype.getFileEntry = function (fileName, options, callback) {
        var self = this;

        if (typeof options === 'function') {
            callback = options;
            options = undefined;
        }

        options = options || {};

        this._log ("Getting FileEntry for", fileName, options);

        if (typeof fileName === 'object') {
            return callback(null,fileName);
        }

        this.getFileSystem (function (err, fs) {
            var root;
            
            if (err) {
                return callback(err);
            }

            root = options.root || self._options.root || fs.root;

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

    /**
     * Read from File Object 
     * @param {File} file                   - File object 
     * @param {object} [options]            - Options
     * @param {string} [options.outEncode]  - Output encode, by default buffer
     * @param {function} callback           - Callback
     * @return {FileReader}                 - FileReader used to read file
     */
    CoFS.prototype.readFromFileObject = function (file, options, callback) {
        var self = this;

        if (typeof options === 'function') {
            callback = options;
            options = undefined;
        }

        this._log("Creating filereader object", file);
        var reader = new FileReader();
        options = options || {};

        reader.onloadend = function () {
            self._log("load end call! with large (relative): ",
                                                        this.result.length );

            if (!this.result) return null;

            var Buf  = arrayBufferToBuffer(this.result);

            callback(null, resolveOut(Buf, options.outEncode));

        };

        reader.onerror = function (ev) {
            self._log("Error Reading file", ev);
            callback(new Error('Reading file'));
        };

        reader.onabort = function () {
            self._log("Reading file Abort!!");
            callback(new Error('Reading abort')); 
        };

        reader.readAsArrayBuffer(file);

        return reader;

    };

    /**
     * Read file from FileEntry object 
     * @param {FileEntry} fileEntry             - FileEntry object 
     * @param {object} [options]                - Options 
     * @param {string} [options.outEncode]      - Output encode, by default
     *                                            is a buffer
     * @param {function} callback               - Callback
     */ 

    CoFS.prototype.readFromFileEntry = function (fileEntry, options, callback) {
        var self = this;

        if (typeof options === 'function') {
            callback = options;
            options = undefined;
        }

        options = options || {};

        fileEntry.file(function (file) {
            self.readFromFileObject(file, options, callback);
        });
    };

    /**
     * Read file, detect if is a File, or FileEntry, or resolve it 
     * @param {string|File|Blob|FileEntry} fileName  - File reference 
     * @param {object} [options]                     - Options 
     * @param {function} callback                    - Callback
     */

    CoFS.prototype.readFile = function (fileName, options, callback) {
        var self = this;

        if (typeof options === 'function') {
            callback = options;
            options = undefined;
        }

        if (fileName instanceof File || fileName instanceof Blob) {
            return this.readFromFileObject(fileName, options, callback);
        } else {
            this.getFileEntry(fileName, options, function (err, fileEntry) {
                if (err)
                    return callback(err);

                self.readFromFileEntry(fileEntry, options, callback);

            });
        }

    };

    /**
     * Write in FileEntry
     * @param {FileEntry} fileEntry         - FileEntry object 
     * @param {string|Buffer} data          - Data to write 
     * @param {object} [options]            - Options 
     * @param {string} [options.encode]     - In case of data has a string, this
     *                                        option is required, and define the
     *                                        encoding of data 
     * @param {function} callback           - Callback, this return the
     * FileEntry of writer file
     */

    CoFS.prototype.writeFileObject = function (fileEntry, data, options,
                                                                     callback) {

        if (typeof options === 'function') {
            callback = options;
            options = undefined;
        }

        if (!Buffer.isBuffer(data)) {
            data = new Buffer(data, options.encode);
        }

        options = options || {};

        fileEntry.createWriter(function(fileWriter) {

            fileWriter.onwriteend = function () {
                callback(null, fileEntry);
            };

            fileWriter.onerror = function(e) {
                callback(new Error(e.toString()));
            };

            var blob = new Blob([data], {
                type: 'application/octet-stream'
            });

            fileWriter.write(blob);

        }, function () {
            callback(new Error('Error writing ' + fileEntry.toURL()));
        }); 

    };

    /**
     * Write file, resolving fileName 
     * @param {string|FileEntry} fileName   - File path or entry 
     * @param {string|Buffer} data          - Data to write 
     * @param {object} [options]            - Options 
     * @param {string} [options.encode]     - In case of data has a string, this
     *                                        option is required, and define the
     *                                        encoding of data
     * @param {DirectoryEntry} [options.root] - Root directory 
     * @param {function} callback           - Callback
     */
    CoFS.prototype.writeFile = function (fileName, data, options, callback) {
        var self = this;

        if (typeof options === 'function') {
            callback = options;
            options = undefined;
        }

        options = options || {};

        options.create = true;
        options.exclusive = true;

        this.getFileEntry(fileName, options, function (err, fileEntry) {

            if (err) {
                return callback(
                    new Error("Error getting file access " + err.message));
            }

            self.writeFileObject(fileEntry, data, options, callback);

        });

    };

    /**
     * Read File object from part 
     * @param {File|Blob} file              - File object 
     * @param {int} start                   - Start byte 
     * @param {int} end                     - End length
     * @param {function} cb                 - Callback
     */

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

    /**
     * Write File object from part 
     * @param {File|Blob} file              - File object 
     * @param {int} [start]                 - Start byte, by default the last
     * @param {string|Buffer} data          - Data to write
     * @param {string} [encoding]           - If data is string, define the data
     *                                        encoding
     * @param {function} cb                 - Callback
     */
    CoFS.prototype.writeFilePart = function (fileName, start, data, encoding,
                                                                    callback) {
        var self = this;

        if (typeof start !== 'number') {
            callback = encoding;
            encoding = data;
            data = start;
            start = null;
        }

        if (Buffer.isBuffer(data)) {
            callback = encoding;
            encoding = undefined;
        } else {
            data = new Buffer(data, encoding);
        }

        this.getFileSystem(function (err) {

            if (err) return callback(err);

            var op = {
                create: false,
                exclusive: true
            };

            self.getFileEntry(fileName, op, function (err, fileEntry) {

                if (err)
                    return callback(
                        new Error("Error getting file access " + err.message));

                fileEntry.createWriter(function(fileWriter) {
              
                    if (!start) start = fileWriter.length;

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

                    fileWriter.seek(start);
                    fileWriter.write(blob);

                }, function () {
                    callback(new Error('Error writing ' + fileName));
                }); 
            });

        });
    
    };

    /**
     * Create a read stream 
     * @param file          - File 
     * @param [options]     - Options
     * @return {CoFS.readStream}
     */
    CoFS.prototype.createReadStream = function (file, options) {
        var readStream = new ReadStream(this, file, options);
        return readStream;
    };

    /**
     * Create a write stream 
     * @param file          - File 
     * @param [options]     - Options
     * @return {CoFS.writeStream}
     */

    CoFS.prototype.createWriteStream = function (file, options) {
        var writeStream = new WriteStream(this, file, options);
        return writeStream;
    };

    return CoFS;

});
