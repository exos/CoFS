
(function (root, factory) {

    if (typeof define === 'function' && define.amd) {
        define(['buffer','exports'], function (buffer) {
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

    var FileReader = window.FileReader  || throw new Error("Object FileReader does not exists!");

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

        window.requestFileSystem(
                LocalFileSystem[options.fs || 'PERSISTENT'],
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

        if (!this.emit('error', err))
            throw err; // Throw error if not is listened
    };

    cofs.prototype.on = function (eventName, callback, once) {

        if (typeof this._eventsListeners[eventName] === 'undefined')
            this._eventsListeners[eventName] = [];

        this._eventsListeners[eventName].pull({
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
        
        for (i=0; i<args.length;i++)
            listeners[i].apply(root, args);

        return i;

    };

    cofs.prototype.getFileEntry = function (fileName, callback) {
        
        var self = this;

        this._ifready(function () {
            self._fs.root.getFile(
                fileName,
                null,
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

        this.getFileEntry(fileName, function (err, fileEntry) {
            var reader = new FileReader();

            reader.onloaded = function (evt) {
                callback(null, new Buffer(evt.target.result));
            };

            reader.readAsDataURL(fileEntry);
        
        });

    };

    return cofs;

});
