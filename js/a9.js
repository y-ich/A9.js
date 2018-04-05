(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
(function (process){

var MACHINE_ID = parseInt(Math.random() * 0xFFFFFF, 10);
var index = ObjectID.index = parseInt(Math.random() * 0xFFFFFF, 10);
var pid = (typeof process === 'undefined' || typeof process.pid !== 'number' ? Math.floor(Math.random() * 100000) : process.pid) % 0xFFFF;

/**
 * Determine if an object is Buffer
 *
 * Author:   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * License:  MIT
 *
 */
var isBuffer = function (obj) {
  return !!(
  obj != null &&
  obj.constructor &&
  typeof obj.constructor.isBuffer === 'function' &&
  obj.constructor.isBuffer(obj)
  )
};

/**
 * Create a new immutable ObjectID instance
 *
 * @class Represents the BSON ObjectID type
 * @param {String|Number} arg Can be a 24 byte hex string, 12 byte binary string or a Number.
 * @return {Object} instance of ObjectID.
 */
function ObjectID(arg) {
  if(!(this instanceof ObjectID)) return new ObjectID(arg);
  if(arg && ((arg instanceof ObjectID) || arg._bsontype==="ObjectID"))
    return arg;

  var buf;

  if(isBuffer(arg) || (Array.isArray(arg) && arg.length===12)) {
    buf = Array.prototype.slice.call(arg);
  }
  else if(typeof arg === "string") {
    if(arg.length!==12 && !ObjectID.isValid(arg))
      throw new Error("Argument passed in must be a single String of 12 bytes or a string of 24 hex characters");

    buf = buffer(arg);
  }
  else if(/number|undefined/.test(typeof arg)) {
    buf = buffer(generate(arg));
  }

  Object.defineProperty(this, "id", {
    enumerable: true,
    get: function() { return String.fromCharCode.apply(this, buf); }
  });
  Object.defineProperty(this, "str", {
    get: function() { return buf.map(hex.bind(this, 2)).join(''); }
  });
}
module.exports = ObjectID;
ObjectID.generate = generate;
ObjectID.default = ObjectID;

/**
 * Creates an ObjectID from a second based number, with the rest of the ObjectID zeroed out. Used for comparisons or sorting the ObjectID.
 *
 * @param {Number} time an integer number representing a number of seconds.
 * @return {ObjectID} return the created ObjectID
 * @api public
 */
ObjectID.createFromTime = function(time){
  time = parseInt(time, 10) % 0xFFFFFFFF;
  return new ObjectID(hex(8,time)+"0000000000000000");
};

/**
 * Creates an ObjectID from a hex string representation of an ObjectID.
 *
 * @param {String} hexString create a ObjectID from a passed in 24 byte hexstring.
 * @return {ObjectID} return the created ObjectID
 * @api public
 */
ObjectID.createFromHexString = function(hexString) {
  if(!ObjectID.isValid(hexString))
    throw new Error("Invalid ObjectID hex string");

  return new ObjectID(hexString);
};

/**
 * Checks if a value is a valid bson ObjectId
 *
 * @param {String} objectid Can be a 24 byte hex string or an instance of ObjectID.
 * @return {Boolean} return true if the value is a valid bson ObjectID, return false otherwise.
 * @api public
 *
 * THE NATIVE DOCUMENTATION ISN'T CLEAR ON THIS GUY!
 * http://mongodb.github.io/node-mongodb-native/api-bson-generated/objectid.html#objectid-isvalid
 */
ObjectID.isValid = function(objectid) {
  if(!objectid) return false;

  //call .toString() to get the hex if we're
  // working with an instance of ObjectID
  return /^[0-9A-F]{24}$/i.test(objectid.toString());
};

/**
 * set a custom machineID
 * 
 * @param {String|Number} machineid Can be a string, hex-string or a number
 * @return {void}
 * @api public
 */
ObjectID.setMachineID = function(arg) {
  var machineID;

  if(typeof arg === "string") {
    // hex string
    machineID = parseInt(arg, 16);
   
    // any string
    if(isNaN(machineID)) {
      arg = ('000000' + arg).substr(-7,6);

      machineID = "";
      for(var i = 0;i<6; i++) {
        machineID += (arg.charCodeAt(i));
      }
    }
  }
  else if(/number|undefined/.test(typeof arg)) {
    machineID = arg | 0;
  }

  MACHINE_ID = (machineID & 0xFFFFFF);
}

/**
 * get the machineID
 * 
 * @return {number}
 * @api public
 */
ObjectID.getMachineID = function() {
  return MACHINE_ID;
}

ObjectID.prototype = {
  _bsontype: 'ObjectID',
  constructor: ObjectID,

  /**
   * Return the ObjectID id as a 24 byte hex string representation
   *
   * @return {String} return the 24 byte hex string representation.
   * @api public
   */
  toHexString: function() {
    return this.str;
  },

  /**
   * Compares the equality of this ObjectID with `otherID`.
   *
   * @param {Object} other ObjectID instance to compare against.
   * @return {Boolean} the result of comparing two ObjectID's
   * @api public
   */
  equals: function (other){
    return !!other && this.str === other.toString();
  },

  /**
   * Returns the generation date (accurate up to the second) that this ID was generated.
   *
   * @return {Date} the generation date
   * @api public
   */
  getTimestamp: function(){
    return new Date(parseInt(this.str.substr(0,8), 16) * 1000);
  }
};

function next() {
  return index = (index+1) % 0xFFFFFF;
}

function generate(time) {
  if (typeof time !== 'number')
    time = Date.now()/1000;

  //keep it in the ring!
  time = parseInt(time, 10) % 0xFFFFFFFF;

  //FFFFFFFF FFFFFF FFFF FFFFFF
  return hex(8,time) + hex(6,MACHINE_ID) + hex(4,pid) + hex(6,next());
}

function hex(length, n) {
  n = n.toString(16);
  return (n.length===length)? n : "00000000".substring(n.length, length) + n;
}

function buffer(str) {
  var i=0,out=[];

  if(str.length===24)
    for(;i<24; out.push(parseInt(str[i]+str[i+1], 16)),i+=2);

  else if(str.length===12)
    for(;i<12; out.push(str.charCodeAt(i)),i++);

  return out;
}

/**
 * Converts to a string representation of this Id.
 *
 * @return {String} return the 24 byte hex string representation.
 * @api private
 */
ObjectID.prototype.inspect = function() { return "ObjectID("+this+")" };
ObjectID.prototype.toJSON = ObjectID.prototype.toHexString;
ObjectID.prototype.toString = ObjectID.prototype.toHexString;

}).call(this,require('_process'))

},{"_process":2}],2:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],3:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
/// コミです。
const KOMI = exports.KOMI = 7.0;

/// 碁盤のサイズです。
const BSIZE = exports.BSIZE = 9;

/// 外枠を持つ拡張碁盤のサイズです。
const EBSIZE = exports.EBSIZE = BSIZE + 2;

/// 碁盤の交点の数です。
const BVCNT = exports.BVCNT = BSIZE * BSIZE;

/// 拡張碁盤の交点の数です。
const EBVCNT = exports.EBVCNT = EBSIZE * EBSIZE;

/// パスを表す線形座標です。通常の着手は拡張碁盤の線形座標で表します。
// TODO - 着手のために列挙型を作ったほうが関数のシグニチャは読みやすい。
const PASS = exports.PASS = EBVCNT;

/// 線形座標のプレースホルダーの未使用を示す値です。
// TODO - 該当する場所にOption<usize>を使ったほうが関数のシグニチャは読みやすい。
const VNULL = exports.VNULL = EBVCNT + 1;

/// NNへの入力に関する履歴の深さです。
const KEEP_PREV_CNT = exports.KEEP_PREV_CNT = 2;

/// NNへの入力フィーチャーの数です。
const FEATURE_CNT = exports.FEATURE_CNT = KEEP_PREV_CNT * 2 + 3; // 7
},{}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.X_LABELS = undefined;
exports.move2xy = move2xy;
exports.ev2xy = ev2xy;
exports.xy2ev = xy2ev;
exports.rv2ev = rv2ev;
exports.ev2rv = ev2rv;
exports.ev2str = ev2str;
exports.str2ev = str2ev;

var _constants = require('./constants.js');

const X_LABELS = exports.X_LABELS = '@ABCDEFGHJKLMNOPQRST';

function move2xy(s) {
    const OFFSET = 'a'.charCodeAt(0) - 1;
    return [s.charCodeAt(0) - OFFSET, _constants.BSIZE + 1 - (s.charCodeAt(1) - OFFSET)];
}

function ev2xy(ev) {
    return [ev % _constants.EBSIZE, Math.floor(ev / _constants.EBSIZE)];
}

function xy2ev(x, y) {
    return y * _constants.EBSIZE + x;
}

function rv2ev(rv) {
    return rv === _constants.BVCNT ? _constants.PASS : rv % _constants.BSIZE + 1 + Math.floor(rv / _constants.BSIZE + 1) * _constants.EBSIZE;
}

function ev2rv(ev) {
    return ev === _constants.PASS ? _constants.BVCNT : ev % _constants.EBSIZE - 1 + Math.floor(ev / _constants.EBSIZE - 1) * _constants.BSIZE;
}

function ev2str(ev) {
    if (ev >= _constants.PASS) {
        return 'pass';
    } else {
        const [x, y] = ev2xy(ev);
        return X_LABELS.charAt(x) + y.toString();
    }
}

