// quick-and-dirty simple FIFO serial queue, helps you call `fn`s in order

module.exports = function SerialQueue() {
    var q = {},
        tasks = [];
    function runNext() {
        tasks[0](function () {
            tasks.shift();         // TODO: avoid?
            if (tasks.length) runNext();
        });
    }
    
    // usage: `q.aquire(function (release) { … release(); });`
    q.acquire = function (fn) {
        var len = tasks.push(fn);
        if (len === 1) process.nextTick(runNext);
    };
    
    // usage: `cb = q.TRANSACTION_WRAPPER(cb, function () { … cb(); });`
    // (pass `true` for `nested` if your own caller already holds lock)
    q.TRANSACTION_WRAPPER = function (cb, fn, nested) {
        if (nested) {
            process.nextTick(fn);
            return cb;
        }
        
        var _releaseQueue;
        if (this !== q) fn = this.postAcquire.bind(q, fn);
        q.acquire(function (releaseQueue) {
            _releaseQueue = releaseQueue;
            fn();
        });
        function _cb() {
            _releaseQueue();
            cb.apply(this, arguments);
        }
        return (this !== q) ? this.preRelease.bind(q, _cb) : _cb;
    };
    
    return q;
};
