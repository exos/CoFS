;(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else {
        var _CoFS = root.CoFS;
        root.CoFS = factory();
        root.CoFS.noConflict = function () {
            root.CoFS = _CoFS;
            return CoFS;
        };
    }
}(this, function () {