function str2ev(v) {
    const vStr = v.toUpperCase();
    if (vStr === 'PASS' || vStr === 'RESIGN') {
        return _constants.PASS;
    } else {
        const x = X_LABELS.indexOf(vStr.charAt(0));
        const y = parseInt(vStr.slice(1));
        return xy2ev(x, y);
    }
}
},{"./constants.js":3}],5:[function(require,module,exports){
'use strict';

var _workerRmi = require('./worker-rmi.js');

var _neural_network = require('./neural_network.js');

var _coord_convert = require('./coord_convert.js');

var _constants = require('./constants.js');

var _speech = require('./speech.js');

class A9Engine extends _workerRmi.WorkerRMI {
    async loadNN() {
        await this.invokeRM('loadNN');
    }

    async clear() {
        await this.stopPonder();
        await this.invokeRM('clear');
    }

    async timeSettings(mainTime, byoyomi) {
        await this.invokeRM('timeSettings', [mainTime, byoyomi]);
    }

    async genmove() {
        const [move, winRate] = await this.bestMove();
        if (winRate < 0.1) {
            return 'resign';
        } else {
            await this.play(move);
            return (0, _coord_convert.ev2str)(move);
        }
    }

    async play(ev) {
        await this.invokeRM('play', [ev]);
    }

    async bestMove() {
        return await this.invokeRM('bestMove');
    }

    async finalScore() {
        return await this.invokeRM('finalScore');
    }

    startPonder() {
        this.ponderPromise = this.invokeRM('ponder');
    }

    async stopPonder() {
        if (this.ponderPromise) {
            await this.invokeRM('stopPonder');
            await this.ponderPromise;
            this.ponderPromise = null;
        }
    }
} /* global $ JGO BoardController */


class PlayController {
    constructor(engine, board, igoQuest = false) {
        this.engine = engine;
        this.board = board;
        this.isSelfPlay = false;
        if (igoQuest) {
            this.timeLeft = [0, // dumy
            (3 * 60 + 1) * 1000, // black
            3 * 60 * 1000];
            if (igoQuest) {
                this.start = Date.now();
                this.timer = setInterval(() => {
                    const start = Date.now();
                    this.timeLeft[this.board.turn] -= start - this.start;
                    this.start = start;
                    if (this.board.turn == this.board.ownColor) {
                        $('#your-time').text(Math.ceil(this.timeLeft[this.board.turn] / 1000));
                    } else {
                        $('#ai-time').text(Math.ceil(this.timeLeft[this.board.turn] / 1000));
                    }
                    if (this.timeLeft[this.board.turn] < 0) {
                        clearInterval(this.timer);
                        this.timer = null;
                        alert('時間切れです');
                    }
                }, 100);
            }
        }
    }

    clearTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    setIsSelfPlay(isSelfPlay) {
        this.isSelfPlay = isSelfPlay;
    }
    async update(coord) {
        if (coord === 'end') {
            this.clearTimer();
            try {
                const score = await this.finalScore();
                let message = score === 0 ? '持碁' : score > 0 ? `黒${score}目勝ち` : `白${-score}目勝ち`;
                message += 'ですか？';
                (0, _speech.speak)(message);
                setTimeout(function () {
                    alert(message);
                    $(document.body).addClass('end');
                }, 3000);
            } catch (e) {
                console.log(e);
                (0, _speech.speak)('すみません、整地できませんでした');
            }
            return;
        }

        if (this.start) {
            this.timeLeft[this.board.turn] += 1000;
        }

        if (!this.isSelfPlay && typeof coord === 'object') {
            await this.engine.stopPonder();
            await this.engine.play((0, _coord_convert.xy2ev)(coord.i + 1, _constants.BSIZE - coord.j));
        }
        if (this.isSelfPlay || this.board.turn !== this.board.ownColor) {
            setTimeout(async () => {
                const move = await this.engine.genmove();
                switch (move) {
                    case 'resign':
                        this.clearTimer();
                        (0, _speech.speak)('負けました', 'ja-jp', 'female');
                        $(document.body).addClass('end');
                        break;
                    case 'pass':
                        this.board.play(null);
                        (0, _speech.speak)('パスします', 'ja-jp', 'female');
                        break;
                    default:
                        {
                            const ev = (0, _coord_convert.str2ev)(move);
                            const xy = (0, _coord_convert.ev2xy)(ev);
                            this.board.play(new JGO.Coordinate(xy[0] - 1, _constants.BSIZE - xy[1]), true);
                        }
                }
            }, 0);
        } else {
            this.engine.startPonder();
        }
    }

    async pass() {
        if (this.board.ownColor === this.board.turn) {
            await this.engine.stopPonder();
            this.engine.play(_constants.PASS);
            this.board.play(null);
        }
    }

    async finalScore() {
        const result = await $.post({
            url: 'http://35.203.161.100/gnugo',
            data: {
                sgf: this.board.jrecord.toSgf(),
                move: 'est',
                method: 'aftermath',
                rule: 'japanese'
            }
        });
        if (/Jigo/.test(result)) {
            return 0;
        }
        const match = result.match(/(Black|White) wins by ([0-9.]+) points/);
        if (match) {
            let score = parseFloat(match[2]);
            if (match[1] === 'Black') {
                return score;
            } else {
                return -score;
            }
        } else {
            return null;
        }
    }

}

async function main() {
    const board = await new Promise(function (res, rej) {
        new BoardController(_constants.BSIZE, 0, res);
    });
    // JGOのレンダリングを完了させるためにsetTimeoutでイベントループを進める
    setTimeout(async function () {
        try {
            await engine.loadNN();
        } catch (e) {
            if (e.message === 'No backend is available') {
                if (/(Mac OS X 10_13|(iPad|iPhone|iPod); CPU OS 11).*Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)) {
                    (0, _speech.speak)('残念ながらお使いのブラウザでは動きません。Safariをお使いですね。「開発」メニューの「実験的な機能」で「WebGPU」を有効にすると動くかもしれません', 'ja-jp', 'female');
                } else if (!(0, _speech.speak)('残念ながらお使いのブラウザでは動きません', 'ja-jp', 'female')) {
                    alert('残念ながらお使いのブラウザでは動きません');
                }
            } else {
                console.error(e);
            }
            return;
        }
        const condition = await new Promise(function (res, rej) {
            const $startModal = $('#start-modal');
            $startModal.modal('show');
            $startModal.one('hidden.bs.modal', function (e) {
                const $conditionForm = $('#condition-form');
                res({
                    color: $conditionForm[0]['color'].value,
                    timeRule: $conditionForm[0]['time'].value,
                    time: parseInt($conditionForm[0]['ai-byoyomi'].value)
                });
            });
        });
        switch (condition.timeRule) {
            case 'ai-time':
                await engine.timeSettings(0, condition.time);
                break;
            case 'igo-quest':
                await engine.timeSettings(3 * 60 + 55, 1); // 9路盤は平均手数が110手らしいので、55のフィッシャー秒を追加
                break;
        }
        board.setOwnColor(condition.color === 'W' ? JGO.WHITE : JGO.BLACK);
        const controller = new PlayController(engine, board, condition.timeRule === 'igo-quest');
        const isSelfPlay = condition.color === 'self-play';
        if (!isSelfPlay) {
            (0, _speech.speak)('お願いします', 'ja-jp', 'female');
        }
        controller.setIsSelfPlay(isSelfPlay);
        board.addObserver(controller);
        $('#pass').on('click', function (event) {
            controller.pass();
        });
        $('#resign').on('click', async function (event) {
            board.clearTimer();
            await engine.stopPonder();
            (0, _speech.speak)('ありがとうございました', 'ja-jp', 'female');
            $(document.body).addClass('end');
        });
        $('#retry').one('click', async function (event) {
            $('#pass').off('click');
            $('#resign').off('click');
            board.destroy();
            engine.clear();
            $(document.body).removeClass('end');
            setTimeout(main, 0);
        });
    }, 0);
}

const worker = new Worker('js/worker.js');
(0, _workerRmi.resigterWorkerRMI)(worker, _neural_network.NeuralNetwork);
const engine = new A9Engine(worker);
main();
},{"./constants.js":3,"./coord_convert.js":4,"./neural_network.js":6,"./speech.js":7,"./worker-rmi.js":8}],6:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
/* global WebDNN */

if (!ArrayBuffer.prototype.slice) {
    ArrayBuffer.prototype.slice = function (start, end) {
        var that = new Uint8Array(this);
        if (end == undefined) end = that.length;
        var result = new ArrayBuffer(end - start);
        var resultArray = new Uint8Array(result);
        for (var i = 0; i < resultArray.length; i++) resultArray[i] = that[i + start];
        return result;
    };
}

class NeuralNetwork {
    constructor() {
        this.nn = null;
    }

    async load() {
        if (this.nn) {
            return;
        }
        this.nn = await WebDNN.load('./output', { backendOrder: ['webgpu', 'webgl'] });
    }

    async evaluate(...inputs) {
        const views = this.nn.getInputViews();
        for (let i = 0; i < inputs.length; i++) {
            views[i].set(inputs[i]);
        }
        await this.nn.run();
        return this.nn.getOutputViews().map(e => e.toActual().slice(0)); // to.Actualそのものではworker側でdetachができない模様
    }
}
exports.NeuralNetwork = NeuralNetwork;
},{}],7:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.speak = speak;
function speak(text, lang, gender) {
    if (!SpeechSynthesisUtterance) return false;

    switch (lang) {
        case 'en':
            lang = 'en-us';
            break;
        case 'ja':
            lang = 'ja-jp';
            break;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    if (/(iPhone|iPad|iPod)(?=.*OS [7-8])/.test(navigator.userAgent)) utterance.rate = 0.2;
    const voices = speechSynthesis.getVoices().filter(e => e.lang.toLowerCase() === lang);
    let voice = null;
    if (voices.length > 1) {
        let names = null;
        switch (lang) {
            case 'ja-jp':
                switch (gender) {
                    case 'male':
                        names = ['Otoya', 'Hattori', 'Ichiro'];
                        break;
                    case 'female':
                        names = ['O-ren（拡張）', 'O-ren', 'Kyoko', 'Haruka']; // Windows 10のAyumiの声は今ひとつ
                        break;
                }
                break;
            case 'en-us':
                switch (gender) {
                    case 'male':
                        names = ['Alex', 'Fred'];
                        break;
                    case 'female':
                        names = ['Samantha', 'Victoria'];
                        break;
                }
                break;
        }
        if (names) {
            voice = voices.filter(v => names.some(n => v.name.indexOf(n) >= 0))[0];
        }
        if (!voice) {
            voice = voices.filter(v => v.gender && v.gender.toLowerCase() === gender)[0];
        }
    }
    utterance.voice = voice || voices[0];
    // iOS 10 Safari has a bug that utterance.voice is no effect.
    utterance.volume = parseFloat(localStorage.getItem('volume') || '1.0');
    speechSynthesis.speak(utterance);
    return true;
}

function unlock() {
    window.removeEventListener('click', unlock);
    speechSynthesis.speak(new SpeechSynthesisUtterance(''));
}

window.addEventListener('load', function (event) {
    if (speechSynthesis) {
        speechSynthesis.getVoices();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = function () {
                console.log('onvoiceschanged');
            };
        }
        window.addEventListener('click', unlock, false); // for iOS
    }
});
},{}],8:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.WorkerRMI = undefined;
exports.resigterWorkerRMI = resigterWorkerRMI;
exports.unresigterWorkerRMI = unresigterWorkerRMI;

var _bsonObjectid = require('bson-objectid');

var _bsonObjectid2 = _interopRequireDefault(_bsonObjectid);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function getTransferList(obj, list = []) {
    if (ArrayBuffer.isView(obj)) {
        list.push(obj.buffer);
        return list;
    }
    if (isTransferable(obj)) {
        list.push(obj);
        return list;
    }
    if (!(typeof obj === 'object')) {
        return list;
    }
    for (const prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            getTransferList(obj[prop], list);
        }
    }
    return list;
}

