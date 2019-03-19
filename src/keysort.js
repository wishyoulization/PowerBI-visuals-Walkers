Array.prototype.keySort = function (keys) {
    keys = keys || {};

    // via
    // https://stackoverflow.com/questions/5223/length-of-javascript-object-ie-associative-array
    var obLen = function (obj) {
        var size = 0, key;
        for (key in obj) {
            if (obj.hasOwnProperty(key))
                size++;
        }
        return size;
    };

    // avoiding using Object.keys because I guess did it have IE8 issues?
    // else var obIx = function(obj, ix){ return Object.keys(obj)[ix]; } or
    // whatever
    var obIx = function (obj, ix) {
        var size = 0, key;
        for (key in obj) {
            if (obj.hasOwnProperty(key)) {
                if (size == ix)
                    return key;
                size++;
            }
        }
        return false;
    };

    var keySort = function (a, b, d) {
        d = d !== null ? d : 1;
        // a = a.toLowerCase(); // this breaks numbers
        // b = b.toLowerCase();
        if (a == b)
            return 0;
        return a > b ? 1 * d : -1 * d;
    };

    var KL = obLen(keys);

    if (!KL)
        return this.sort(keySort);

    for (var k in keys) {
        // asc unless desc or skip
        keys[k] =
            keys[k] == 'desc' || keys[k] == -1 ? -1
                : (keys[k] == 'skip' || keys[k] === 0 ? 0
                    : 1);
    }

    this.sort(function (a, b) {
        var sorted = 0, ix = 0;

        while (sorted === 0 && ix < KL) {
            var k = obIx(keys, ix);
            if (k) {
                var dir = keys[k];
                sorted = keySort(a[k], b[k], dir);
                ix++;
            }
        }
        return sorted;
    });
    return this;
};