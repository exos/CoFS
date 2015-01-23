
define(function () {
    'use stricts';

    var getDonePromise = function (listener) {

        if (typeof listener !== 'function') {
            throw new Error("Listener not defined");
        }

        return function () {
            var args = Array.prototype.slice.call(arguments);
            listener.apply({}, args);
        };

    };

    return getDonePromise;

});
