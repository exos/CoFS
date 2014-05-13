
(function (root, factory) {

    if (typeof define === 'function' && define.amd) {
        define(['buffer','exports'], function (buffer, exports) {
            return factory(root, exports, buffer);
        });
    } else if (typeof exports !== 'undefined') {
        var buffer = require('buffer');
        factory(root, exports, buffer);
    } else {
        root.cofs = factory(root, {}, root.buffer);
    }

})(this, function (root, cofs, buffer) {
    "use stricts";

    var _cofs = root.cofs;
    var Buffer = buffer.Buffer;

    var FileReader = window.FileReader  || null;
    var requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem || null;

    if (!FileReader ||  !requestFileSystem) 
        throw new Error("Objects of file API does not exists!");

    cofs = function () {
        this.initialize.apply(this, arguments);
    };

    cofs.VERSION = '0.1.0';

    cofs.noConflict = function () {
        root.cofs = _cofs;
        return this;
    };

    cofs.prototype.initialize = function (options) {
 
        var self = this;

        this._eventsListeners = {}; 
        this._fs = null;

        options = options || {};

        this._options = options;

    };

    cofs.prototype._log = function () {
        if (this._options.logger) {
            this._options.logger.apply({}, arguments);
        }
    };

    cofs.prototype._error = function (err) {

        if (typeof err !== 'object')
            err = new Error(err);

        console.log("CoFS Error" + e.message);

        if (!this.emit('error', err))
            throw err; // Throw error if not is listened
    };

    cofs.prototype.on = function (eventName, callback, once) {

        if (typeof this._eventsListeners[eventName] === 'undefined')
            this._eventsListeners[eventName] = [];

        this._eventsListeners[eventName].push({
            cb: callback,
            once: once || false 
        });

    };

    cofs.prototype.once = function (eventName, callback) {
        return this.on(eventName, callback, true); 
    };

    cofs.prototype.emit = function () {
        if (!arguments.length) return false;

        var args = Array.prototype.slice.call(arguments, 0);
        var eventName = args.shift();
        var listeners = this._eventsListeners[eventName] || [];
        var i;

        console.log("emiting " + eventName);

        for (i=0; i<args.length;i++) {
            if (!listeners[i]) continue;
            listeners[i].cb.apply(root, args);
            if (listeners[i].once) {
                listeners[i] = null;
            }
        }

        return i;

    };

    cofs.prototype.getFileSystem = function (options, callback) {
        
        var self = this;

        if (typeof options == 'function') {
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

    cofs.prototype.getFileEntry = function (fileName, options, callback) {


        if (typeof options === 'function') {
            callback = options;
            options = {};
        }

        this._log ("Getting FileEntry for", fileName, options);

        if (typeof fileName === 'object') return callback(null,fileName);

        var self = this;

        this.getFileSystem (function (err, fs) {

            if (err) return callback(err);

            fs.root.getFile(
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

    cofs.prototype.readFile = function (fileName, callback) {
       
        var self = this;

        this._log("Reading file for", fileName);

        self.getFileEntry(fileName, function (err, file) {

            if (err) return callback(err);

            var reader = new FileReader();

            reader.onloadend = function (evt) {
                var result = this.result;
                self._log("load end call! with large (relative): ", result.length );

                if (!result) return null;

                var cresult = result.replace(/^data:(?:[^;]*;)?base64,/i,'');
                self._log(result, cresult);
                var Buf = new Buffer(cresult, 'base64');

                self._log("New large: ", Buf.length);

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

            reader.readAsDataURL(file);

        });

    };

    cofs.prototype.writeFile = function (fileName, data, callback) {
    
        var self = this;

        if (Buffer.isBuffer(data)) {
            data = data.toString('binary'); 
        }

        this._ifready(function () {

            self.getFileEntry(fileName, {create: true, exclusive: true}, function (err, fileEntry) {

                if (err) return callback(new Error("Error getting file access " + err.message));

                fileEntry.createWriter(function(fileWriter) {
               
                    fileWriter.onwriteend = function () {
                        callback(null);
                    };

                    fileWriter.onerror = function(e) {
                        callback(new Error(e.toString()));
                    };

                    var blob = new Blob([data], {type: 'application/octet-stream'});

                    fileWriter.write(blob);

                }, function () {
                    callback(new Error('Error writing ' + fileName));
                }); 
            });

        });

    };

    return cofs;

});
