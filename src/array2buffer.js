
define([
    'buffer'
], function (buffer) {
    'use stricts';

    var Buffer = buffer.Buffer;

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

    return arrayBufferToBuffer;

});
