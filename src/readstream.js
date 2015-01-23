define([
    'async',
    'eventemitter2'
], function (async, EventsEmitter) {
    'use stricts';

    var File, Blob;

    var StopedErr = function () {
        Error.call(this);
    };

    StopedErr.prototype = new Error();

    var ReadStream = function () {
        this.initialize.apply(this, arguments);
    };

    ReadStream.prototype = new EventsEmitter();

    ReadStream.prototype.initialize = function (fs, file, options) {

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

        this._blockSize = options.blockSize || 4096;
        this._start = options.start || 0;
        this._end = options.end !== undefined ? options.end : undefined;

        this._paused = false;
        this._stoped = false;

        if (this._end <= this._start) {
            throw new Error("Start byte has been bigger that end byte");
        }

    };
    
    ReadStream.prototype._error = function (err) {
        var count = this.emit('error', err);

        if (!count) {
            throw err;
        }

    };

    ReadStream.prototype.getFile = function (cb) {

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

    ReadStream.prototype.start = function () {
   
        var self = this; 

        var start = this._start;
        var end = this._end;
        var blockSize = this._blockSize;

        this.getFile(function (err, file) {

            if (err) {
                return self._error(err);
            }

            if (typeof end === 'undefined')
                end = file.size;

            var byByte = start;
        
            async.whilst(
                function () {
                    return byByte <= end;
                },
                function (tcb) {

                    var done = function (data) {
                        self.emit('data', data);
                        return tcb(); 
                    };

                    self._fs.readFilePart(
                        file,
                        byByte,
                        byByte + blockSize,
                        function (err, data) {

                            byByte += blockSize;

                            if (err) {
                                tcb(err);
                                return;
                            }

                            if (self._paused) {
                                return self.once('resume', function () {
                                    done(data);
                                }); 
                            } else if (self._stoped) {
                                return tcb(new StopedErr());
                            } else {
                                done(data);
                            }

                        }
                    );

                }, 
                function (err) {
                    if (err instanceof StopedErr)
                        return;

                    if (err) {
                        return self._error(err);
                    } else {
                        return self.emit('finish');
                    }
                }
            );

        });

    };

    ReadStream.prototype.pause = function () {
        this._paused = true;
        this.emit('pause');
    };

    ReadStream.prototype.resume = function () {
        this._paused = false;
        this.emit('resume');
    };

    ReadStream.prototype.stop = function () {
        this._stoped = true;
        this.emit('stop');
    };

    return ReadStream;

});
