define([
    'buffer',
    'async',
    'eventemitter2'
], function (buffer, async, EventsEmitter) {
    'use strict';

    var Buffer = buffer.Buffer;
    var File, Blob;

    var StopedErr = function () {
        Error.call(this);
    };

    StopedErr.prototype = new Error();

    var WriteStream = function () {
        this.initialize.apply(this, arguments);
    };

    WriteStream.prototype = new EventsEmitter();

    WriteStream.prototype.initialize = function (fs, file, options) {
        var self = this;

        EventsEmitter.call(this);
        options = options || {};
    
        File = window.File || undefined;
        Blob = window.Blob || undefined;

        if (typeof File === 'undefined')
            throw new Error("File componet does not exits");

        if (typeof Blob === 'undefined')
            throw new Error("Blob componet does not exists");

        this._fs = fs;
        this._file = file;

        this._start = options.start || 0;
        this._ready = false;
        this._starting = false;
        this._last = 0;

        this._paused = false;
        this._stoped = false;

        this._writeQueue = async.queue(function (data, done) {
            self._fs.writeFilePart(self._file, data, done);
        }, 1);

        this._writeQueue.pause();

        this._writeQueue.drain = function () {
            self.emit('drain');
        };

        this._init();
     
    };

    WriteStream.prototype._error = function (err) {
        var count = this.emit('error', err);

        if (!count) {
            throw err;
        }

    };

    WriteStream._init = function () {
        var self = this;
       
        if (this._starting) return;

        this._starting = true;
        
        this._fs.writeFile(this._file, new Buffer(0), function (err) {
            if (err) {
                self._error(err);
                return;
            }

            if (!self._paused) {
                self.emit('ready');
                self._writeQueue.resume();
            }

        });
   
    };

    WriteStream.prototype.write = function (data, encoding, callback) {
        var self = this;
        
        if (!Buffer.isBuffer(data)) {
            data = new Buffer(data, encoding);
        } else {
            callback = encoding;
            encoding = undefined;
        }

        callback = callback || function (err) {
            self._error(err);
        };

        this._writeQueue.push(data, callback);

    };

    WriteStream.prototype.getFile = function (cb) {

        var fs = this._fs;
        var file = this._file;

        if (file instanceof File || file instanceof Blob) {
            return cb(undefined, file);
        } else {

            fs.getFileEntry(file, function (err, fileEntry) {
                
                if (err) return cb(err);

                fileEntry.file(function (fileObject) {
                    return cb(undefined, fileObject);
                });

            });
        }

    };

    WriteStream.prototype.resume = function () {
       this._writeQueue.resume();
       this.emit('resume');
    };

    WriteStream.prototype.pause = function () {
        this._paused = true;
        this._writeQueue.pause();
        this.emit('pause');
    };

    WriteStream.prototype.stop = function () {
        this._stoped = true;
        this._writeQueue.kill();
        this.emit('stop');
    };

    return WriteStream;

});