function isTransferable(instance) {
    const transferable = [ArrayBuffer];
    if (typeof MessagePort !== 'undefined') {
        transferable.push(MessagePort);
    }
    if (typeof ImageBitmap !== 'undefined') {
        transferable.push(ImageBitmap);
    }
    return transferable.some(e => instance instanceof e);
}

class WorkerRMI {
    constructor(remote, ...args) {
        this.remote = remote;
        this.id = (0, _bsonObjectid2.default)().toString();
        this.methodStates = {};
        this.remote.addEventListener('message', event => {
            const data = event.data;
            if (data.id === this.id) {
                this.returnHandler(data);
            }
        }, false);
        this.constructorPromise = this.invokeRM(this.constructor.name, args);
    }

    invokeRM(methodName, args = []) {
        if (!this.methodStates[methodName]) {
            this.methodStates[methodName] = {
                num: 0,
                resolveRejects: {}
            };
        }
        return new Promise((resolve, reject) => {
            const methodState = this.methodStates[methodName];
            methodState.num += 1;
            methodState.resolveRejects[methodState.num] = { resolve, reject };
            this.remote.postMessage({
                id: this.id,
                methodName,
                num: methodState.num,
                args
            }, getTransferList(args));
        });
    }

    returnHandler(data) {
        const resolveRejects = this.methodStates[data.methodName].resolveRejects;
        if (data.error) {
            resolveRejects[data.num].reject(data.error);
        } else {
            resolveRejects[data.num].resolve(data.result);
        }
        delete resolveRejects[data.num];
    }
}

exports.WorkerRMI = WorkerRMI;
async function handleWorkerRMI(event) {
    const data = event.data;
    const message = {
        id: data.id,
        methodName: data.methodName,
        num: data.num
    };
    let result;
    if (data.methodName === this.name) {
        this.workerRMI.instances[data.id] = new this(...data.args);
        message.result = null;
        this.workerRMI.target.postMessage(message, getTransferList(result));
    } else {
        const instance = this.workerRMI.instances[data.id];
        if (instance) {
            result = await instance[data.methodName].apply(instance, data.args);
            message.result = result;
            this.workerRMI.target.postMessage(message, getTransferList(result));
        }
    }
}

function resigterWorkerRMI(target, klass) {
    klass.workerRMI = {
        target,
        instances: {},
        handler: handleWorkerRMI.bind(klass)
    };
    target.addEventListener('message', klass.workerRMI.handler);
}

