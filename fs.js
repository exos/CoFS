
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
        this._loaded = false;
        this._fs = null;

        options = options || {};

        requestFileSystem(
                window[options.fs || 'PERSISTENT'],
                0,
                function (fs) {
                    self._loaded = true;
                    self._fs = fs;
                    self.emit('ready', fs);
                },
                function (err) {
                    self._loaded = false;
                    self._error(err); 
                }
        );
        
    };

    cofs.prototype._ifready = function (callback) {
        if (this._loaded) {
            callback(this._fs);
        } else {
            this.once('ready', callback);
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

    cofs.prototype.getFileEntry = function (fileName, options, callback) {


        if (typeof options === 'function') {
            callback = options;
            options = {};
        }
        
        if (typeof fileName === 'object') return callback(null,fileName);

        var self = this;

        this._ifready(function () {
            console.log("Getting fileentry for " + fileName);
            self._fs.root.getFile(
                fileName,
                options,
                function(fileEntry) {
                    self.emit('fileentry:' + fileName, fileEntry);
                    callback(null, fileEntry);
                },
                function (err) {
                    callback(err);
                }
            );
        });

    };

    cofs.prototype.readFile = function (file, callback) {
       
        var self = this;

        this._ifready(function ()  {

            console.log("Reading", file);
            var reader = new FileReader();

            reader.onloadend = function (evt) {
                var result = this.result;
                console.log("loaded:", this.result);

                if (!result) return null;

                var cresult = result.replace(/^data:[^;]*;base64,/i,'');

                callback(null, new Buffer(cresult, 'base64'));
            };

            reader.onerror = function (ev) {
                callback(new Error('Reading file'));
            };

            reader.onabort = function (ev) {
                callback(new Error('Reading abort')); 
            };

            reader.readAsDataURL(file);

        });

    };

    return cofs;

});