function unresigterWorkerRMI(target, klass) {
    target.removeEventListener('message', klass.workerRMI.handler);
    delete klass.workerRMI;
}
},{"bson-objectid":1}]},{},[5])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnNvbi1vYmplY3RpZC9vYmplY3RpZC5qcyIsIm5vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJzcmMvY29uc3RhbnRzLmpzIiwic3JjL2Nvb3JkX2NvbnZlcnQuanMiLCJzcmMvbWFpbi5qcyIsInNyYy9uZXVyYWxfbmV0d29yay5qcyIsInNyYy9zcGVlY2guanMiLCJzcmMvd29ya2VyLXJtaS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzlOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyUUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfXJldHVybiBlfSkoKSIsIlxudmFyIE1BQ0hJTkVfSUQgPSBwYXJzZUludChNYXRoLnJhbmRvbSgpICogMHhGRkZGRkYsIDEwKTtcbnZhciBpbmRleCA9IE9iamVjdElELmluZGV4ID0gcGFyc2VJbnQoTWF0aC5yYW5kb20oKSAqIDB4RkZGRkZGLCAxMCk7XG52YXIgcGlkID0gKHR5cGVvZiBwcm9jZXNzID09PSAndW5kZWZpbmVkJyB8fCB0eXBlb2YgcHJvY2Vzcy5waWQgIT09ICdudW1iZXInID8gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAwMDAwKSA6IHByb2Nlc3MucGlkKSAlIDB4RkZGRjtcblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYW4gb2JqZWN0IGlzIEJ1ZmZlclxuICpcbiAqIEF1dGhvcjogICBGZXJvc3MgQWJvdWtoYWRpamVoIDxmZXJvc3NAZmVyb3NzLm9yZz4gPGh0dHA6Ly9mZXJvc3Mub3JnPlxuICogTGljZW5zZTogIE1JVFxuICpcbiAqL1xudmFyIGlzQnVmZmVyID0gZnVuY3Rpb24gKG9iaikge1xuICByZXR1cm4gISEoXG4gIG9iaiAhPSBudWxsICYmXG4gIG9iai5jb25zdHJ1Y3RvciAmJlxuICB0eXBlb2Ygb2JqLmNvbnN0cnVjdG9yLmlzQnVmZmVyID09PSAnZnVuY3Rpb24nICYmXG4gIG9iai5jb25zdHJ1Y3Rvci5pc0J1ZmZlcihvYmopXG4gIClcbn07XG5cbi8qKlxuICogQ3JlYXRlIGEgbmV3IGltbXV0YWJsZSBPYmplY3RJRCBpbnN0YW5jZVxuICpcbiAqIEBjbGFzcyBSZXByZXNlbnRzIHRoZSBCU09OIE9iamVjdElEIHR5cGVcbiAqIEBwYXJhbSB7U3RyaW5nfE51bWJlcn0gYXJnIENhbiBiZSBhIDI0IGJ5dGUgaGV4IHN0cmluZywgMTIgYnl0ZSBiaW5hcnkgc3RyaW5nIG9yIGEgTnVtYmVyLlxuICogQHJldHVybiB7T2JqZWN0fSBpbnN0YW5jZSBvZiBPYmplY3RJRC5cbiAqL1xuZnVuY3Rpb24gT2JqZWN0SUQoYXJnKSB7XG4gIGlmKCEodGhpcyBpbnN0YW5jZW9mIE9iamVjdElEKSkgcmV0dXJuIG5ldyBPYmplY3RJRChhcmcpO1xuICBpZihhcmcgJiYgKChhcmcgaW5zdGFuY2VvZiBPYmplY3RJRCkgfHwgYXJnLl9ic29udHlwZT09PVwiT2JqZWN0SURcIikpXG4gICAgcmV0dXJuIGFyZztcblxuICB2YXIgYnVmO1xuXG4gIGlmKGlzQnVmZmVyKGFyZykgfHwgKEFycmF5LmlzQXJyYXkoYXJnKSAmJiBhcmcubGVuZ3RoPT09MTIpKSB7XG4gICAgYnVmID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJnKTtcbiAgfVxuICBlbHNlIGlmKHR5cGVvZiBhcmcgPT09IFwic3RyaW5nXCIpIHtcbiAgICBpZihhcmcubGVuZ3RoIT09MTIgJiYgIU9iamVjdElELmlzVmFsaWQoYXJnKSlcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkFyZ3VtZW50IHBhc3NlZCBpbiBtdXN0IGJlIGEgc2luZ2xlIFN0cmluZyBvZiAxMiBieXRlcyBvciBhIHN0cmluZyBvZiAyNCBoZXggY2hhcmFjdGVyc1wiKTtcblxuICAgIGJ1ZiA9IGJ1ZmZlcihhcmcpO1xuICB9XG4gIGVsc2UgaWYoL251bWJlcnx1bmRlZmluZWQvLnRlc3QodHlwZW9mIGFyZykpIHtcbiAgICBidWYgPSBidWZmZXIoZ2VuZXJhdGUoYXJnKSk7XG4gIH1cblxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgXCJpZFwiLCB7XG4gICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseSh0aGlzLCBidWYpOyB9XG4gIH0pO1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgXCJzdHJcIiwge1xuICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBidWYubWFwKGhleC5iaW5kKHRoaXMsIDIpKS5qb2luKCcnKTsgfVxuICB9KTtcbn1cbm1vZHVsZS5leHBvcnRzID0gT2JqZWN0SUQ7XG5PYmplY3RJRC5nZW5lcmF0ZSA9IGdlbmVyYXRlO1xuT2JqZWN0SUQuZGVmYXVsdCA9IE9iamVjdElEO1xuXG4vKipcbiAqIENyZWF0ZXMgYW4gT2JqZWN0SUQgZnJvbSBhIHNlY29uZCBiYXNlZCBudW1iZXIsIHdpdGggdGhlIHJlc3Qgb2YgdGhlIE9iamVjdElEIHplcm9lZCBvdXQuIFVzZWQgZm9yIGNvbXBhcmlzb25zIG9yIHNvcnRpbmcgdGhlIE9iamVjdElELlxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB0aW1lIGFuIGludGVnZXIgbnVtYmVyIHJlcHJlc2VudGluZyBhIG51bWJlciBvZiBzZWNvbmRzLlxuICogQHJldHVybiB7T2JqZWN0SUR9IHJldHVybiB0aGUgY3JlYXRlZCBPYmplY3RJRFxuICogQGFwaSBwdWJsaWNcbiAqL1xuT2JqZWN0SUQuY3JlYXRlRnJvbVRpbWUgPSBmdW5jdGlvbih0aW1lKXtcbiAgdGltZSA9IHBhcnNlSW50KHRpbWUsIDEwKSAlIDB4RkZGRkZGRkY7XG4gIHJldHVybiBuZXcgT2JqZWN0SUQoaGV4KDgsdGltZSkrXCIwMDAwMDAwMDAwMDAwMDAwXCIpO1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIGFuIE9iamVjdElEIGZyb20gYSBoZXggc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIGFuIE9iamVjdElELlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBoZXhTdHJpbmcgY3JlYXRlIGEgT2JqZWN0SUQgZnJvbSBhIHBhc3NlZCBpbiAyNCBieXRlIGhleHN0cmluZy5cbiAqIEByZXR1cm4ge09iamVjdElEfSByZXR1cm4gdGhlIGNyZWF0ZWQgT2JqZWN0SURcbiAqIEBhcGkgcHVibGljXG4gKi9cbk9iamVjdElELmNyZWF0ZUZyb21IZXhTdHJpbmcgPSBmdW5jdGlvbihoZXhTdHJpbmcpIHtcbiAgaWYoIU9iamVjdElELmlzVmFsaWQoaGV4U3RyaW5nKSlcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIE9iamVjdElEIGhleCBzdHJpbmdcIik7XG5cbiAgcmV0dXJuIG5ldyBPYmplY3RJRChoZXhTdHJpbmcpO1xufTtcblxuLyoqXG4gKiBDaGVja3MgaWYgYSB2YWx1ZSBpcyBhIHZhbGlkIGJzb24gT2JqZWN0SWRcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gb2JqZWN0aWQgQ2FuIGJlIGEgMjQgYnl0ZSBoZXggc3RyaW5nIG9yIGFuIGluc3RhbmNlIG9mIE9iamVjdElELlxuICogQHJldHVybiB7Qm9vbGVhbn0gcmV0dXJuIHRydWUgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgYnNvbiBPYmplY3RJRCwgcmV0dXJuIGZhbHNlIG90aGVyd2lzZS5cbiAqIEBhcGkgcHVibGljXG4gKlxuICogVEhFIE5BVElWRSBET0NVTUVOVEFUSU9OIElTTidUIENMRUFSIE9OIFRISVMgR1VZIVxuICogaHR0cDovL21vbmdvZGIuZ2l0aHViLmlvL25vZGUtbW9uZ29kYi1uYXRpdmUvYXBpLWJzb24tZ2VuZXJhdGVkL29iamVjdGlkLmh0bWwjb2JqZWN0aWQtaXN2YWxpZFxuICovXG5PYmplY3RJRC5pc1ZhbGlkID0gZnVuY3Rpb24ob2JqZWN0aWQpIHtcbiAgaWYoIW9iamVjdGlkKSByZXR1cm4gZmFsc2U7XG5cbiAgLy9jYWxsIC50b1N0cmluZygpIHRvIGdldCB0aGUgaGV4IGlmIHdlJ3JlXG4gIC8vIHdvcmtpbmcgd2l0aCBhbiBpbnN0YW5jZSBvZiBPYmplY3RJRFxuICByZXR1cm4gL15bMC05QS1GXXsyNH0kL2kudGVzdChvYmplY3RpZC50b1N0cmluZygpKTtcbn07XG5cbi8qKlxuICogc2V0IGEgY3VzdG9tIG1hY2hpbmVJRFxuICogXG4gKiBAcGFyYW0ge1N0cmluZ3xOdW1iZXJ9IG1hY2hpbmVpZCBDYW4gYmUgYSBzdHJpbmcsIGhleC1zdHJpbmcgb3IgYSBudW1iZXJcbiAqIEByZXR1cm4ge3ZvaWR9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5PYmplY3RJRC5zZXRNYWNoaW5lSUQgPSBmdW5jdGlvbihhcmcpIHtcbiAgdmFyIG1hY2hpbmVJRDtcblxuICBpZih0eXBlb2YgYXJnID09PSBcInN0cmluZ1wiKSB7XG4gICAgLy8gaGV4IHN0cmluZ1xuICAgIG1hY2hpbmVJRCA9IHBhcnNlSW50KGFyZywgMTYpO1xuICAgXG4gICAgLy8gYW55IHN0cmluZ1xuICAgIGlmKGlzTmFOKG1hY2hpbmVJRCkpIHtcbiAgICAgIGFyZyA9ICgnMDAwMDAwJyArIGFyZykuc3Vic3RyKC03LDYpO1xuXG4gICAgICBtYWNoaW5lSUQgPSBcIlwiO1xuICAgICAgZm9yKHZhciBpID0gMDtpPDY7IGkrKykge1xuICAgICAgICBtYWNoaW5lSUQgKz0gKGFyZy5jaGFyQ29kZUF0KGkpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgZWxzZSBpZigvbnVtYmVyfHVuZGVmaW5lZC8udGVzdCh0eXBlb2YgYXJnKSkge1xuICAgIG1hY2hpbmVJRCA9IGFyZyB8IDA7XG4gIH1cblxuICBNQUNISU5FX0lEID0gKG1hY2hpbmVJRCAmIDB4RkZGRkZGKTtcbn1cblxuLyoqXG4gKiBnZXQgdGhlIG1hY2hpbmVJRFxuICogXG4gKiBAcmV0dXJuIHtudW1iZXJ9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5PYmplY3RJRC5nZXRNYWNoaW5lSUQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIE1BQ0hJTkVfSUQ7XG59XG5cbk9iamVjdElELnByb3RvdHlwZSA9IHtcbiAgX2Jzb250eXBlOiAnT2JqZWN0SUQnLFxuICBjb25zdHJ1Y3RvcjogT2JqZWN0SUQsXG5cbiAgLyoqXG4gICAqIFJldHVybiB0aGUgT2JqZWN0SUQgaWQgYXMgYSAyNCBieXRlIGhleCBzdHJpbmcgcmVwcmVzZW50YXRpb25cbiAgICpcbiAgICogQHJldHVybiB7U3RyaW5nfSByZXR1cm4gdGhlIDI0IGJ5dGUgaGV4IHN0cmluZyByZXByZXNlbnRhdGlvbi5cbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIHRvSGV4U3RyaW5nOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5zdHI7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbXBhcmVzIHRoZSBlcXVhbGl0eSBvZiB0aGlzIE9iamVjdElEIHdpdGggYG90aGVySURgLlxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3RoZXIgT2JqZWN0SUQgaW5zdGFuY2UgdG8gY29tcGFyZSBhZ2FpbnN0LlxuICAgKiBAcmV0dXJuIHtCb29sZWFufSB0aGUgcmVzdWx0IG9mIGNvbXBhcmluZyB0d28gT2JqZWN0SUQnc1xuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgZXF1YWxzOiBmdW5jdGlvbiAob3RoZXIpe1xuICAgIHJldHVybiAhIW90aGVyICYmIHRoaXMuc3RyID09PSBvdGhlci50b1N0cmluZygpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBnZW5lcmF0aW9uIGRhdGUgKGFjY3VyYXRlIHVwIHRvIHRoZSBzZWNvbmQpIHRoYXQgdGhpcyBJRCB3YXMgZ2VuZXJhdGVkLlxuICAgKlxuICAgKiBAcmV0dXJuIHtEYXRlfSB0aGUgZ2VuZXJhdGlvbiBkYXRlXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBnZXRUaW1lc3RhbXA6IGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIG5ldyBEYXRlKHBhcnNlSW50KHRoaXMuc3RyLnN1YnN0cigwLDgpLCAxNikgKiAxMDAwKTtcbiAgfVxufTtcblxuZnVuY3Rpb24gbmV4dCgpIHtcbiAgcmV0dXJuIGluZGV4ID0gKGluZGV4KzEpICUgMHhGRkZGRkY7XG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlKHRpbWUpIHtcbiAgaWYgKHR5cGVvZiB0aW1lICE9PSAnbnVtYmVyJylcbiAgICB0aW1lID0gRGF0ZS5ub3coKS8xMDAwO1xuXG4gIC8va2VlcCBpdCBpbiB0aGUgcmluZyFcbiAgdGltZSA9IHBhcnNlSW50KHRpbWUsIDEwKSAlIDB4RkZGRkZGRkY7XG5cbiAgLy9GRkZGRkZGRiBGRkZGRkYgRkZGRiBGRkZGRkZcbiAgcmV0dXJuIGhleCg4LHRpbWUpICsgaGV4KDYsTUFDSElORV9JRCkgKyBoZXgoNCxwaWQpICsgaGV4KDYsbmV4dCgpKTtcbn1cblxuZnVuY3Rpb24gaGV4KGxlbmd0aCwgbikge1xuICBuID0gbi50b1N0cmluZygxNik7XG4gIHJldHVybiAobi5sZW5ndGg9PT1sZW5ndGgpPyBuIDogXCIwMDAwMDAwMFwiLnN1YnN0cmluZyhuLmxlbmd0aCwgbGVuZ3RoKSArIG47XG59XG5cbmZ1bmN0aW9uIGJ1ZmZlcihzdHIpIHtcbiAgdmFyIGk9MCxvdXQ9W107XG5cbiAgaWYoc3RyLmxlbmd0aD09PTI0KVxuICAgIGZvcig7aTwyNDsgb3V0LnB1c2gocGFyc2VJbnQoc3RyW2ldK3N0cltpKzFdLCAxNikpLGkrPTIpO1xuXG4gIGVsc2UgaWYoc3RyLmxlbmd0aD09PTEyKVxuICAgIGZvcig7aTwxMjsgb3V0LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkpLGkrKyk7XG5cbiAgcmV0dXJuIG91dDtcbn1cblxuLyoqXG4gKiBDb252ZXJ0cyB0byBhIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiB0aGlzIElkLlxuICpcbiAqIEByZXR1cm4ge1N0cmluZ30gcmV0dXJuIHRoZSAyNCBieXRlIGhleCBzdHJpbmcgcmVwcmVzZW50YXRpb24uXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuT2JqZWN0SUQucHJvdG90eXBlLmluc3BlY3QgPSBmdW5jdGlvbigpIHsgcmV0dXJuIFwiT2JqZWN0SUQoXCIrdGhpcytcIilcIiB9O1xuT2JqZWN0SUQucHJvdG90eXBlLnRvSlNPTiA9IE9iamVjdElELnByb3RvdHlwZS50b0hleFN0cmluZztcbk9iamVjdElELnByb3RvdHlwZS50b1N0cmluZyA9IE9iamVjdElELnByb3RvdHlwZS50b0hleFN0cmluZztcbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhclRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgfVxufSAoKSlcbmZ1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKSB7XG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRTZXRUaW1lb3V0ID09PSBkZWZhdWx0U2V0VGltb3V0IHx8ICFjYWNoZWRTZXRUaW1lb3V0KSAmJiBzZXRUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIC8vIGlmIGNsZWFyVGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZE9uY2VMaXN0ZW5lciA9IG5vb3A7XG5cbnByb2Nlc3MubGlzdGVuZXJzID0gZnVuY3Rpb24gKG5hbWUpIHsgcmV0dXJuIFtdIH1cblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbi8vLyDjgrPjg5/jgafjgZnjgIJcbmNvbnN0IEtPTUkgPSBleHBvcnRzLktPTUkgPSA3LjA7XG5cbi8vLyDnooHnm6Tjga7jgrXjgqTjgrrjgafjgZnjgIJcbmNvbnN0IEJTSVpFID0gZXhwb3J0cy5CU0laRSA9IDk7XG5cbi8vLyDlpJbmnqDjgpLmjIHjgaTmi6HlvLXnooHnm6Tjga7jgrXjgqTjgrrjgafjgZnjgIJcbmNvbnN0IEVCU0laRSA9IGV4cG9ydHMuRUJTSVpFID0gQlNJWkUgKyAyO1xuXG4vLy8g56KB55uk44Gu5Lqk54K544Gu5pWw44Gn44GZ44CCXG5jb25zdCBCVkNOVCA9IGV4cG9ydHMuQlZDTlQgPSBCU0laRSAqIEJTSVpFO1xuXG4vLy8g5ouh5by156KB55uk44Gu5Lqk54K544Gu5pWw44Gn44GZ44CCXG5jb25zdCBFQlZDTlQgPSBleHBvcnRzLkVCVkNOVCA9IEVCU0laRSAqIEVCU0laRTtcblxuLy8vIOODkeOCueOCkuihqOOBmee3muW9ouW6p+aomeOBp+OBmeOAgumAmuW4uOOBruedgOaJi+OBr+aLoeW8teeigeebpOOBrue3muW9ouW6p+aomeOBp+ihqOOBl+OBvuOBmeOAglxuLy8gVE9ETyAtIOedgOaJi+OBruOBn+OCgeOBq+WIl+aMmeWei+OCkuS9nOOBo+OBn+OBu+OBhuOBjOmWouaVsOOBruOCt+OCsOODi+ODgeODo+OBr+iqreOBv+OChOOBmeOBhOOAglxuY29uc3QgUEFTUyA9IGV4cG9ydHMuUEFTUyA9IEVCVkNOVDtcblxuLy8vIOe3muW9ouW6p+aomeOBruODl+ODrOODvOOCueODm+ODq+ODgOODvOOBruacquS9v+eUqOOCkuekuuOBmeWApOOBp+OBmeOAglxuLy8gVE9ETyAtIOipsuW9k+OBmeOCi+WgtOaJgOOBq09wdGlvbjx1c2l6ZT7jgpLkvb/jgaPjgZ/jgbvjgYbjgYzplqLmlbDjga7jgrfjgrDjg4vjg4Hjg6Pjga/oqq3jgb/jgoTjgZnjgYTjgIJcbmNvbnN0IFZOVUxMID0gZXhwb3J0cy5WTlVMTCA9IEVCVkNOVCArIDE7XG5cbi8vLyBOTuOBuOOBruWFpeWKm+OBq+mWouOBmeOCi+WxpeattOOBrua3seOBleOBp+OBmeOAglxuY29uc3QgS0VFUF9QUkVWX0NOVCA9IGV4cG9ydHMuS0VFUF9QUkVWX0NOVCA9IDI7XG5cbi8vLyBOTuOBuOOBruWFpeWKm+ODleOCo+ODvOODgeODo+ODvOOBruaVsOOBp+OBmeOAglxuY29uc3QgRkVBVFVSRV9DTlQgPSBleHBvcnRzLkZFQVRVUkVfQ05UID0gS0VFUF9QUkVWX0NOVCAqIDIgKyAzOyAvLyA3IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLlhfTEFCRUxTID0gdW5kZWZpbmVkO1xuZXhwb3J0cy5tb3ZlMnh5ID0gbW92ZTJ4eTtcbmV4cG9ydHMuZXYyeHkgPSBldjJ4eTtcbmV4cG9ydHMueHkyZXYgPSB4eTJldjtcbmV4cG9ydHMucnYyZXYgPSBydjJldjtcbmV4cG9ydHMuZXYycnYgPSBldjJydjtcbmV4cG9ydHMuZXYyc3RyID0gZXYyc3RyO1xuZXhwb3J0cy5zdHIyZXYgPSBzdHIyZXY7XG5cbnZhciBfY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMuanMnKTtcblxuY29uc3QgWF9MQUJFTFMgPSBleHBvcnRzLlhfTEFCRUxTID0gJ0BBQkNERUZHSEpLTE1OT1BRUlNUJztcblxuZnVuY3Rpb24gbW92ZTJ4eShzKSB7XG4gICAgY29uc3QgT0ZGU0VUID0gJ2EnLmNoYXJDb2RlQXQoMCkgLSAxO1xuICAgIHJldHVybiBbcy5jaGFyQ29kZUF0KDApIC0gT0ZGU0VULCBfY29uc3RhbnRzLkJTSVpFICsgMSAtIChzLmNoYXJDb2RlQXQoMSkgLSBPRkZTRVQpXTtcbn1cblxuZnVuY3Rpb24gZXYyeHkoZXYpIHtcbiAgICByZXR1cm4gW2V2ICUgX2NvbnN0YW50cy5FQlNJWkUsIE1hdGguZmxvb3IoZXYgLyBfY29uc3RhbnRzLkVCU0laRSldO1xufVxuXG5mdW5jdGlvbiB4eTJldih4LCB5KSB7XG4gICAgcmV0dXJuIHkgKiBfY29uc3RhbnRzLkVCU0laRSArIHg7XG59XG5cbmZ1bmN0aW9uIHJ2MmV2KHJ2KSB7XG4gICAgcmV0dXJuIHJ2ID09PSBfY29uc3RhbnRzLkJWQ05UID8gX2NvbnN0YW50cy5QQVNTIDogcnYgJSBfY29uc3RhbnRzLkJTSVpFICsgMSArIE1hdGguZmxvb3IocnYgLyBfY29uc3RhbnRzLkJTSVpFICsgMSkgKiBfY29uc3RhbnRzLkVCU0laRTtcbn1cblxuZnVuY3Rpb24gZXYycnYoZXYpIHtcbiAgICByZXR1cm4gZXYgPT09IF9jb25zdGFudHMuUEFTUyA/IF9jb25zdGFudHMuQlZDTlQgOiBldiAlIF9jb25zdGFudHMuRUJTSVpFIC0gMSArIE1hdGguZmxvb3IoZXYgLyBfY29uc3RhbnRzLkVCU0laRSAtIDEpICogX2NvbnN0YW50cy5CU0laRTtcbn1cblxuZnVuY3Rpb24gZXYyc3RyKGV2KSB7XG4gICAgaWYgKGV2ID49IF9jb25zdGFudHMuUEFTUykge1xuICAgICAgICByZXR1cm4gJ3Bhc3MnO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IFt4LCB5XSA9IGV2Mnh5KGV2KTtcbiAgICAgICAgcmV0dXJuIFhfTEFCRUxTLmNoYXJBdCh4KSArIHkudG9TdHJpbmcoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHN0cjJldih2KSB7XG4gICAgY29uc3QgdlN0ciA9IHYudG9VcHBlckNhc2UoKTtcbiAgICBpZiAodlN0ciA9PT0gJ1BBU1MnIHx8IHZTdHIgPT09ICdSRVNJR04nKSB7XG4gICAgICAgIHJldHVybiBfY29uc3RhbnRzLlBBU1M7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgeCA9IFhfTEFCRUxTLmluZGV4T2YodlN0ci5jaGFyQXQoMCkpO1xuICAgICAgICBjb25zdCB5ID0gcGFyc2VJbnQodlN0ci5zbGljZSgxKSk7XG4gICAgICAgIHJldHVybiB4eTJldih4LCB5KTtcbiAgICB9XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgX3dvcmtlclJtaSA9IHJlcXVpcmUoJy4vd29ya2VyLXJtaS5qcycpO1xuXG52YXIgX25ldXJhbF9uZXR3b3JrID0gcmVxdWlyZSgnLi9uZXVyYWxfbmV0d29yay5qcycpO1xuXG52YXIgX2Nvb3JkX2NvbnZlcnQgPSByZXF1aXJlKCcuL2Nvb3JkX2NvbnZlcnQuanMnKTtcblxudmFyIF9jb25zdGFudHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cy5qcycpO1xuXG52YXIgX3NwZWVjaCA9IHJlcXVpcmUoJy4vc3BlZWNoLmpzJyk7XG5cbmNsYXNzIEE5RW5naW5lIGV4dGVuZHMgX3dvcmtlclJtaS5Xb3JrZXJSTUkge1xuICAgIGFzeW5jIGxvYWROTigpIHtcbiAgICAgICAgYXdhaXQgdGhpcy5pbnZva2VSTSgnbG9hZE5OJyk7XG4gICAgfVxuXG4gICAgYXN5bmMgY2xlYXIoKSB7XG4gICAgICAgIGF3YWl0IHRoaXMuc3RvcFBvbmRlcigpO1xuICAgICAgICBhd2FpdCB0aGlzLmludm9rZVJNKCdjbGVhcicpO1xuICAgIH1cblxuICAgIGFzeW5jIHRpbWVTZXR0aW5ncyhtYWluVGltZSwgYnlveW9taSkge1xuICAgICAgICBhd2FpdCB0aGlzLmludm9rZVJNKCd0aW1lU2V0dGluZ3MnLCBbbWFpblRpbWUsIGJ5b3lvbWldKTtcbiAgICB9XG5cbiAgICBhc3luYyBnZW5tb3ZlKCkge1xuICAgICAgICBjb25zdCBbbW92ZSwgd2luUmF0ZV0gPSBhd2FpdCB0aGlzLmJlc3RNb3ZlKCk7XG4gICAgICAgIGlmICh3aW5SYXRlIDwgMC4xKSB7XG4gICAgICAgICAgICByZXR1cm4gJ3Jlc2lnbic7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsYXkobW92ZSk7XG4gICAgICAgICAgICByZXR1cm4gKDAsIF9jb29yZF9jb252ZXJ0LmV2MnN0cikobW92ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyBwbGF5KGV2KSB7XG4gICAgICAgIGF3YWl0IHRoaXMuaW52b2tlUk0oJ3BsYXknLCBbZXZdKTtcbiAgICB9XG5cbiAgICBhc3luYyBiZXN0TW92ZSgpIHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuaW52b2tlUk0oJ2Jlc3RNb3ZlJyk7XG4gICAgfVxuXG4gICAgYXN5bmMgZmluYWxTY29yZSgpIHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuaW52b2tlUk0oJ2ZpbmFsU2NvcmUnKTtcbiAgICB9XG5cbiAgICBzdGFydFBvbmRlcigpIHtcbiAgICAgICAgdGhpcy5wb25kZXJQcm9taXNlID0gdGhpcy5pbnZva2VSTSgncG9uZGVyJyk7XG4gICAgfVxuXG4gICAgYXN5bmMgc3RvcFBvbmRlcigpIHtcbiAgICAgICAgaWYgKHRoaXMucG9uZGVyUHJvbWlzZSkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5pbnZva2VSTSgnc3RvcFBvbmRlcicpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wb25kZXJQcm9taXNlO1xuICAgICAgICAgICAgdGhpcy5wb25kZXJQcm9taXNlID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cbn0gLyogZ2xvYmFsICQgSkdPIEJvYXJkQ29udHJvbGxlciAqL1xuXG5cbmNsYXNzIFBsYXlDb250cm9sbGVyIHtcbiAgICBjb25zdHJ1Y3RvcihlbmdpbmUsIGJvYXJkLCBpZ29RdWVzdCA9IGZhbHNlKSB7XG4gICAgICAgIHRoaXMuZW5naW5lID0gZW5naW5lO1xuICAgICAgICB0aGlzLmJvYXJkID0gYm9hcmQ7XG4gICAgICAgIHRoaXMuaXNTZWxmUGxheSA9IGZhbHNlO1xuICAgICAgICBpZiAoaWdvUXVlc3QpIHtcbiAgICAgICAgICAgIHRoaXMudGltZUxlZnQgPSBbMCwgLy8gZHVteVxuICAgICAgICAgICAgKDMgKiA2MCArIDEpICogMTAwMCwgLy8gYmxhY2tcbiAgICAgICAgICAgIDMgKiA2MCAqIDEwMDBdO1xuICAgICAgICAgICAgaWYgKGlnb1F1ZXN0KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGFydCA9IERhdGUubm93KCk7XG4gICAgICAgICAgICAgICAgdGhpcy50aW1lciA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RhcnQgPSBEYXRlLm5vdygpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVMZWZ0W3RoaXMuYm9hcmQudHVybl0gLT0gc3RhcnQgLSB0aGlzLnN0YXJ0O1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0YXJ0ID0gc3RhcnQ7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmJvYXJkLnR1cm4gPT0gdGhpcy5ib2FyZC5vd25Db2xvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgJCgnI3lvdXItdGltZScpLnRleHQoTWF0aC5jZWlsKHRoaXMudGltZUxlZnRbdGhpcy5ib2FyZC50dXJuXSAvIDEwMDApKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICQoJyNhaS10aW1lJykudGV4dChNYXRoLmNlaWwodGhpcy50aW1lTGVmdFt0aGlzLmJvYXJkLnR1cm5dIC8gMTAwMCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnRpbWVMZWZ0W3RoaXMuYm9hcmQudHVybl0gPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKHRoaXMudGltZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lciA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICBhbGVydCgn5pmC6ZaT5YiH44KM44Gn44GZJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgY2xlYXJUaW1lcigpIHtcbiAgICAgICAgaWYgKHRoaXMudGltZXIpIHtcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy50aW1lcik7XG4gICAgICAgICAgICB0aGlzLnRpbWVyID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cbiAgICBzZXRJc1NlbGZQbGF5KGlzU2VsZlBsYXkpIHtcbiAgICAgICAgdGhpcy5pc1NlbGZQbGF5ID0gaXNTZWxmUGxheTtcbiAgICB9XG4gICAgYXN5bmMgdXBkYXRlKGNvb3JkKSB7XG4gICAgICAgIGlmIChjb29yZCA9PT0gJ2VuZCcpIHtcbiAgICAgICAgICAgIHRoaXMuY2xlYXJUaW1lcigpO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCBzY29yZSA9IGF3YWl0IHRoaXMuZmluYWxTY29yZSgpO1xuICAgICAgICAgICAgICAgIGxldCBtZXNzYWdlID0gc2NvcmUgPT09IDAgPyAn5oyB56KBJyA6IHNjb3JlID4gMCA/IGDpu5Ike3Njb3JlfeebruWLneOBoWAgOiBg55m9JHstc2NvcmV955uu5Yud44GhYDtcbiAgICAgICAgICAgICAgICBtZXNzYWdlICs9ICfjgafjgZnjgYvvvJ8nO1xuICAgICAgICAgICAgICAgICgwLCBfc3BlZWNoLnNwZWFrKShtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgYWxlcnQobWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgICAgICQoZG9jdW1lbnQuYm9keSkuYWRkQ2xhc3MoJ2VuZCcpO1xuICAgICAgICAgICAgICAgIH0sIDMwMDApO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGUpO1xuICAgICAgICAgICAgICAgICgwLCBfc3BlZWNoLnNwZWFrKSgn44GZ44G/44G+44Gb44KT44CB5pW05Zyw44Gn44GN44G+44Gb44KT44Gn44GX44GfJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5zdGFydCkge1xuICAgICAgICAgICAgdGhpcy50aW1lTGVmdFt0aGlzLmJvYXJkLnR1cm5dICs9IDEwMDA7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXRoaXMuaXNTZWxmUGxheSAmJiB0eXBlb2YgY29vcmQgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmVuZ2luZS5zdG9wUG9uZGVyKCk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmVuZ2luZS5wbGF5KCgwLCBfY29vcmRfY29udmVydC54eTJldikoY29vcmQuaSArIDEsIF9jb25zdGFudHMuQlNJWkUgLSBjb29yZC5qKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuaXNTZWxmUGxheSB8fCB0aGlzLmJvYXJkLnR1cm4gIT09IHRoaXMuYm9hcmQub3duQ29sb3IpIHtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IG1vdmUgPSBhd2FpdCB0aGlzLmVuZ2luZS5nZW5tb3ZlKCk7XG4gICAgICAgICAgICAgICAgc3dpdGNoIChtb3ZlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3Jlc2lnbic6XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNsZWFyVGltZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICgwLCBfc3BlZWNoLnNwZWFrKSgn6LKg44GR44G+44GX44GfJywgJ2phLWpwJywgJ2ZlbWFsZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgJChkb2N1bWVudC5ib2R5KS5hZGRDbGFzcygnZW5kJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAncGFzcyc6XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJvYXJkLnBsYXkobnVsbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAoMCwgX3NwZWVjaC5zcGVhaykoJ+ODkeOCueOBl+OBvuOBmScsICdqYS1qcCcsICdmZW1hbGUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGV2ID0gKDAsIF9jb29yZF9jb252ZXJ0LnN0cjJldikobW92ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgeHkgPSAoMCwgX2Nvb3JkX2NvbnZlcnQuZXYyeHkpKGV2KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJvYXJkLnBsYXkobmV3IEpHTy5Db29yZGluYXRlKHh5WzBdIC0gMSwgX2NvbnN0YW50cy5CU0laRSAtIHh5WzFdKSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgMCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmVuZ2luZS5zdGFydFBvbmRlcigpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYXN5bmMgcGFzcygpIHtcbiAgICAgICAgaWYgKHRoaXMuYm9hcmQub3duQ29sb3IgPT09IHRoaXMuYm9hcmQudHVybikge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5lbmdpbmUuc3RvcFBvbmRlcigpO1xuICAgICAgICAgICAgdGhpcy5lbmdpbmUucGxheShfY29uc3RhbnRzLlBBU1MpO1xuICAgICAgICAgICAgdGhpcy5ib2FyZC5wbGF5KG51bGwpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYXN5bmMgZmluYWxTY29yZSgpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgJC5wb3N0KHtcbiAgICAgICAgICAgIHVybDogJ2h0dHA6Ly8zNS4yMDMuMTYxLjEwMC9nbnVnbycsXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgc2dmOiB0aGlzLmJvYXJkLmpyZWNvcmQudG9TZ2YoKSxcbiAgICAgICAgICAgICAgICBtb3ZlOiAnZXN0JyxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdhZnRlcm1hdGgnLFxuICAgICAgICAgICAgICAgIHJ1bGU6ICdqYXBhbmVzZSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmICgvSmlnby8udGVzdChyZXN1bHQpKSB7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBtYXRjaCA9IHJlc3VsdC5tYXRjaCgvKEJsYWNrfFdoaXRlKSB3aW5zIGJ5IChbMC05Ll0rKSBwb2ludHMvKTtcbiAgICAgICAgaWYgKG1hdGNoKSB7XG4gICAgICAgICAgICBsZXQgc2NvcmUgPSBwYXJzZUZsb2F0KG1hdGNoWzJdKTtcbiAgICAgICAgICAgIGlmIChtYXRjaFsxXSA9PT0gJ0JsYWNrJykge1xuICAgICAgICAgICAgICAgIHJldHVybiBzY29yZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIC1zY29yZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgfVxuXG59XG5cbmFzeW5jIGZ1bmN0aW9uIG1haW4oKSB7XG4gICAgY29uc3QgYm9hcmQgPSBhd2FpdCBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzLCByZWopIHtcbiAgICAgICAgbmV3IEJvYXJkQ29udHJvbGxlcihfY29uc3RhbnRzLkJTSVpFLCAwLCByZXMpO1xuICAgIH0pO1xuICAgIC8vIEpHT+OBruODrOODs+ODgOODquODs+OCsOOCkuWujOS6huOBleOBm+OCi+OBn+OCgeOBq3NldFRpbWVvdXTjgafjgqTjg5njg7Pjg4jjg6vjg7zjg5fjgpLpgLLjgoHjgotcbiAgICBzZXRUaW1lb3V0KGFzeW5jIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IGVuZ2luZS5sb2FkTk4oKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgaWYgKGUubWVzc2FnZSA9PT0gJ05vIGJhY2tlbmQgaXMgYXZhaWxhYmxlJykge1xuICAgICAgICAgICAgICAgIGlmICgvKE1hYyBPUyBYIDEwXzEzfChpUGFkfGlQaG9uZXxpUG9kKTsgQ1BVIE9TIDExKS4qU2FmYXJpLy50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpICYmICEvQ2hyb21lLy50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpKSB7XG4gICAgICAgICAgICAgICAgICAgICgwLCBfc3BlZWNoLnNwZWFrKSgn5q6L5b+144Gq44GM44KJ44GK5L2/44GE44Gu44OW44Op44Km44K244Gn44Gv5YuV44GN44G+44Gb44KT44CCU2FmYXJp44KS44GK5L2/44GE44Gn44GZ44Gt44CC44CM6ZaL55m644CN44Oh44OL44Ol44O844Gu44CM5a6f6aiT55qE44Gq5qmf6IO944CN44Gn44CMV2ViR1BV44CN44KS5pyJ5Yq544Gr44GZ44KL44Go5YuV44GP44GL44KC44GX44KM44G+44Gb44KTJywgJ2phLWpwJywgJ2ZlbWFsZScpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoISgwLCBfc3BlZWNoLnNwZWFrKSgn5q6L5b+144Gq44GM44KJ44GK5L2/44GE44Gu44OW44Op44Km44K244Gn44Gv5YuV44GN44G+44Gb44KTJywgJ2phLWpwJywgJ2ZlbWFsZScpKSB7XG4gICAgICAgICAgICAgICAgICAgIGFsZXJ0KCfmrovlv7XjgarjgYzjgonjgYrkvb/jgYTjga7jg5bjg6njgqbjgrbjgafjga/li5XjgY3jgb7jgZvjgpMnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY29uZGl0aW9uID0gYXdhaXQgbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlcywgcmVqKSB7XG4gICAgICAgICAgICBjb25zdCAkc3RhcnRNb2RhbCA9ICQoJyNzdGFydC1tb2RhbCcpO1xuICAgICAgICAgICAgJHN0YXJ0TW9kYWwubW9kYWwoJ3Nob3cnKTtcbiAgICAgICAgICAgICRzdGFydE1vZGFsLm9uZSgnaGlkZGVuLmJzLm1vZGFsJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkY29uZGl0aW9uRm9ybSA9ICQoJyNjb25kaXRpb24tZm9ybScpO1xuICAgICAgICAgICAgICAgIHJlcyh7XG4gICAgICAgICAgICAgICAgICAgIGNvbG9yOiAkY29uZGl0aW9uRm9ybVswXVsnY29sb3InXS52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgdGltZVJ1bGU6ICRjb25kaXRpb25Gb3JtWzBdWyd0aW1lJ10udmFsdWUsXG4gICAgICAgICAgICAgICAgICAgIHRpbWU6IHBhcnNlSW50KCRjb25kaXRpb25Gb3JtWzBdWydhaS1ieW95b21pJ10udmFsdWUpXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHN3aXRjaCAoY29uZGl0aW9uLnRpbWVSdWxlKSB7XG4gICAgICAgICAgICBjYXNlICdhaS10aW1lJzpcbiAgICAgICAgICAgICAgICBhd2FpdCBlbmdpbmUudGltZVNldHRpbmdzKDAsIGNvbmRpdGlvbi50aW1lKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2lnby1xdWVzdCc6XG4gICAgICAgICAgICAgICAgYXdhaXQgZW5naW5lLnRpbWVTZXR0aW5ncygzICogNjAgKyA1NSwgMSk7IC8vIDnot6/nm6Tjga/lubPlnYfmiYvmlbDjgYwxMTDmiYvjgonjgZfjgYTjga7jgafjgIE1NeOBruODleOCo+ODg+OCt+ODo+ODvOenkuOCkui/veWKoFxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGJvYXJkLnNldE93bkNvbG9yKGNvbmRpdGlvbi5jb2xvciA9PT0gJ1cnID8gSkdPLldISVRFIDogSkdPLkJMQUNLKTtcbiAgICAgICAgY29uc3QgY29udHJvbGxlciA9IG5ldyBQbGF5Q29udHJvbGxlcihlbmdpbmUsIGJvYXJkLCBjb25kaXRpb24udGltZVJ1bGUgPT09ICdpZ28tcXVlc3QnKTtcbiAgICAgICAgY29uc3QgaXNTZWxmUGxheSA9IGNvbmRpdGlvbi5jb2xvciA9PT0gJ3NlbGYtcGxheSc7XG4gICAgICAgIGlmICghaXNTZWxmUGxheSkge1xuICAgICAgICAgICAgKDAsIF9zcGVlY2guc3BlYWspKCfjgYrpoZjjgYTjgZfjgb7jgZknLCAnamEtanAnLCAnZmVtYWxlJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29udHJvbGxlci5zZXRJc1NlbGZQbGF5KGlzU2VsZlBsYXkpO1xuICAgICAgICBib2FyZC5hZGRPYnNlcnZlcihjb250cm9sbGVyKTtcbiAgICAgICAgJCgnI3Bhc3MnKS5vbignY2xpY2snLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIGNvbnRyb2xsZXIucGFzcygpO1xuICAgICAgICB9KTtcbiAgICAgICAgJCgnI3Jlc2lnbicpLm9uKCdjbGljaycsIGFzeW5jIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgYm9hcmQuY2xlYXJUaW1lcigpO1xuICAgICAgICAgICAgYXdhaXQgZW5naW5lLnN0b3BQb25kZXIoKTtcbiAgICAgICAgICAgICgwLCBfc3BlZWNoLnNwZWFrKSgn44GC44KK44GM44Go44GG44GU44GW44GE44G+44GX44GfJywgJ2phLWpwJywgJ2ZlbWFsZScpO1xuICAgICAgICAgICAgJChkb2N1bWVudC5ib2R5KS5hZGRDbGFzcygnZW5kJyk7XG4gICAgICAgIH0pO1xuICAgICAgICAkKCcjcmV0cnknKS5vbmUoJ2NsaWNrJywgYXN5bmMgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAkKCcjcGFzcycpLm9mZignY2xpY2snKTtcbiAgICAgICAgICAgICQoJyNyZXNpZ24nKS5vZmYoJ2NsaWNrJyk7XG4gICAgICAgICAgICBib2FyZC5kZXN0cm95KCk7XG4gICAgICAgICAgICBlbmdpbmUuY2xlYXIoKTtcbiAgICAgICAgICAgICQoZG9jdW1lbnQuYm9keSkucmVtb3ZlQ2xhc3MoJ2VuZCcpO1xuICAgICAgICAgICAgc2V0VGltZW91dChtYWluLCAwKTtcbiAgICAgICAgfSk7XG4gICAgfSwgMCk7XG59XG5cbmNvbnN0IHdvcmtlciA9IG5ldyBXb3JrZXIoJ2pzL3dvcmtlci5qcycpO1xuKDAsIF93b3JrZXJSbWkucmVzaWd0ZXJXb3JrZXJSTUkpKHdvcmtlciwgX25ldXJhbF9uZXR3b3JrLk5ldXJhbE5ldHdvcmspO1xuY29uc3QgZW5naW5lID0gbmV3IEE5RW5naW5lKHdvcmtlcik7XG5tYWluKCk7IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG4vKiBnbG9iYWwgV2ViRE5OICovXG5cbmlmICghQXJyYXlCdWZmZXIucHJvdG90eXBlLnNsaWNlKSB7XG4gICAgQXJyYXlCdWZmZXIucHJvdG90eXBlLnNsaWNlID0gZnVuY3Rpb24gKHN0YXJ0LCBlbmQpIHtcbiAgICAgICAgdmFyIHRoYXQgPSBuZXcgVWludDhBcnJheSh0aGlzKTtcbiAgICAgICAgaWYgKGVuZCA9PSB1bmRlZmluZWQpIGVuZCA9IHRoYXQubGVuZ3RoO1xuICAgICAgICB2YXIgcmVzdWx0ID0gbmV3IEFycmF5QnVmZmVyKGVuZCAtIHN0YXJ0KTtcbiAgICAgICAgdmFyIHJlc3VsdEFycmF5ID0gbmV3IFVpbnQ4QXJyYXkocmVzdWx0KTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCByZXN1bHRBcnJheS5sZW5ndGg7IGkrKykgcmVzdWx0QXJyYXlbaV0gPSB0aGF0W2kgKyBzdGFydF07XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbn1cblxuY2xhc3MgTmV1cmFsTmV0d29yayB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMubm4gPSBudWxsO1xuICAgIH1cblxuICAgIGFzeW5jIGxvYWQoKSB7XG4gICAgICAgIGlmICh0aGlzLm5uKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5ubiA9IGF3YWl0IFdlYkROTi5sb2FkKCcuL291dHB1dCcsIHsgYmFja2VuZE9yZGVyOiBbJ3dlYmdwdScsICd3ZWJnbCddIH0pO1xuICAgIH1cblxuICAgIGFzeW5jIGV2YWx1YXRlKC4uLmlucHV0cykge1xuICAgICAgICBjb25zdCB2aWV3cyA9IHRoaXMubm4uZ2V0SW5wdXRWaWV3cygpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGlucHV0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmlld3NbaV0uc2V0KGlucHV0c1tpXSk7XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgdGhpcy5ubi5ydW4oKTtcbiAgICAgICAgcmV0dXJuIHRoaXMubm4uZ2V0T3V0cHV0Vmlld3MoKS5tYXAoZSA9PiBlLnRvQWN0dWFsKCkuc2xpY2UoMCkpOyAvLyB0by5BY3R1YWzjgZ3jga7jgoLjga7jgafjga93b3JrZXLlgbTjgadkZXRhY2jjgYzjgafjgY3jgarjgYTmqKHmp5hcbiAgICB9XG59XG5leHBvcnRzLk5ldXJhbE5ldHdvcmsgPSBOZXVyYWxOZXR3b3JrOyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5zcGVhayA9IHNwZWFrO1xuZnVuY3Rpb24gc3BlYWsodGV4dCwgbGFuZywgZ2VuZGVyKSB7XG4gICAgaWYgKCFTcGVlY2hTeW50aGVzaXNVdHRlcmFuY2UpIHJldHVybiBmYWxzZTtcblxuICAgIHN3aXRjaCAobGFuZykge1xuICAgICAgICBjYXNlICdlbic6XG4gICAgICAgICAgICBsYW5nID0gJ2VuLXVzJztcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdqYSc6XG4gICAgICAgICAgICBsYW5nID0gJ2phLWpwJztcbiAgICAgICAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBjb25zdCB1dHRlcmFuY2UgPSBuZXcgU3BlZWNoU3ludGhlc2lzVXR0ZXJhbmNlKHRleHQpO1xuICAgIGlmICgvKGlQaG9uZXxpUGFkfGlQb2QpKD89LipPUyBbNy04XSkvLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCkpIHV0dGVyYW5jZS5yYXRlID0gMC4yO1xuICAgIGNvbnN0IHZvaWNlcyA9IHNwZWVjaFN5bnRoZXNpcy5nZXRWb2ljZXMoKS5maWx0ZXIoZSA9PiBlLmxhbmcudG9Mb3dlckNhc2UoKSA9PT0gbGFuZyk7XG4gICAgbGV0IHZvaWNlID0gbnVsbDtcbiAgICBpZiAodm9pY2VzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgbGV0IG5hbWVzID0gbnVsbDtcbiAgICAgICAgc3dpdGNoIChsYW5nKSB7XG4gICAgICAgICAgICBjYXNlICdqYS1qcCc6XG4gICAgICAgICAgICAgICAgc3dpdGNoIChnZW5kZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnbWFsZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lcyA9IFsnT3RveWEnLCAnSGF0dG9yaScsICdJY2hpcm8nXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdmZW1hbGUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZXMgPSBbJ08tcmVu77yI5ouh5by177yJJywgJ08tcmVuJywgJ0t5b2tvJywgJ0hhcnVrYSddOyAvLyBXaW5kb3dzIDEw44GuQXl1bWnjga7lo7Djga/ku4rjgbLjgajjgaRcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2VuLXVzJzpcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGdlbmRlcikge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdtYWxlJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWVzID0gWydBbGV4JywgJ0ZyZWQnXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdmZW1hbGUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZXMgPSBbJ1NhbWFudGhhJywgJ1ZpY3RvcmlhJ107XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5hbWVzKSB7XG4gICAgICAgICAgICB2b2ljZSA9IHZvaWNlcy5maWx0ZXIodiA9PiBuYW1lcy5zb21lKG4gPT4gdi5uYW1lLmluZGV4T2YobikgPj0gMCkpWzBdO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdm9pY2UpIHtcbiAgICAgICAgICAgIHZvaWNlID0gdm9pY2VzLmZpbHRlcih2ID0+IHYuZ2VuZGVyICYmIHYuZ2VuZGVyLnRvTG93ZXJDYXNlKCkgPT09IGdlbmRlcilbMF07XG4gICAgICAgIH1cbiAgICB9XG4gICAgdXR0ZXJhbmNlLnZvaWNlID0gdm9pY2UgfHwgdm9pY2VzWzBdO1xuICAgIC8vIGlPUyAxMCBTYWZhcmkgaGFzIGEgYnVnIHRoYXQgdXR0ZXJhbmNlLnZvaWNlIGlzIG5vIGVmZmVjdC5cbiAgICB1dHRlcmFuY2Uudm9sdW1lID0gcGFyc2VGbG9hdChsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgndm9sdW1lJykgfHwgJzEuMCcpO1xuICAgIHNwZWVjaFN5bnRoZXNpcy5zcGVhayh1dHRlcmFuY2UpO1xuICAgIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiB1bmxvY2soKSB7XG4gICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdW5sb2NrKTtcbiAgICBzcGVlY2hTeW50aGVzaXMuc3BlYWsobmV3IFNwZWVjaFN5bnRoZXNpc1V0dGVyYW5jZSgnJykpO1xufVxuXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIGZ1bmN0aW9uIChldmVudCkge1xuICAgIGlmIChzcGVlY2hTeW50aGVzaXMpIHtcbiAgICAgICAgc3BlZWNoU3ludGhlc2lzLmdldFZvaWNlcygpO1xuICAgICAgICBpZiAoc3BlZWNoU3ludGhlc2lzLm9udm9pY2VzY2hhbmdlZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBzcGVlY2hTeW50aGVzaXMub252b2ljZXNjaGFuZ2VkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdvbnZvaWNlc2NoYW5nZWQnKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdW5sb2NrLCBmYWxzZSk7IC8vIGZvciBpT1NcbiAgICB9XG59KTsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuV29ya2VyUk1JID0gdW5kZWZpbmVkO1xuZXhwb3J0cy5yZXNpZ3RlcldvcmtlclJNSSA9IHJlc2lndGVyV29ya2VyUk1JO1xuZXhwb3J0cy51bnJlc2lndGVyV29ya2VyUk1JID0gdW5yZXNpZ3RlcldvcmtlclJNSTtcblxudmFyIF9ic29uT2JqZWN0aWQgPSByZXF1aXJlKCdic29uLW9iamVjdGlkJyk7XG5cbnZhciBfYnNvbk9iamVjdGlkMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX2Jzb25PYmplY3RpZCk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbmZ1bmN0aW9uIGdldFRyYW5zZmVyTGlzdChvYmosIGxpc3QgPSBbXSkge1xuICAgIGlmIChBcnJheUJ1ZmZlci5pc1ZpZXcob2JqKSkge1xuICAgICAgICBsaXN0LnB1c2gob2JqLmJ1ZmZlcik7XG4gICAgICAgIHJldHVybiBsaXN0O1xuICAgIH1cbiAgICBpZiAoaXNUcmFuc2ZlcmFibGUob2JqKSkge1xuICAgICAgICBsaXN0LnB1c2gob2JqKTtcbiAgICAgICAgcmV0dXJuIGxpc3Q7XG4gICAgfVxuICAgIGlmICghKHR5cGVvZiBvYmogPT09ICdvYmplY3QnKSkge1xuICAgICAgICByZXR1cm4gbGlzdDtcbiAgICB9XG4gICAgZm9yIChjb25zdCBwcm9wIGluIG9iaikge1xuICAgICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KHByb3ApKSB7XG4gICAgICAgICAgICBnZXRUcmFuc2Zlckxpc3Qob2JqW3Byb3BdLCBsaXN0KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbGlzdDtcbn1cblxuZnVuY3Rpb24gaXNUcmFuc2ZlcmFibGUoaW5zdGFuY2UpIHtcbiAgICBjb25zdCB0cmFuc2ZlcmFibGUgPSBbQXJyYXlCdWZmZXJdO1xuICAgIGlmICh0eXBlb2YgTWVzc2FnZVBvcnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHRyYW5zZmVyYWJsZS5wdXNoKE1lc3NhZ2VQb3J0KTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBJbWFnZUJpdG1hcCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgdHJhbnNmZXJhYmxlLnB1c2goSW1hZ2VCaXRtYXApO1xuICAgIH1cbiAgICByZXR1cm4gdHJhbnNmZXJhYmxlLnNvbWUoZSA9PiBpbnN0YW5jZSBpbnN0YW5jZW9mIGUpO1xufVxuXG5jbGFzcyBXb3JrZXJSTUkge1xuICAgIGNvbnN0cnVjdG9yKHJlbW90ZSwgLi4uYXJncykge1xuICAgICAgICB0aGlzLnJlbW90ZSA9IHJlbW90ZTtcbiAgICAgICAgdGhpcy5pZCA9ICgwLCBfYnNvbk9iamVjdGlkMi5kZWZhdWx0KSgpLnRvU3RyaW5nKCk7XG4gICAgICAgIHRoaXMubWV0aG9kU3RhdGVzID0ge307XG4gICAgICAgIHRoaXMucmVtb3RlLmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBldmVudCA9PiB7XG4gICAgICAgICAgICBjb25zdCBkYXRhID0gZXZlbnQuZGF0YTtcbiAgICAgICAgICAgIGlmIChkYXRhLmlkID09PSB0aGlzLmlkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZXR1cm5IYW5kbGVyKGRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBmYWxzZSk7XG4gICAgICAgIHRoaXMuY29uc3RydWN0b3JQcm9taXNlID0gdGhpcy5pbnZva2VSTSh0aGlzLmNvbnN0cnVjdG9yLm5hbWUsIGFyZ3MpO1xuICAgIH1cblxuICAgIGludm9rZVJNKG1ldGhvZE5hbWUsIGFyZ3MgPSBbXSkge1xuICAgICAgICBpZiAoIXRoaXMubWV0aG9kU3RhdGVzW21ldGhvZE5hbWVdKSB7XG4gICAgICAgICAgICB0aGlzLm1ldGhvZFN0YXRlc1ttZXRob2ROYW1lXSA9IHtcbiAgICAgICAgICAgICAgICBudW06IDAsXG4gICAgICAgICAgICAgICAgcmVzb2x2ZVJlamVjdHM6IHt9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBtZXRob2RTdGF0ZSA9IHRoaXMubWV0aG9kU3RhdGVzW21ldGhvZE5hbWVdO1xuICAgICAgICAgICAgbWV0aG9kU3RhdGUubnVtICs9IDE7XG4gICAgICAgICAgICBtZXRob2RTdGF0ZS5yZXNvbHZlUmVqZWN0c1ttZXRob2RTdGF0ZS5udW1dID0geyByZXNvbHZlLCByZWplY3QgfTtcbiAgICAgICAgICAgIHRoaXMucmVtb3RlLnBvc3RNZXNzYWdlKHtcbiAgICAgICAgICAgICAgICBpZDogdGhpcy5pZCxcbiAgICAgICAgICAgICAgICBtZXRob2ROYW1lLFxuICAgICAgICAgICAgICAgIG51bTogbWV0aG9kU3RhdGUubnVtLFxuICAgICAgICAgICAgICAgIGFyZ3NcbiAgICAgICAgICAgIH0sIGdldFRyYW5zZmVyTGlzdChhcmdzKSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybkhhbmRsZXIoZGF0YSkge1xuICAgICAgICBjb25zdCByZXNvbHZlUmVqZWN0cyA9IHRoaXMubWV0aG9kU3RhdGVzW2RhdGEubWV0aG9kTmFtZV0ucmVzb2x2ZVJlamVjdHM7XG4gICAgICAgIGlmIChkYXRhLmVycm9yKSB7XG4gICAgICAgICAgICByZXNvbHZlUmVqZWN0c1tkYXRhLm51bV0ucmVqZWN0KGRhdGEuZXJyb3IpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzb2x2ZVJlamVjdHNbZGF0YS5udW1dLnJlc29sdmUoZGF0YS5yZXN1bHQpO1xuICAgICAgICB9XG4gICAgICAgIGRlbGV0ZSByZXNvbHZlUmVqZWN0c1tkYXRhLm51bV07XG4gICAgfVxufVxuXG5leHBvcnRzLldvcmtlclJNSSA9IFdvcmtlclJNSTtcbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZVdvcmtlclJNSShldmVudCkge1xuICAgIGNvbnN0IGRhdGEgPSBldmVudC5kYXRhO1xuICAgIGNvbnN0IG1lc3NhZ2UgPSB7XG4gICAgICAgIGlkOiBkYXRhLmlkLFxuICAgICAgICBtZXRob2ROYW1lOiBkYXRhLm1ldGhvZE5hbWUsXG4gICAgICAgIG51bTogZGF0YS5udW1cbiAgICB9O1xuICAgIGxldCByZXN1bHQ7XG4gICAgaWYgKGRhdGEubWV0aG9kTmFtZSA9PT0gdGhpcy5uYW1lKSB7XG4gICAgICAgIHRoaXMud29ya2VyUk1JLmluc3RhbmNlc1tkYXRhLmlkXSA9IG5ldyB0aGlzKC4uLmRhdGEuYXJncyk7XG4gICAgICAgIG1lc3NhZ2UucmVzdWx0ID0gbnVsbDtcbiAgICAgICAgdGhpcy53b3JrZXJSTUkudGFyZ2V0LnBvc3RNZXNzYWdlKG1lc3NhZ2UsIGdldFRyYW5zZmVyTGlzdChyZXN1bHQpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHRoaXMud29ya2VyUk1JLmluc3RhbmNlc1tkYXRhLmlkXTtcbiAgICAgICAgaWYgKGluc3RhbmNlKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBhd2FpdCBpbnN0YW5jZVtkYXRhLm1ldGhvZE5hbWVdLmFwcGx5KGluc3RhbmNlLCBkYXRhLmFyZ3MpO1xuICAgICAgICAgICAgbWVzc2FnZS5yZXN1bHQgPSByZXN1bHQ7XG4gICAgICAgICAgICB0aGlzLndvcmtlclJNSS50YXJnZXQucG9zdE1lc3NhZ2UobWVzc2FnZSwgZ2V0VHJhbnNmZXJMaXN0KHJlc3VsdCkpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiByZXNpZ3RlcldvcmtlclJNSSh0YXJnZXQsIGtsYXNzKSB7XG4gICAga2xhc3Mud29ya2VyUk1JID0ge1xuICAgICAgICB0YXJnZXQsXG4gICAgICAgIGluc3RhbmNlczoge30sXG4gICAgICAgIGhhbmRsZXI6IGhhbmRsZVdvcmtlclJNSS5iaW5kKGtsYXNzKVxuICAgIH07XG4gICAgdGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBrbGFzcy53b3JrZXJSTUkuaGFuZGxlcik7XG59XG5cbmZ1bmN0aW9uIHVucmVzaWd0ZXJXb3JrZXJSTUkodGFyZ2V0LCBrbGFzcykge1xuICAgIHRhcmdldC5yZW1vdmVFdmVudExpc3RlbmVyKCdtZXNzYWdlJywga2xhc3Mud29ya2VyUk1JLmhhbmRsZXIpO1xuICAgIGRlbGV0ZSBrbGFzcy53b3JrZXJSTUk7XG59Il19
