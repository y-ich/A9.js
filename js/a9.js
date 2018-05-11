(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
(function (process){

var MACHINE_ID = Math.floor(Math.random() * 0xFFFFFF);
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
/* global exports */
/**
 * @fileoverview a tiny library for Web Worker Remote Method Invocation
 *
 */
const ObjectID = require('bson-objectid');

/**
 * @private returns a list of Transferable objects which {@code obj} includes
 * @param {object} obj any object
 * @param {Array} list for internal recursion only
 * @return {List} a list of Transferable objects
 */
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

/**
 * @private checks if {@code obj} is Transferable or not.
 * @param {object} obj any object
 * @return {boolean}
 */
function isTransferable(obj) {
    const transferable = [ArrayBuffer];
    if (typeof MessagePort !== 'undefined') {
        transferable.push(MessagePort);
    }
    if (typeof ImageBitmap !== 'undefined') {
        transferable.push(ImageBitmap);
    }
    return transferable.some(e => obj instanceof e);
}

/**
 * @class base class whose child classes use RMI
 */
class WorkerRMI {
    /**
     * @constructor
     * @param {object} remote an instance to call postMessage method
     * @param {Array} args arguments to be passed to server-side instance
     */
    constructor(remote, ...args) {
        this.remote = remote;
        this.id = ObjectID().toString();
        this.methodStates = {};
        this.remote.addEventListener('message', event => {
            const data = event.data;
            if (data.id === this.id) {
                this.returnHandler(data);
            }
        }, false);
        this.constructorPromise = this.invokeRM(this.constructor.name, args);
    }

    /**
     * invokes remote method
     * @param {string} methodName Method name
     * @param {Array} args arguments to be passed to server-side instance
     * @return {Promise}
     */
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

    /**
     * @private handles correspondent 'message' event
     * @param {obj} data data property of 'message' event
     */
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


/**
 * @private executes a method on server and post a result as message.
 * @param {obj} event 'message' event
 */
async function handleWorkerRMI(event) {
    const data = event.data;
    const message = {
        id: data.id,
        methodName: data.methodName,
        num: data.num,
    };
    let result;
    if (data.methodName === this.name) {
        this.workerRMI.instances[data.id] = new this(...data.args);
        message.result = null;
        this.workerRMI.target.postMessage(message, getTransferList(result));
    } else {
        const instance = this.workerRMI.instances[data.id];
        if (instance) {
            result = await instance[data.methodName].apply(instance, data.args)
            message.result = result;
            this.workerRMI.target.postMessage(message, getTransferList(result));
        }
    }
}

/**
 * registers a class as an executer of RMI on server
 * @param {obj} target an instance that receives 'message' events of RMI
 * @param {Class} klass a class to be registered
 */
function resigterWorkerRMI(target, klass) {
    klass.workerRMI = {
        target,
        instances: {},
        handler: handleWorkerRMI.bind(klass)
    }
    target.addEventListener('message', klass.workerRMI.handler);
}

/**
 * unresigters a class registered by registerWorkerRMI
 * @param {obj} target an instance that receives 'message' events of RMI
 * @param {Class} klass a class to be unregistered
 */
function unresigterWorkerRMI(target, klass) {
    target.removeEventListener('message', klass.workerRMI.handler)
    delete klass.workerRMI;
}

exports.WorkerRMI = WorkerRMI;
exports.resigterWorkerRMI = resigterWorkerRMI;
exports.unresigterWorkerRMI = unresigterWorkerRMI;

},{"bson-objectid":1}],4:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
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

const LEELA_ZERO = exports.LEELA_ZERO = true;

/// NNへの入力に関する履歴の深さです。
const KEEP_PREV_CNT = exports.KEEP_PREV_CNT = LEELA_ZERO ? 7 : 2;

/// NNへの入力フィーチャーの数です。
const FEATURE_CNT = exports.FEATURE_CNT = KEEP_PREV_CNT * 2 + (LEELA_ZERO ? 4 : 3);
},{}],5:[function(require,module,exports){
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
},{"./constants.js":4}],6:[function(require,module,exports){
'use strict';

var _workerRmi = require('worker-rmi');

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
        this.mainTime = mainTime;
        this.byoyomi = byoyomi;
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
        this.igoQuest = igoQuest;
        if (igoQuest) {
            this.timeLeft = [0, // dumy
            (3 * 60 + 1) * 1000, // black
            3 * 60 * 1000];
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
        } else {
            this.timeLeft = [0, // dumy
            this.board.ownColor === JGO.BLACK ? Infinity : this.engine.byoyomi * 1000, // black
            this.board.ownColor === JGO.BLACK ? this.engine.byoyomi * 1000 : Infinity];
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
            }, 100);
        }
        $('#your-time').text(Math.ceil(this.timeLeft[this.board.ownColor] / 1000));
        $('#ai-time').text(Math.ceil(this.timeLeft[this.board.ownColor % 2 + 1] / 1000));
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
                let message;
                if (score === 0) {
                    message = '持碁';
                } else {
                    message = score > 0 ? '黒' : '白';
                    const absScore = Math.abs(score);
                    message += absScore < 1 ? '半目勝ち' : Math.floor(absScore) + '目半勝ち';
                }
                message += 'ですか？';
                (0, _speech.speak)(message.replace('半', 'はん'));
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

        if (this.igoQuest) {
            this.timeLeft[this.board.turn] += 1000;
        } else if (this.board.turn === this.board.ownColor) {
            this.timeLeft[this.board.ownColor % 2 + 1] = this.engine.byoyomi * 1000;
            $('#ai-time').text(Math.ceil(this.timeLeft[this.board.ownColor % 2 + 1] / 1000));
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
                rule: this.board.jrecord.getRootNode().info.komi === '6.5' ? 'japanese' : 'chinese'
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
        new BoardController(_constants.BSIZE, 0, 7, res);
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
        if (condition.color === 'W') {
            board.setOwnColor(JGO.WHITE);
            board.setKomi(5.5);
        } else {
            board.setOwnColor(JGO.BLACK);
            board.setKomi(6.5);
        }
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
            controller.clearTimer();
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
},{"./constants.js":4,"./coord_convert.js":5,"./neural_network.js":7,"./speech.js":8,"worker-rmi":3}],7:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.NeuralNetwork = undefined;

var _constants = require('./constants.js');

var _utils = require('./utils.js');

if (!ArrayBuffer.prototype.slice) {
    ArrayBuffer.prototype.slice = function (start, end) {
        var that = new Uint8Array(this);
        if (end == undefined) end = that.length;
        var result = new ArrayBuffer(end - start);
        var resultArray = new Uint8Array(result);
        for (var i = 0; i < resultArray.length; i++) resultArray[i] = that[i + start];
        return result;
    };
} /* global WebDNN */
class NeuralNetwork {
    constructor() {
        this.nn = null;
    }

    async load() {
        if (this.nn) {
            return;
        }
        this.nn = await WebDNN.load(_constants.LEELA_ZERO ? './output_leela' : './output', { backendOrder: ['webgpu', 'webgl'] });
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
},{"./constants.js":4,"./utils.js":9}],8:[function(require,module,exports){
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
},{}],9:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.shuffle = shuffle;
exports.mostCommon = mostCommon;
exports.argsort = argsort;
exports.argmax = argmax;
exports.hash = hash;
exports.softmax = softmax;
exports.printProb = printProb;

var _constants = require('./constants.js');

function shuffle(array) {
    let n = array.length;
    let t;
    let i;

    while (n) {
        i = Math.floor(Math.random() * n--);
        t = array[n];
        array[n] = array[i];
        array[i] = t;
    }

    return array;
}

function mostCommon(array) {
    const map = new Map();
    for (let i = 0; i < array.length; i++) {
        const e = array[i];
        if (map.has(e)) {
            map.set(e, map.get(e) + 1);
        } else {
            map.set(e, 1);
        }
    }
    let maxKey;
    let maxValue = -1;
    for (const [key, value] of map.entries()) {
        if (value > maxValue) {
            maxKey = key;
            maxValue = value;
        }
    }
    return maxKey;
}

function argsort(array, reverse) {
    const en = Array.from(array).map((e, i) => [i, e]);
    en.sort((a, b) => reverse ? b[1] - a[1] : a[1] - b[1]);
    return en.map(e => e[0]);
}

function argmax(array) {
    let maxIndex;
    let maxValue = -Infinity;
    for (let i = 0; i < array.length; i++) {
        const v = array[i];
        if (v > maxValue) {
            maxIndex = i;
            maxValue = v;
        }
    }
    return maxIndex;
}

function hash(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) + hash + char; /* hash * 33 + c */
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

function softmax(input, temperature = 1.0) {
    const output = new Float32Array(input.length);
    const alpha = Math.max.apply(null, input);
    let denom = 0.0;

    for (let i = 0; i < input.length; i++) {
        const val = Math.exp((input[i] - alpha) / temperature);
        denom += val;
        output[i] = val;
    }

    for (let i = 0; i < output.length; i++) {
        output[i] /= denom;
    }

    return output;
}

function printProb(prob) {
    for (let y = 0; y < _constants.BSIZE; y++) {
        let str = `${y + 1} `;
        for (let x = 0; x < _constants.BSIZE; x++) {
            str += ('  ' + prob[x + y * _constants.BSIZE].toFixed(1)).slice(-5);
        }
        console.log(str);
    }
    console.log('pass=%s', prob[prob.length - 1].toFixed(1));
}
},{"./constants.js":4}]},{},[6])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnNvbi1vYmplY3RpZC9vYmplY3RpZC5qcyIsIm5vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvd29ya2VyLXJtaS93b3JrZXItcm1pLmpzIiwic3JjL2NvbnN0YW50cy5qcyIsInNyYy9jb29yZF9jb252ZXJ0LmpzIiwic3JjL21haW4uanMiLCJzcmMvbmV1cmFsX25ldHdvcmsuanMiLCJzcmMvc3BlZWNoLmpzIiwic3JjL3V0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDOU5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfXJldHVybiBlfSkoKSIsIlxudmFyIE1BQ0hJTkVfSUQgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAweEZGRkZGRik7XG52YXIgaW5kZXggPSBPYmplY3RJRC5pbmRleCA9IHBhcnNlSW50KE1hdGgucmFuZG9tKCkgKiAweEZGRkZGRiwgMTApO1xudmFyIHBpZCA9ICh0eXBlb2YgcHJvY2VzcyA9PT0gJ3VuZGVmaW5lZCcgfHwgdHlwZW9mIHByb2Nlc3MucGlkICE9PSAnbnVtYmVyJyA/IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwMDAwMCkgOiBwcm9jZXNzLnBpZCkgJSAweEZGRkY7XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGFuIG9iamVjdCBpcyBCdWZmZXJcbiAqXG4gKiBBdXRob3I6ICAgRmVyb3NzIEFib3VraGFkaWplaCA8ZmVyb3NzQGZlcm9zcy5vcmc+IDxodHRwOi8vZmVyb3NzLm9yZz5cbiAqIExpY2Vuc2U6ICBNSVRcbiAqXG4gKi9cbnZhciBpc0J1ZmZlciA9IGZ1bmN0aW9uIChvYmopIHtcbiAgcmV0dXJuICEhKFxuICBvYmogIT0gbnVsbCAmJlxuICBvYmouY29uc3RydWN0b3IgJiZcbiAgdHlwZW9mIG9iai5jb25zdHJ1Y3Rvci5pc0J1ZmZlciA9PT0gJ2Z1bmN0aW9uJyAmJlxuICBvYmouY29uc3RydWN0b3IuaXNCdWZmZXIob2JqKVxuICApXG59O1xuXG4vKipcbiAqIENyZWF0ZSBhIG5ldyBpbW11dGFibGUgT2JqZWN0SUQgaW5zdGFuY2VcbiAqXG4gKiBAY2xhc3MgUmVwcmVzZW50cyB0aGUgQlNPTiBPYmplY3RJRCB0eXBlXG4gKiBAcGFyYW0ge1N0cmluZ3xOdW1iZXJ9IGFyZyBDYW4gYmUgYSAyNCBieXRlIGhleCBzdHJpbmcsIDEyIGJ5dGUgYmluYXJ5IHN0cmluZyBvciBhIE51bWJlci5cbiAqIEByZXR1cm4ge09iamVjdH0gaW5zdGFuY2Ugb2YgT2JqZWN0SUQuXG4gKi9cbmZ1bmN0aW9uIE9iamVjdElEKGFyZykge1xuICBpZighKHRoaXMgaW5zdGFuY2VvZiBPYmplY3RJRCkpIHJldHVybiBuZXcgT2JqZWN0SUQoYXJnKTtcbiAgaWYoYXJnICYmICgoYXJnIGluc3RhbmNlb2YgT2JqZWN0SUQpIHx8IGFyZy5fYnNvbnR5cGU9PT1cIk9iamVjdElEXCIpKVxuICAgIHJldHVybiBhcmc7XG5cbiAgdmFyIGJ1ZjtcblxuICBpZihpc0J1ZmZlcihhcmcpIHx8IChBcnJheS5pc0FycmF5KGFyZykgJiYgYXJnLmxlbmd0aD09PTEyKSkge1xuICAgIGJ1ZiA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZyk7XG4gIH1cbiAgZWxzZSBpZih0eXBlb2YgYXJnID09PSBcInN0cmluZ1wiKSB7XG4gICAgaWYoYXJnLmxlbmd0aCE9PTEyICYmICFPYmplY3RJRC5pc1ZhbGlkKGFyZykpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJBcmd1bWVudCBwYXNzZWQgaW4gbXVzdCBiZSBhIHNpbmdsZSBTdHJpbmcgb2YgMTIgYnl0ZXMgb3IgYSBzdHJpbmcgb2YgMjQgaGV4IGNoYXJhY3RlcnNcIik7XG5cbiAgICBidWYgPSBidWZmZXIoYXJnKTtcbiAgfVxuICBlbHNlIGlmKC9udW1iZXJ8dW5kZWZpbmVkLy50ZXN0KHR5cGVvZiBhcmcpKSB7XG4gICAgYnVmID0gYnVmZmVyKGdlbmVyYXRlKGFyZykpO1xuICB9XG5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIFwiaWRcIiwge1xuICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkodGhpcywgYnVmKTsgfVxuICB9KTtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIFwic3RyXCIsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gYnVmLm1hcChoZXguYmluZCh0aGlzLCAyKSkuam9pbignJyk7IH1cbiAgfSk7XG59XG5tb2R1bGUuZXhwb3J0cyA9IE9iamVjdElEO1xuT2JqZWN0SUQuZ2VuZXJhdGUgPSBnZW5lcmF0ZTtcbk9iamVjdElELmRlZmF1bHQgPSBPYmplY3RJRDtcblxuLyoqXG4gKiBDcmVhdGVzIGFuIE9iamVjdElEIGZyb20gYSBzZWNvbmQgYmFzZWQgbnVtYmVyLCB3aXRoIHRoZSByZXN0IG9mIHRoZSBPYmplY3RJRCB6ZXJvZWQgb3V0LiBVc2VkIGZvciBjb21wYXJpc29ucyBvciBzb3J0aW5nIHRoZSBPYmplY3RJRC5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gdGltZSBhbiBpbnRlZ2VyIG51bWJlciByZXByZXNlbnRpbmcgYSBudW1iZXIgb2Ygc2Vjb25kcy5cbiAqIEByZXR1cm4ge09iamVjdElEfSByZXR1cm4gdGhlIGNyZWF0ZWQgT2JqZWN0SURcbiAqIEBhcGkgcHVibGljXG4gKi9cbk9iamVjdElELmNyZWF0ZUZyb21UaW1lID0gZnVuY3Rpb24odGltZSl7XG4gIHRpbWUgPSBwYXJzZUludCh0aW1lLCAxMCkgJSAweEZGRkZGRkZGO1xuICByZXR1cm4gbmV3IE9iamVjdElEKGhleCg4LHRpbWUpK1wiMDAwMDAwMDAwMDAwMDAwMFwiKTtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBPYmplY3RJRCBmcm9tIGEgaGV4IHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiBhbiBPYmplY3RJRC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gaGV4U3RyaW5nIGNyZWF0ZSBhIE9iamVjdElEIGZyb20gYSBwYXNzZWQgaW4gMjQgYnl0ZSBoZXhzdHJpbmcuXG4gKiBAcmV0dXJuIHtPYmplY3RJRH0gcmV0dXJuIHRoZSBjcmVhdGVkIE9iamVjdElEXG4gKiBAYXBpIHB1YmxpY1xuICovXG5PYmplY3RJRC5jcmVhdGVGcm9tSGV4U3RyaW5nID0gZnVuY3Rpb24oaGV4U3RyaW5nKSB7XG4gIGlmKCFPYmplY3RJRC5pc1ZhbGlkKGhleFN0cmluZykpXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBPYmplY3RJRCBoZXggc3RyaW5nXCIpO1xuXG4gIHJldHVybiBuZXcgT2JqZWN0SUQoaGV4U3RyaW5nKTtcbn07XG5cbi8qKlxuICogQ2hlY2tzIGlmIGEgdmFsdWUgaXMgYSB2YWxpZCBic29uIE9iamVjdElkXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG9iamVjdGlkIENhbiBiZSBhIDI0IGJ5dGUgaGV4IHN0cmluZyBvciBhbiBpbnN0YW5jZSBvZiBPYmplY3RJRC5cbiAqIEByZXR1cm4ge0Jvb2xlYW59IHJldHVybiB0cnVlIGlmIHRoZSB2YWx1ZSBpcyBhIHZhbGlkIGJzb24gT2JqZWN0SUQsIHJldHVybiBmYWxzZSBvdGhlcndpc2UuXG4gKiBAYXBpIHB1YmxpY1xuICpcbiAqIFRIRSBOQVRJVkUgRE9DVU1FTlRBVElPTiBJU04nVCBDTEVBUiBPTiBUSElTIEdVWSFcbiAqIGh0dHA6Ly9tb25nb2RiLmdpdGh1Yi5pby9ub2RlLW1vbmdvZGItbmF0aXZlL2FwaS1ic29uLWdlbmVyYXRlZC9vYmplY3RpZC5odG1sI29iamVjdGlkLWlzdmFsaWRcbiAqL1xuT2JqZWN0SUQuaXNWYWxpZCA9IGZ1bmN0aW9uKG9iamVjdGlkKSB7XG4gIGlmKCFvYmplY3RpZCkgcmV0dXJuIGZhbHNlO1xuXG4gIC8vY2FsbCAudG9TdHJpbmcoKSB0byBnZXQgdGhlIGhleCBpZiB3ZSdyZVxuICAvLyB3b3JraW5nIHdpdGggYW4gaW5zdGFuY2Ugb2YgT2JqZWN0SURcbiAgcmV0dXJuIC9eWzAtOUEtRl17MjR9JC9pLnRlc3Qob2JqZWN0aWQudG9TdHJpbmcoKSk7XG59O1xuXG4vKipcbiAqIHNldCBhIGN1c3RvbSBtYWNoaW5lSURcbiAqIFxuICogQHBhcmFtIHtTdHJpbmd8TnVtYmVyfSBtYWNoaW5laWQgQ2FuIGJlIGEgc3RyaW5nLCBoZXgtc3RyaW5nIG9yIGEgbnVtYmVyXG4gKiBAcmV0dXJuIHt2b2lkfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuT2JqZWN0SUQuc2V0TWFjaGluZUlEID0gZnVuY3Rpb24oYXJnKSB7XG4gIHZhciBtYWNoaW5lSUQ7XG5cbiAgaWYodHlwZW9mIGFyZyA9PT0gXCJzdHJpbmdcIikge1xuICAgIC8vIGhleCBzdHJpbmdcbiAgICBtYWNoaW5lSUQgPSBwYXJzZUludChhcmcsIDE2KTtcbiAgIFxuICAgIC8vIGFueSBzdHJpbmdcbiAgICBpZihpc05hTihtYWNoaW5lSUQpKSB7XG4gICAgICBhcmcgPSAoJzAwMDAwMCcgKyBhcmcpLnN1YnN0cigtNyw2KTtcblxuICAgICAgbWFjaGluZUlEID0gXCJcIjtcbiAgICAgIGZvcih2YXIgaSA9IDA7aTw2OyBpKyspIHtcbiAgICAgICAgbWFjaGluZUlEICs9IChhcmcuY2hhckNvZGVBdChpKSk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGVsc2UgaWYoL251bWJlcnx1bmRlZmluZWQvLnRlc3QodHlwZW9mIGFyZykpIHtcbiAgICBtYWNoaW5lSUQgPSBhcmcgfCAwO1xuICB9XG5cbiAgTUFDSElORV9JRCA9IChtYWNoaW5lSUQgJiAweEZGRkZGRik7XG59XG5cbi8qKlxuICogZ2V0IHRoZSBtYWNoaW5lSURcbiAqIFxuICogQHJldHVybiB7bnVtYmVyfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuT2JqZWN0SUQuZ2V0TWFjaGluZUlEID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBNQUNISU5FX0lEO1xufVxuXG5PYmplY3RJRC5wcm90b3R5cGUgPSB7XG4gIF9ic29udHlwZTogJ09iamVjdElEJyxcbiAgY29uc3RydWN0b3I6IE9iamVjdElELFxuXG4gIC8qKlxuICAgKiBSZXR1cm4gdGhlIE9iamVjdElEIGlkIGFzIGEgMjQgYnl0ZSBoZXggc3RyaW5nIHJlcHJlc2VudGF0aW9uXG4gICAqXG4gICAqIEByZXR1cm4ge1N0cmluZ30gcmV0dXJuIHRoZSAyNCBieXRlIGhleCBzdHJpbmcgcmVwcmVzZW50YXRpb24uXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICB0b0hleFN0cmluZzogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuc3RyO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDb21wYXJlcyB0aGUgZXF1YWxpdHkgb2YgdGhpcyBPYmplY3RJRCB3aXRoIGBvdGhlcklEYC5cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IG90aGVyIE9iamVjdElEIGluc3RhbmNlIHRvIGNvbXBhcmUgYWdhaW5zdC5cbiAgICogQHJldHVybiB7Qm9vbGVhbn0gdGhlIHJlc3VsdCBvZiBjb21wYXJpbmcgdHdvIE9iamVjdElEJ3NcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIGVxdWFsczogZnVuY3Rpb24gKG90aGVyKXtcbiAgICByZXR1cm4gISFvdGhlciAmJiB0aGlzLnN0ciA9PT0gb3RoZXIudG9TdHJpbmcoKTtcbiAgfSxcblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgZ2VuZXJhdGlvbiBkYXRlIChhY2N1cmF0ZSB1cCB0byB0aGUgc2Vjb25kKSB0aGF0IHRoaXMgSUQgd2FzIGdlbmVyYXRlZC5cbiAgICpcbiAgICogQHJldHVybiB7RGF0ZX0gdGhlIGdlbmVyYXRpb24gZGF0ZVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgZ2V0VGltZXN0YW1wOiBmdW5jdGlvbigpe1xuICAgIHJldHVybiBuZXcgRGF0ZShwYXJzZUludCh0aGlzLnN0ci5zdWJzdHIoMCw4KSwgMTYpICogMTAwMCk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIG5leHQoKSB7XG4gIHJldHVybiBpbmRleCA9IChpbmRleCsxKSAlIDB4RkZGRkZGO1xufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZSh0aW1lKSB7XG4gIGlmICh0eXBlb2YgdGltZSAhPT0gJ251bWJlcicpXG4gICAgdGltZSA9IERhdGUubm93KCkvMTAwMDtcblxuICAvL2tlZXAgaXQgaW4gdGhlIHJpbmchXG4gIHRpbWUgPSBwYXJzZUludCh0aW1lLCAxMCkgJSAweEZGRkZGRkZGO1xuXG4gIC8vRkZGRkZGRkYgRkZGRkZGIEZGRkYgRkZGRkZGXG4gIHJldHVybiBoZXgoOCx0aW1lKSArIGhleCg2LE1BQ0hJTkVfSUQpICsgaGV4KDQscGlkKSArIGhleCg2LG5leHQoKSk7XG59XG5cbmZ1bmN0aW9uIGhleChsZW5ndGgsIG4pIHtcbiAgbiA9IG4udG9TdHJpbmcoMTYpO1xuICByZXR1cm4gKG4ubGVuZ3RoPT09bGVuZ3RoKT8gbiA6IFwiMDAwMDAwMDBcIi5zdWJzdHJpbmcobi5sZW5ndGgsIGxlbmd0aCkgKyBuO1xufVxuXG5mdW5jdGlvbiBidWZmZXIoc3RyKSB7XG4gIHZhciBpPTAsb3V0PVtdO1xuXG4gIGlmKHN0ci5sZW5ndGg9PT0yNClcbiAgICBmb3IoO2k8MjQ7IG91dC5wdXNoKHBhcnNlSW50KHN0cltpXStzdHJbaSsxXSwgMTYpKSxpKz0yKTtcblxuICBlbHNlIGlmKHN0ci5sZW5ndGg9PT0xMilcbiAgICBmb3IoO2k8MTI7IG91dC5wdXNoKHN0ci5jaGFyQ29kZUF0KGkpKSxpKyspO1xuXG4gIHJldHVybiBvdXQ7XG59XG5cbi8qKlxuICogQ29udmVydHMgdG8gYSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgdGhpcyBJZC5cbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9IHJldHVybiB0aGUgMjQgYnl0ZSBoZXggc3RyaW5nIHJlcHJlc2VudGF0aW9uLlxuICogQGFwaSBwcml2YXRlXG4gKi9cbk9iamVjdElELnByb3RvdHlwZS5pbnNwZWN0ID0gZnVuY3Rpb24oKSB7IHJldHVybiBcIk9iamVjdElEKFwiK3RoaXMrXCIpXCIgfTtcbk9iamVjdElELnByb3RvdHlwZS50b0pTT04gPSBPYmplY3RJRC5wcm90b3R5cGUudG9IZXhTdHJpbmc7XG5PYmplY3RJRC5wcm90b3R5cGUudG9TdHJpbmcgPSBPYmplY3RJRC5wcm90b3R5cGUudG9IZXhTdHJpbmc7XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxuLy8gY2FjaGVkIGZyb20gd2hhdGV2ZXIgZ2xvYmFsIGlzIHByZXNlbnQgc28gdGhhdCB0ZXN0IHJ1bm5lcnMgdGhhdCBzdHViIGl0XG4vLyBkb24ndCBicmVhayB0aGluZ3MuICBCdXQgd2UgbmVlZCB0byB3cmFwIGl0IGluIGEgdHJ5IGNhdGNoIGluIGNhc2UgaXQgaXNcbi8vIHdyYXBwZWQgaW4gc3RyaWN0IG1vZGUgY29kZSB3aGljaCBkb2Vzbid0IGRlZmluZSBhbnkgZ2xvYmFscy4gIEl0J3MgaW5zaWRlIGFcbi8vIGZ1bmN0aW9uIGJlY2F1c2UgdHJ5L2NhdGNoZXMgZGVvcHRpbWl6ZSBpbiBjZXJ0YWluIGVuZ2luZXMuXG5cbnZhciBjYWNoZWRTZXRUaW1lb3V0O1xudmFyIGNhY2hlZENsZWFyVGltZW91dDtcblxuZnVuY3Rpb24gZGVmYXVsdFNldFRpbW91dCgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3NldFRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbmZ1bmN0aW9uIGRlZmF1bHRDbGVhclRpbWVvdXQgKCkge1xuICAgIHRocm93IG5ldyBFcnJvcignY2xlYXJUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG4oZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc2V0VGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2YgY2xlYXJUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgIH1cbn0gKCkpXG5mdW5jdGlvbiBydW5UaW1lb3V0KGZ1bikge1xuICAgIGlmIChjYWNoZWRTZXRUaW1lb3V0ID09PSBzZXRUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICAvLyBpZiBzZXRUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkU2V0VGltZW91dCA9PT0gZGVmYXVsdFNldFRpbW91dCB8fCAhY2FjaGVkU2V0VGltZW91dCkgJiYgc2V0VGltZW91dCkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dChmdW4sIDApO1xuICAgIH0gY2F0Y2goZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwobnVsbCwgZnVuLCAwKTtcbiAgICAgICAgfSBjYXRjaChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKHRoaXMsIGZ1biwgMCk7XG4gICAgICAgIH1cbiAgICB9XG5cblxufVxuZnVuY3Rpb24gcnVuQ2xlYXJUaW1lb3V0KG1hcmtlcikge1xuICAgIGlmIChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGNsZWFyVGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICAvLyBpZiBjbGVhclRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGRlZmF1bHRDbGVhclRpbWVvdXQgfHwgIWNhY2hlZENsZWFyVGltZW91dCkgJiYgY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCAgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbChudWxsLCBtYXJrZXIpO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yLlxuICAgICAgICAgICAgLy8gU29tZSB2ZXJzaW9ucyBvZiBJLkUuIGhhdmUgZGlmZmVyZW50IHJ1bGVzIGZvciBjbGVhclRpbWVvdXQgdnMgc2V0VGltZW91dFxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKHRoaXMsIG1hcmtlcik7XG4gICAgICAgIH1cbiAgICB9XG5cblxuXG59XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBpZiAoIWRyYWluaW5nIHx8ICFjdXJyZW50UXVldWUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBydW5UaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBydW5DbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAxICYmICFkcmFpbmluZykge1xuICAgICAgICBydW5UaW1lb3V0KGRyYWluUXVldWUpO1xuICAgIH1cbn07XG5cbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcbmZ1bmN0aW9uIEl0ZW0oZnVuLCBhcnJheSkge1xuICAgIHRoaXMuZnVuID0gZnVuO1xuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbn1cbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcbn07XG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5wcm9jZXNzLnByZXBlbmRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnByZXBlbmRPbmNlTGlzdGVuZXIgPSBub29wO1xuXG5wcm9jZXNzLmxpc3RlbmVycyA9IGZ1bmN0aW9uIChuYW1lKSB7IHJldHVybiBbXSB9XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwiLyogZ2xvYmFsIGV4cG9ydHMgKi9cbi8qKlxuICogQGZpbGVvdmVydmlldyBhIHRpbnkgbGlicmFyeSBmb3IgV2ViIFdvcmtlciBSZW1vdGUgTWV0aG9kIEludm9jYXRpb25cbiAqXG4gKi9cbmNvbnN0IE9iamVjdElEID0gcmVxdWlyZSgnYnNvbi1vYmplY3RpZCcpO1xuXG4vKipcbiAqIEBwcml2YXRlIHJldHVybnMgYSBsaXN0IG9mIFRyYW5zZmVyYWJsZSBvYmplY3RzIHdoaWNoIHtAY29kZSBvYmp9IGluY2x1ZGVzXG4gKiBAcGFyYW0ge29iamVjdH0gb2JqIGFueSBvYmplY3RcbiAqIEBwYXJhbSB7QXJyYXl9IGxpc3QgZm9yIGludGVybmFsIHJlY3Vyc2lvbiBvbmx5XG4gKiBAcmV0dXJuIHtMaXN0fSBhIGxpc3Qgb2YgVHJhbnNmZXJhYmxlIG9iamVjdHNcbiAqL1xuZnVuY3Rpb24gZ2V0VHJhbnNmZXJMaXN0KG9iaiwgbGlzdCA9IFtdKSB7XG4gICAgaWYgKEFycmF5QnVmZmVyLmlzVmlldyhvYmopKSB7XG4gICAgICAgIGxpc3QucHVzaChvYmouYnVmZmVyKTtcbiAgICAgICAgcmV0dXJuIGxpc3Q7XG4gICAgfVxuICAgIGlmIChpc1RyYW5zZmVyYWJsZShvYmopKSB7XG4gICAgICAgIGxpc3QucHVzaChvYmopO1xuICAgICAgICByZXR1cm4gbGlzdDtcbiAgICB9XG4gICAgaWYgKCEodHlwZW9mIG9iaiA9PT0gJ29iamVjdCcpKSB7XG4gICAgICAgIHJldHVybiBsaXN0O1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHByb3AgaW4gb2JqKSB7XG4gICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkocHJvcCkpIHtcbiAgICAgICAgICAgIGdldFRyYW5zZmVyTGlzdChvYmpbcHJvcF0sIGxpc3QpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBsaXN0O1xufVxuXG4vKipcbiAqIEBwcml2YXRlIGNoZWNrcyBpZiB7QGNvZGUgb2JqfSBpcyBUcmFuc2ZlcmFibGUgb3Igbm90LlxuICogQHBhcmFtIHtvYmplY3R9IG9iaiBhbnkgb2JqZWN0XG4gKiBAcmV0dXJuIHtib29sZWFufVxuICovXG5mdW5jdGlvbiBpc1RyYW5zZmVyYWJsZShvYmopIHtcbiAgICBjb25zdCB0cmFuc2ZlcmFibGUgPSBbQXJyYXlCdWZmZXJdO1xuICAgIGlmICh0eXBlb2YgTWVzc2FnZVBvcnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHRyYW5zZmVyYWJsZS5wdXNoKE1lc3NhZ2VQb3J0KTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBJbWFnZUJpdG1hcCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgdHJhbnNmZXJhYmxlLnB1c2goSW1hZ2VCaXRtYXApO1xuICAgIH1cbiAgICByZXR1cm4gdHJhbnNmZXJhYmxlLnNvbWUoZSA9PiBvYmogaW5zdGFuY2VvZiBlKTtcbn1cblxuLyoqXG4gKiBAY2xhc3MgYmFzZSBjbGFzcyB3aG9zZSBjaGlsZCBjbGFzc2VzIHVzZSBSTUlcbiAqL1xuY2xhc3MgV29ya2VyUk1JIHtcbiAgICAvKipcbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVtb3RlIGFuIGluc3RhbmNlIHRvIGNhbGwgcG9zdE1lc3NhZ2UgbWV0aG9kXG4gICAgICogQHBhcmFtIHtBcnJheX0gYXJncyBhcmd1bWVudHMgdG8gYmUgcGFzc2VkIHRvIHNlcnZlci1zaWRlIGluc3RhbmNlXG4gICAgICovXG4gICAgY29uc3RydWN0b3IocmVtb3RlLCAuLi5hcmdzKSB7XG4gICAgICAgIHRoaXMucmVtb3RlID0gcmVtb3RlO1xuICAgICAgICB0aGlzLmlkID0gT2JqZWN0SUQoKS50b1N0cmluZygpO1xuICAgICAgICB0aGlzLm1ldGhvZFN0YXRlcyA9IHt9O1xuICAgICAgICB0aGlzLnJlbW90ZS5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZXZlbnQgPT4ge1xuICAgICAgICAgICAgY29uc3QgZGF0YSA9IGV2ZW50LmRhdGE7XG4gICAgICAgICAgICBpZiAoZGF0YS5pZCA9PT0gdGhpcy5pZCkge1xuICAgICAgICAgICAgICAgIHRoaXMucmV0dXJuSGFuZGxlcihkYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgZmFsc2UpO1xuICAgICAgICB0aGlzLmNvbnN0cnVjdG9yUHJvbWlzZSA9IHRoaXMuaW52b2tlUk0odGhpcy5jb25zdHJ1Y3Rvci5uYW1lLCBhcmdzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBpbnZva2VzIHJlbW90ZSBtZXRob2RcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbWV0aG9kTmFtZSBNZXRob2QgbmFtZVxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGFyZ3MgYXJndW1lbnRzIHRvIGJlIHBhc3NlZCB0byBzZXJ2ZXItc2lkZSBpbnN0YW5jZVxuICAgICAqIEByZXR1cm4ge1Byb21pc2V9XG4gICAgICovXG4gICAgaW52b2tlUk0obWV0aG9kTmFtZSwgYXJncyA9IFtdKSB7XG4gICAgICAgIGlmICghdGhpcy5tZXRob2RTdGF0ZXNbbWV0aG9kTmFtZV0pIHtcbiAgICAgICAgICAgIHRoaXMubWV0aG9kU3RhdGVzW21ldGhvZE5hbWVdID0ge1xuICAgICAgICAgICAgICAgIG51bTogMCxcbiAgICAgICAgICAgICAgICByZXNvbHZlUmVqZWN0czoge31cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG1ldGhvZFN0YXRlID0gdGhpcy5tZXRob2RTdGF0ZXNbbWV0aG9kTmFtZV07XG4gICAgICAgICAgICBtZXRob2RTdGF0ZS5udW0gKz0gMTtcbiAgICAgICAgICAgIG1ldGhvZFN0YXRlLnJlc29sdmVSZWplY3RzW21ldGhvZFN0YXRlLm51bV0gPSB7IHJlc29sdmUsIHJlamVjdCB9O1xuICAgICAgICAgICAgdGhpcy5yZW1vdGUucG9zdE1lc3NhZ2Uoe1xuICAgICAgICAgICAgICAgIGlkOiB0aGlzLmlkLFxuICAgICAgICAgICAgICAgIG1ldGhvZE5hbWUsXG4gICAgICAgICAgICAgICAgbnVtOiBtZXRob2RTdGF0ZS5udW0sXG4gICAgICAgICAgICAgICAgYXJnc1xuICAgICAgICAgICAgfSwgZ2V0VHJhbnNmZXJMaXN0KGFyZ3MpKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHByaXZhdGUgaGFuZGxlcyBjb3JyZXNwb25kZW50ICdtZXNzYWdlJyBldmVudFxuICAgICAqIEBwYXJhbSB7b2JqfSBkYXRhIGRhdGEgcHJvcGVydHkgb2YgJ21lc3NhZ2UnIGV2ZW50XG4gICAgICovXG4gICAgcmV0dXJuSGFuZGxlcihkYXRhKSB7XG4gICAgICAgIGNvbnN0IHJlc29sdmVSZWplY3RzID0gdGhpcy5tZXRob2RTdGF0ZXNbZGF0YS5tZXRob2ROYW1lXS5yZXNvbHZlUmVqZWN0cztcbiAgICAgICAgaWYgKGRhdGEuZXJyb3IpIHtcbiAgICAgICAgICAgIHJlc29sdmVSZWplY3RzW2RhdGEubnVtXS5yZWplY3QoZGF0YS5lcnJvcik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXNvbHZlUmVqZWN0c1tkYXRhLm51bV0ucmVzb2x2ZShkYXRhLnJlc3VsdCk7XG4gICAgICAgIH1cbiAgICAgICAgZGVsZXRlIHJlc29sdmVSZWplY3RzW2RhdGEubnVtXTtcbiAgICB9XG59XG5cblxuLyoqXG4gKiBAcHJpdmF0ZSBleGVjdXRlcyBhIG1ldGhvZCBvbiBzZXJ2ZXIgYW5kIHBvc3QgYSByZXN1bHQgYXMgbWVzc2FnZS5cbiAqIEBwYXJhbSB7b2JqfSBldmVudCAnbWVzc2FnZScgZXZlbnRcbiAqL1xuYXN5bmMgZnVuY3Rpb24gaGFuZGxlV29ya2VyUk1JKGV2ZW50KSB7XG4gICAgY29uc3QgZGF0YSA9IGV2ZW50LmRhdGE7XG4gICAgY29uc3QgbWVzc2FnZSA9IHtcbiAgICAgICAgaWQ6IGRhdGEuaWQsXG4gICAgICAgIG1ldGhvZE5hbWU6IGRhdGEubWV0aG9kTmFtZSxcbiAgICAgICAgbnVtOiBkYXRhLm51bSxcbiAgICB9O1xuICAgIGxldCByZXN1bHQ7XG4gICAgaWYgKGRhdGEubWV0aG9kTmFtZSA9PT0gdGhpcy5uYW1lKSB7XG4gICAgICAgIHRoaXMud29ya2VyUk1JLmluc3RhbmNlc1tkYXRhLmlkXSA9IG5ldyB0aGlzKC4uLmRhdGEuYXJncyk7XG4gICAgICAgIG1lc3NhZ2UucmVzdWx0ID0gbnVsbDtcbiAgICAgICAgdGhpcy53b3JrZXJSTUkudGFyZ2V0LnBvc3RNZXNzYWdlKG1lc3NhZ2UsIGdldFRyYW5zZmVyTGlzdChyZXN1bHQpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHRoaXMud29ya2VyUk1JLmluc3RhbmNlc1tkYXRhLmlkXTtcbiAgICAgICAgaWYgKGluc3RhbmNlKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBhd2FpdCBpbnN0YW5jZVtkYXRhLm1ldGhvZE5hbWVdLmFwcGx5KGluc3RhbmNlLCBkYXRhLmFyZ3MpXG4gICAgICAgICAgICBtZXNzYWdlLnJlc3VsdCA9IHJlc3VsdDtcbiAgICAgICAgICAgIHRoaXMud29ya2VyUk1JLnRhcmdldC5wb3N0TWVzc2FnZShtZXNzYWdlLCBnZXRUcmFuc2Zlckxpc3QocmVzdWx0KSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8qKlxuICogcmVnaXN0ZXJzIGEgY2xhc3MgYXMgYW4gZXhlY3V0ZXIgb2YgUk1JIG9uIHNlcnZlclxuICogQHBhcmFtIHtvYmp9IHRhcmdldCBhbiBpbnN0YW5jZSB0aGF0IHJlY2VpdmVzICdtZXNzYWdlJyBldmVudHMgb2YgUk1JXG4gKiBAcGFyYW0ge0NsYXNzfSBrbGFzcyBhIGNsYXNzIHRvIGJlIHJlZ2lzdGVyZWRcbiAqL1xuZnVuY3Rpb24gcmVzaWd0ZXJXb3JrZXJSTUkodGFyZ2V0LCBrbGFzcykge1xuICAgIGtsYXNzLndvcmtlclJNSSA9IHtcbiAgICAgICAgdGFyZ2V0LFxuICAgICAgICBpbnN0YW5jZXM6IHt9LFxuICAgICAgICBoYW5kbGVyOiBoYW5kbGVXb3JrZXJSTUkuYmluZChrbGFzcylcbiAgICB9XG4gICAgdGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBrbGFzcy53b3JrZXJSTUkuaGFuZGxlcik7XG59XG5cbi8qKlxuICogdW5yZXNpZ3RlcnMgYSBjbGFzcyByZWdpc3RlcmVkIGJ5IHJlZ2lzdGVyV29ya2VyUk1JXG4gKiBAcGFyYW0ge29ian0gdGFyZ2V0IGFuIGluc3RhbmNlIHRoYXQgcmVjZWl2ZXMgJ21lc3NhZ2UnIGV2ZW50cyBvZiBSTUlcbiAqIEBwYXJhbSB7Q2xhc3N9IGtsYXNzIGEgY2xhc3MgdG8gYmUgdW5yZWdpc3RlcmVkXG4gKi9cbmZ1bmN0aW9uIHVucmVzaWd0ZXJXb3JrZXJSTUkodGFyZ2V0LCBrbGFzcykge1xuICAgIHRhcmdldC5yZW1vdmVFdmVudExpc3RlbmVyKCdtZXNzYWdlJywga2xhc3Mud29ya2VyUk1JLmhhbmRsZXIpXG4gICAgZGVsZXRlIGtsYXNzLndvcmtlclJNSTtcbn1cblxuZXhwb3J0cy5Xb3JrZXJSTUkgPSBXb3JrZXJSTUk7XG5leHBvcnRzLnJlc2lndGVyV29ya2VyUk1JID0gcmVzaWd0ZXJXb3JrZXJSTUk7XG5leHBvcnRzLnVucmVzaWd0ZXJXb3JrZXJSTUkgPSB1bnJlc2lndGVyV29ya2VyUk1JO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG4vLy8g56KB55uk44Gu44K144Kk44K644Gn44GZ44CCXG5jb25zdCBCU0laRSA9IGV4cG9ydHMuQlNJWkUgPSA5O1xuXG4vLy8g5aSW5p6g44KS5oyB44Gk5ouh5by156KB55uk44Gu44K144Kk44K644Gn44GZ44CCXG5jb25zdCBFQlNJWkUgPSBleHBvcnRzLkVCU0laRSA9IEJTSVpFICsgMjtcblxuLy8vIOeigeebpOOBruS6pOeCueOBruaVsOOBp+OBmeOAglxuY29uc3QgQlZDTlQgPSBleHBvcnRzLkJWQ05UID0gQlNJWkUgKiBCU0laRTtcblxuLy8vIOaLoeW8teeigeebpOOBruS6pOeCueOBruaVsOOBp+OBmeOAglxuY29uc3QgRUJWQ05UID0gZXhwb3J0cy5FQlZDTlQgPSBFQlNJWkUgKiBFQlNJWkU7XG5cbi8vLyDjg5HjgrnjgpLooajjgZnnt5rlvaLluqfmqJnjgafjgZnjgILpgJrluLjjga7nnYDmiYvjga/mi6HlvLXnooHnm6Tjga7nt5rlvaLluqfmqJnjgafooajjgZfjgb7jgZnjgIJcbi8vIFRPRE8gLSDnnYDmiYvjga7jgZ/jgoHjgavliJfmjJnlnovjgpLkvZzjgaPjgZ/jgbvjgYbjgYzplqLmlbDjga7jgrfjgrDjg4vjg4Hjg6Pjga/oqq3jgb/jgoTjgZnjgYTjgIJcbmNvbnN0IFBBU1MgPSBleHBvcnRzLlBBU1MgPSBFQlZDTlQ7XG5cbi8vLyDnt5rlvaLluqfmqJnjga7jg5fjg6zjg7zjgrnjg5vjg6vjg4Djg7zjga7mnKrkvb/nlKjjgpLnpLrjgZnlgKTjgafjgZnjgIJcbi8vIFRPRE8gLSDoqbLlvZPjgZnjgovloLTmiYDjgatPcHRpb248dXNpemU+44KS5L2/44Gj44Gf44G744GG44GM6Zai5pWw44Gu44K344Kw44OL44OB44Oj44Gv6Kqt44G/44KE44GZ44GE44CCXG5jb25zdCBWTlVMTCA9IGV4cG9ydHMuVk5VTEwgPSBFQlZDTlQgKyAxO1xuXG5jb25zdCBMRUVMQV9aRVJPID0gZXhwb3J0cy5MRUVMQV9aRVJPID0gdHJ1ZTtcblxuLy8vIE5O44G444Gu5YWl5Yqb44Gr6Zai44GZ44KL5bGl5q2044Gu5rex44GV44Gn44GZ44CCXG5jb25zdCBLRUVQX1BSRVZfQ05UID0gZXhwb3J0cy5LRUVQX1BSRVZfQ05UID0gTEVFTEFfWkVSTyA/IDcgOiAyO1xuXG4vLy8gTk7jgbjjga7lhaXlipvjg5XjgqPjg7zjg4Hjg6Pjg7zjga7mlbDjgafjgZnjgIJcbmNvbnN0IEZFQVRVUkVfQ05UID0gZXhwb3J0cy5GRUFUVVJFX0NOVCA9IEtFRVBfUFJFVl9DTlQgKiAyICsgKExFRUxBX1pFUk8gPyA0IDogMyk7IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLlhfTEFCRUxTID0gdW5kZWZpbmVkO1xuZXhwb3J0cy5tb3ZlMnh5ID0gbW92ZTJ4eTtcbmV4cG9ydHMuZXYyeHkgPSBldjJ4eTtcbmV4cG9ydHMueHkyZXYgPSB4eTJldjtcbmV4cG9ydHMucnYyZXYgPSBydjJldjtcbmV4cG9ydHMuZXYycnYgPSBldjJydjtcbmV4cG9ydHMuZXYyc3RyID0gZXYyc3RyO1xuZXhwb3J0cy5zdHIyZXYgPSBzdHIyZXY7XG5cbnZhciBfY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMuanMnKTtcblxuY29uc3QgWF9MQUJFTFMgPSBleHBvcnRzLlhfTEFCRUxTID0gJ0BBQkNERUZHSEpLTE1OT1BRUlNUJztcblxuZnVuY3Rpb24gbW92ZTJ4eShzKSB7XG4gICAgY29uc3QgT0ZGU0VUID0gJ2EnLmNoYXJDb2RlQXQoMCkgLSAxO1xuICAgIHJldHVybiBbcy5jaGFyQ29kZUF0KDApIC0gT0ZGU0VULCBfY29uc3RhbnRzLkJTSVpFICsgMSAtIChzLmNoYXJDb2RlQXQoMSkgLSBPRkZTRVQpXTtcbn1cblxuZnVuY3Rpb24gZXYyeHkoZXYpIHtcbiAgICByZXR1cm4gW2V2ICUgX2NvbnN0YW50cy5FQlNJWkUsIE1hdGguZmxvb3IoZXYgLyBfY29uc3RhbnRzLkVCU0laRSldO1xufVxuXG5mdW5jdGlvbiB4eTJldih4LCB5KSB7XG4gICAgcmV0dXJuIHkgKiBfY29uc3RhbnRzLkVCU0laRSArIHg7XG59XG5cbmZ1bmN0aW9uIHJ2MmV2KHJ2KSB7XG4gICAgcmV0dXJuIHJ2ID09PSBfY29uc3RhbnRzLkJWQ05UID8gX2NvbnN0YW50cy5QQVNTIDogcnYgJSBfY29uc3RhbnRzLkJTSVpFICsgMSArIE1hdGguZmxvb3IocnYgLyBfY29uc3RhbnRzLkJTSVpFICsgMSkgKiBfY29uc3RhbnRzLkVCU0laRTtcbn1cblxuZnVuY3Rpb24gZXYycnYoZXYpIHtcbiAgICByZXR1cm4gZXYgPT09IF9jb25zdGFudHMuUEFTUyA/IF9jb25zdGFudHMuQlZDTlQgOiBldiAlIF9jb25zdGFudHMuRUJTSVpFIC0gMSArIE1hdGguZmxvb3IoZXYgLyBfY29uc3RhbnRzLkVCU0laRSAtIDEpICogX2NvbnN0YW50cy5CU0laRTtcbn1cblxuZnVuY3Rpb24gZXYyc3RyKGV2KSB7XG4gICAgaWYgKGV2ID49IF9jb25zdGFudHMuUEFTUykge1xuICAgICAgICByZXR1cm4gJ3Bhc3MnO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IFt4LCB5XSA9IGV2Mnh5KGV2KTtcbiAgICAgICAgcmV0dXJuIFhfTEFCRUxTLmNoYXJBdCh4KSArIHkudG9TdHJpbmcoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHN0cjJldih2KSB7XG4gICAgY29uc3QgdlN0ciA9IHYudG9VcHBlckNhc2UoKTtcbiAgICBpZiAodlN0ciA9PT0gJ1BBU1MnIHx8IHZTdHIgPT09ICdSRVNJR04nKSB7XG4gICAgICAgIHJldHVybiBfY29uc3RhbnRzLlBBU1M7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgeCA9IFhfTEFCRUxTLmluZGV4T2YodlN0ci5jaGFyQXQoMCkpO1xuICAgICAgICBjb25zdCB5ID0gcGFyc2VJbnQodlN0ci5zbGljZSgxKSk7XG4gICAgICAgIHJldHVybiB4eTJldih4LCB5KTtcbiAgICB9XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgX3dvcmtlclJtaSA9IHJlcXVpcmUoJ3dvcmtlci1ybWknKTtcblxudmFyIF9uZXVyYWxfbmV0d29yayA9IHJlcXVpcmUoJy4vbmV1cmFsX25ldHdvcmsuanMnKTtcblxudmFyIF9jb29yZF9jb252ZXJ0ID0gcmVxdWlyZSgnLi9jb29yZF9jb252ZXJ0LmpzJyk7XG5cbnZhciBfY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMuanMnKTtcblxudmFyIF9zcGVlY2ggPSByZXF1aXJlKCcuL3NwZWVjaC5qcycpO1xuXG5jbGFzcyBBOUVuZ2luZSBleHRlbmRzIF93b3JrZXJSbWkuV29ya2VyUk1JIHtcbiAgICBhc3luYyBsb2FkTk4oKSB7XG4gICAgICAgIGF3YWl0IHRoaXMuaW52b2tlUk0oJ2xvYWROTicpO1xuICAgIH1cblxuICAgIGFzeW5jIGNsZWFyKCkge1xuICAgICAgICBhd2FpdCB0aGlzLnN0b3BQb25kZXIoKTtcbiAgICAgICAgYXdhaXQgdGhpcy5pbnZva2VSTSgnY2xlYXInKTtcbiAgICB9XG5cbiAgICBhc3luYyB0aW1lU2V0dGluZ3MobWFpblRpbWUsIGJ5b3lvbWkpIHtcbiAgICAgICAgdGhpcy5tYWluVGltZSA9IG1haW5UaW1lO1xuICAgICAgICB0aGlzLmJ5b3lvbWkgPSBieW95b21pO1xuICAgICAgICBhd2FpdCB0aGlzLmludm9rZVJNKCd0aW1lU2V0dGluZ3MnLCBbbWFpblRpbWUsIGJ5b3lvbWldKTtcbiAgICB9XG5cbiAgICBhc3luYyBnZW5tb3ZlKCkge1xuICAgICAgICBjb25zdCBbbW92ZSwgd2luUmF0ZV0gPSBhd2FpdCB0aGlzLmJlc3RNb3ZlKCk7XG4gICAgICAgIGlmICh3aW5SYXRlIDwgMC4xKSB7XG4gICAgICAgICAgICByZXR1cm4gJ3Jlc2lnbic7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsYXkobW92ZSk7XG4gICAgICAgICAgICByZXR1cm4gKDAsIF9jb29yZF9jb252ZXJ0LmV2MnN0cikobW92ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyBwbGF5KGV2KSB7XG4gICAgICAgIGF3YWl0IHRoaXMuaW52b2tlUk0oJ3BsYXknLCBbZXZdKTtcbiAgICB9XG5cbiAgICBhc3luYyBiZXN0TW92ZSgpIHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuaW52b2tlUk0oJ2Jlc3RNb3ZlJyk7XG4gICAgfVxuXG4gICAgYXN5bmMgZmluYWxTY29yZSgpIHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuaW52b2tlUk0oJ2ZpbmFsU2NvcmUnKTtcbiAgICB9XG5cbiAgICBzdGFydFBvbmRlcigpIHtcbiAgICAgICAgdGhpcy5wb25kZXJQcm9taXNlID0gdGhpcy5pbnZva2VSTSgncG9uZGVyJyk7XG4gICAgfVxuXG4gICAgYXN5bmMgc3RvcFBvbmRlcigpIHtcbiAgICAgICAgaWYgKHRoaXMucG9uZGVyUHJvbWlzZSkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5pbnZva2VSTSgnc3RvcFBvbmRlcicpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wb25kZXJQcm9taXNlO1xuICAgICAgICAgICAgdGhpcy5wb25kZXJQcm9taXNlID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cbn0gLyogZ2xvYmFsICQgSkdPIEJvYXJkQ29udHJvbGxlciAqL1xuXG5cbmNsYXNzIFBsYXlDb250cm9sbGVyIHtcbiAgICBjb25zdHJ1Y3RvcihlbmdpbmUsIGJvYXJkLCBpZ29RdWVzdCA9IGZhbHNlKSB7XG4gICAgICAgIHRoaXMuZW5naW5lID0gZW5naW5lO1xuICAgICAgICB0aGlzLmJvYXJkID0gYm9hcmQ7XG4gICAgICAgIHRoaXMuaXNTZWxmUGxheSA9IGZhbHNlO1xuICAgICAgICB0aGlzLmlnb1F1ZXN0ID0gaWdvUXVlc3Q7XG4gICAgICAgIGlmIChpZ29RdWVzdCkge1xuICAgICAgICAgICAgdGhpcy50aW1lTGVmdCA9IFswLCAvLyBkdW15XG4gICAgICAgICAgICAoMyAqIDYwICsgMSkgKiAxMDAwLCAvLyBibGFja1xuICAgICAgICAgICAgMyAqIDYwICogMTAwMF07XG4gICAgICAgICAgICB0aGlzLnN0YXJ0ID0gRGF0ZS5ub3coKTtcbiAgICAgICAgICAgIHRoaXMudGltZXIgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhcnQgPSBEYXRlLm5vdygpO1xuICAgICAgICAgICAgICAgIHRoaXMudGltZUxlZnRbdGhpcy5ib2FyZC50dXJuXSAtPSBzdGFydCAtIHRoaXMuc3RhcnQ7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGFydCA9IHN0YXJ0O1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmJvYXJkLnR1cm4gPT0gdGhpcy5ib2FyZC5vd25Db2xvcikge1xuICAgICAgICAgICAgICAgICAgICAkKCcjeW91ci10aW1lJykudGV4dChNYXRoLmNlaWwodGhpcy50aW1lTGVmdFt0aGlzLmJvYXJkLnR1cm5dIC8gMTAwMCkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICQoJyNhaS10aW1lJykudGV4dChNYXRoLmNlaWwodGhpcy50aW1lTGVmdFt0aGlzLmJvYXJkLnR1cm5dIC8gMTAwMCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodGhpcy50aW1lTGVmdFt0aGlzLmJvYXJkLnR1cm5dIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKHRoaXMudGltZXIpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVyID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgYWxlcnQoJ+aZgumWk+WIh+OCjOOBp+OBmScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnRpbWVMZWZ0ID0gWzAsIC8vIGR1bXlcbiAgICAgICAgICAgIHRoaXMuYm9hcmQub3duQ29sb3IgPT09IEpHTy5CTEFDSyA/IEluZmluaXR5IDogdGhpcy5lbmdpbmUuYnlveW9taSAqIDEwMDAsIC8vIGJsYWNrXG4gICAgICAgICAgICB0aGlzLmJvYXJkLm93bkNvbG9yID09PSBKR08uQkxBQ0sgPyB0aGlzLmVuZ2luZS5ieW95b21pICogMTAwMCA6IEluZmluaXR5XTtcbiAgICAgICAgICAgIHRoaXMuc3RhcnQgPSBEYXRlLm5vdygpO1xuICAgICAgICAgICAgdGhpcy50aW1lciA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBzdGFydCA9IERhdGUubm93KCk7XG4gICAgICAgICAgICAgICAgdGhpcy50aW1lTGVmdFt0aGlzLmJvYXJkLnR1cm5dIC09IHN0YXJ0IC0gdGhpcy5zdGFydDtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXJ0ID0gc3RhcnQ7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuYm9hcmQudHVybiA9PSB0aGlzLmJvYXJkLm93bkNvbG9yKSB7XG4gICAgICAgICAgICAgICAgICAgICQoJyN5b3VyLXRpbWUnKS50ZXh0KE1hdGguY2VpbCh0aGlzLnRpbWVMZWZ0W3RoaXMuYm9hcmQudHVybl0gLyAxMDAwKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2FpLXRpbWUnKS50ZXh0KE1hdGguY2VpbCh0aGlzLnRpbWVMZWZ0W3RoaXMuYm9hcmQudHVybl0gLyAxMDAwKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgfVxuICAgICAgICAkKCcjeW91ci10aW1lJykudGV4dChNYXRoLmNlaWwodGhpcy50aW1lTGVmdFt0aGlzLmJvYXJkLm93bkNvbG9yXSAvIDEwMDApKTtcbiAgICAgICAgJCgnI2FpLXRpbWUnKS50ZXh0KE1hdGguY2VpbCh0aGlzLnRpbWVMZWZ0W3RoaXMuYm9hcmQub3duQ29sb3IgJSAyICsgMV0gLyAxMDAwKSk7XG4gICAgfVxuXG4gICAgY2xlYXJUaW1lcigpIHtcbiAgICAgICAgaWYgKHRoaXMudGltZXIpIHtcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy50aW1lcik7XG4gICAgICAgICAgICB0aGlzLnRpbWVyID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cbiAgICBzZXRJc1NlbGZQbGF5KGlzU2VsZlBsYXkpIHtcbiAgICAgICAgdGhpcy5pc1NlbGZQbGF5ID0gaXNTZWxmUGxheTtcbiAgICB9XG4gICAgYXN5bmMgdXBkYXRlKGNvb3JkKSB7XG4gICAgICAgIGlmIChjb29yZCA9PT0gJ2VuZCcpIHtcbiAgICAgICAgICAgIHRoaXMuY2xlYXJUaW1lcigpO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCBzY29yZSA9IGF3YWl0IHRoaXMuZmluYWxTY29yZSgpO1xuICAgICAgICAgICAgICAgIGxldCBtZXNzYWdlO1xuICAgICAgICAgICAgICAgIGlmIChzY29yZSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gJ+aMgeeigSc7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IHNjb3JlID4gMCA/ICfpu5InIDogJ+eZvSc7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFic1Njb3JlID0gTWF0aC5hYnMoc2NvcmUpO1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlICs9IGFic1Njb3JlIDwgMSA/ICfljYrnm67li53jgaEnIDogTWF0aC5mbG9vcihhYnNTY29yZSkgKyAn55uu5Y2K5Yud44GhJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbWVzc2FnZSArPSAn44Gn44GZ44GL77yfJztcbiAgICAgICAgICAgICAgICAoMCwgX3NwZWVjaC5zcGVhaykobWVzc2FnZS5yZXBsYWNlKCfljYonLCAn44Gv44KTJykpO1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBhbGVydChtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICAgICAgJChkb2N1bWVudC5ib2R5KS5hZGRDbGFzcygnZW5kJyk7XG4gICAgICAgICAgICAgICAgfSwgMzAwMCk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZSk7XG4gICAgICAgICAgICAgICAgKDAsIF9zcGVlY2guc3BlYWspKCfjgZnjgb/jgb7jgZvjgpPjgIHmlbTlnLDjgafjgY3jgb7jgZvjgpPjgafjgZfjgZ8nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLmlnb1F1ZXN0KSB7XG4gICAgICAgICAgICB0aGlzLnRpbWVMZWZ0W3RoaXMuYm9hcmQudHVybl0gKz0gMTAwMDtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLmJvYXJkLnR1cm4gPT09IHRoaXMuYm9hcmQub3duQ29sb3IpIHtcbiAgICAgICAgICAgIHRoaXMudGltZUxlZnRbdGhpcy5ib2FyZC5vd25Db2xvciAlIDIgKyAxXSA9IHRoaXMuZW5naW5lLmJ5b3lvbWkgKiAxMDAwO1xuICAgICAgICAgICAgJCgnI2FpLXRpbWUnKS50ZXh0KE1hdGguY2VpbCh0aGlzLnRpbWVMZWZ0W3RoaXMuYm9hcmQub3duQ29sb3IgJSAyICsgMV0gLyAxMDAwKSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXRoaXMuaXNTZWxmUGxheSAmJiB0eXBlb2YgY29vcmQgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmVuZ2luZS5zdG9wUG9uZGVyKCk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmVuZ2luZS5wbGF5KCgwLCBfY29vcmRfY29udmVydC54eTJldikoY29vcmQuaSArIDEsIF9jb25zdGFudHMuQlNJWkUgLSBjb29yZC5qKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuaXNTZWxmUGxheSB8fCB0aGlzLmJvYXJkLnR1cm4gIT09IHRoaXMuYm9hcmQub3duQ29sb3IpIHtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IG1vdmUgPSBhd2FpdCB0aGlzLmVuZ2luZS5nZW5tb3ZlKCk7XG4gICAgICAgICAgICAgICAgc3dpdGNoIChtb3ZlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3Jlc2lnbic6XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNsZWFyVGltZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICgwLCBfc3BlZWNoLnNwZWFrKSgn6LKg44GR44G+44GX44GfJywgJ2phLWpwJywgJ2ZlbWFsZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgJChkb2N1bWVudC5ib2R5KS5hZGRDbGFzcygnZW5kJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAncGFzcyc6XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJvYXJkLnBsYXkobnVsbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAoMCwgX3NwZWVjaC5zcGVhaykoJ+ODkeOCueOBl+OBvuOBmScsICdqYS1qcCcsICdmZW1hbGUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGV2ID0gKDAsIF9jb29yZF9jb252ZXJ0LnN0cjJldikobW92ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgeHkgPSAoMCwgX2Nvb3JkX2NvbnZlcnQuZXYyeHkpKGV2KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJvYXJkLnBsYXkobmV3IEpHTy5Db29yZGluYXRlKHh5WzBdIC0gMSwgX2NvbnN0YW50cy5CU0laRSAtIHh5WzFdKSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgMCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmVuZ2luZS5zdGFydFBvbmRlcigpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYXN5bmMgcGFzcygpIHtcbiAgICAgICAgaWYgKHRoaXMuYm9hcmQub3duQ29sb3IgPT09IHRoaXMuYm9hcmQudHVybikge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5lbmdpbmUuc3RvcFBvbmRlcigpO1xuICAgICAgICAgICAgdGhpcy5lbmdpbmUucGxheShfY29uc3RhbnRzLlBBU1MpO1xuICAgICAgICAgICAgdGhpcy5ib2FyZC5wbGF5KG51bGwpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYXN5bmMgZmluYWxTY29yZSgpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgJC5wb3N0KHtcbiAgICAgICAgICAgIHVybDogJ2h0dHA6Ly8zNS4yMDMuMTYxLjEwMC9nbnVnbycsXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgc2dmOiB0aGlzLmJvYXJkLmpyZWNvcmQudG9TZ2YoKSxcbiAgICAgICAgICAgICAgICBtb3ZlOiAnZXN0JyxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdhZnRlcm1hdGgnLFxuICAgICAgICAgICAgICAgIHJ1bGU6IHRoaXMuYm9hcmQuanJlY29yZC5nZXRSb290Tm9kZSgpLmluZm8ua29taSA9PT0gJzYuNScgPyAnamFwYW5lc2UnIDogJ2NoaW5lc2UnXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoL0ppZ28vLnRlc3QocmVzdWx0KSkge1xuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgbWF0Y2ggPSByZXN1bHQubWF0Y2goLyhCbGFja3xXaGl0ZSkgd2lucyBieSAoWzAtOS5dKykgcG9pbnRzLyk7XG4gICAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICAgICAgbGV0IHNjb3JlID0gcGFyc2VGbG9hdChtYXRjaFsyXSk7XG4gICAgICAgICAgICBpZiAobWF0Y2hbMV0gPT09ICdCbGFjaycpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2NvcmU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAtc2NvcmU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cblxufVxuXG5hc3luYyBmdW5jdGlvbiBtYWluKCkge1xuICAgIGNvbnN0IGJvYXJkID0gYXdhaXQgbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlcywgcmVqKSB7XG4gICAgICAgIG5ldyBCb2FyZENvbnRyb2xsZXIoX2NvbnN0YW50cy5CU0laRSwgMCwgNywgcmVzKTtcbiAgICB9KTtcbiAgICAvLyBKR0/jga7jg6zjg7Pjg4Djg6rjg7PjgrDjgpLlrozkuobjgZXjgZvjgovjgZ/jgoHjgatzZXRUaW1lb3V044Gn44Kk44OZ44Oz44OI44Or44O844OX44KS6YCy44KB44KLXG4gICAgc2V0VGltZW91dChhc3luYyBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBhd2FpdCBlbmdpbmUubG9hZE5OKCk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGlmIChlLm1lc3NhZ2UgPT09ICdObyBiYWNrZW5kIGlzIGF2YWlsYWJsZScpIHtcbiAgICAgICAgICAgICAgICBpZiAoLyhNYWMgT1MgWCAxMF8xM3woaVBhZHxpUGhvbmV8aVBvZCk7IENQVSBPUyAxMSkuKlNhZmFyaS8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSAmJiAhL0Nocm9tZS8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSkge1xuICAgICAgICAgICAgICAgICAgICAoMCwgX3NwZWVjaC5zcGVhaykoJ+aui+W/teOBquOBjOOCieOBiuS9v+OBhOOBruODluODqeOCpuOCtuOBp+OBr+WLleOBjeOBvuOBm+OCk+OAglNhZmFyaeOCkuOBiuS9v+OBhOOBp+OBmeOBreOAguOAjOmWi+eZuuOAjeODoeODi+ODpeODvOOBruOAjOWun+mok+eahOOBquapn+iDveOAjeOBp+OAjFdlYkdQVeOAjeOCkuacieWKueOBq+OBmeOCi+OBqOWLleOBj+OBi+OCguOBl+OCjOOBvuOBm+OCkycsICdqYS1qcCcsICdmZW1hbGUnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCEoMCwgX3NwZWVjaC5zcGVhaykoJ+aui+W/teOBquOBjOOCieOBiuS9v+OBhOOBruODluODqeOCpuOCtuOBp+OBr+WLleOBjeOBvuOBm+OCkycsICdqYS1qcCcsICdmZW1hbGUnKSkge1xuICAgICAgICAgICAgICAgICAgICBhbGVydCgn5q6L5b+144Gq44GM44KJ44GK5L2/44GE44Gu44OW44Op44Km44K244Gn44Gv5YuV44GN44G+44Gb44KTJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGNvbmRpdGlvbiA9IGF3YWl0IG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXMsIHJlaikge1xuICAgICAgICAgICAgY29uc3QgJHN0YXJ0TW9kYWwgPSAkKCcjc3RhcnQtbW9kYWwnKTtcbiAgICAgICAgICAgICRzdGFydE1vZGFsLm1vZGFsKCdzaG93Jyk7XG4gICAgICAgICAgICAkc3RhcnRNb2RhbC5vbmUoJ2hpZGRlbi5icy5tb2RhbCcsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgJGNvbmRpdGlvbkZvcm0gPSAkKCcjY29uZGl0aW9uLWZvcm0nKTtcbiAgICAgICAgICAgICAgICByZXMoe1xuICAgICAgICAgICAgICAgICAgICBjb2xvcjogJGNvbmRpdGlvbkZvcm1bMF1bJ2NvbG9yJ10udmFsdWUsXG4gICAgICAgICAgICAgICAgICAgIHRpbWVSdWxlOiAkY29uZGl0aW9uRm9ybVswXVsndGltZSddLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICB0aW1lOiBwYXJzZUludCgkY29uZGl0aW9uRm9ybVswXVsnYWktYnlveW9taSddLnZhbHVlKVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICBzd2l0Y2ggKGNvbmRpdGlvbi50aW1lUnVsZSkge1xuICAgICAgICAgICAgY2FzZSAnYWktdGltZSc6XG4gICAgICAgICAgICAgICAgYXdhaXQgZW5naW5lLnRpbWVTZXR0aW5ncygwLCBjb25kaXRpb24udGltZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdpZ28tcXVlc3QnOlxuICAgICAgICAgICAgICAgIGF3YWl0IGVuZ2luZS50aW1lU2V0dGluZ3MoMyAqIDYwICsgNTUsIDEpOyAvLyA56Lev55uk44Gv5bmz5Z2H5omL5pWw44GMMTEw5omL44KJ44GX44GE44Gu44Gn44CBNTXjga7jg5XjgqPjg4Pjgrfjg6Pjg7znp5LjgpLov73liqBcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29uZGl0aW9uLmNvbG9yID09PSAnVycpIHtcbiAgICAgICAgICAgIGJvYXJkLnNldE93bkNvbG9yKEpHTy5XSElURSk7XG4gICAgICAgICAgICBib2FyZC5zZXRLb21pKDUuNSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBib2FyZC5zZXRPd25Db2xvcihKR08uQkxBQ0spO1xuICAgICAgICAgICAgYm9hcmQuc2V0S29taSg2LjUpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGNvbnRyb2xsZXIgPSBuZXcgUGxheUNvbnRyb2xsZXIoZW5naW5lLCBib2FyZCwgY29uZGl0aW9uLnRpbWVSdWxlID09PSAnaWdvLXF1ZXN0Jyk7XG4gICAgICAgIGNvbnN0IGlzU2VsZlBsYXkgPSBjb25kaXRpb24uY29sb3IgPT09ICdzZWxmLXBsYXknO1xuICAgICAgICBpZiAoIWlzU2VsZlBsYXkpIHtcbiAgICAgICAgICAgICgwLCBfc3BlZWNoLnNwZWFrKSgn44GK6aGY44GE44GX44G+44GZJywgJ2phLWpwJywgJ2ZlbWFsZScpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRyb2xsZXIuc2V0SXNTZWxmUGxheShpc1NlbGZQbGF5KTtcbiAgICAgICAgYm9hcmQuYWRkT2JzZXJ2ZXIoY29udHJvbGxlcik7XG4gICAgICAgICQoJyNwYXNzJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICBjb250cm9sbGVyLnBhc3MoKTtcbiAgICAgICAgfSk7XG4gICAgICAgICQoJyNyZXNpZ24nKS5vbignY2xpY2snLCBhc3luYyBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIGNvbnRyb2xsZXIuY2xlYXJUaW1lcigpO1xuICAgICAgICAgICAgYXdhaXQgZW5naW5lLnN0b3BQb25kZXIoKTtcbiAgICAgICAgICAgICgwLCBfc3BlZWNoLnNwZWFrKSgn44GC44KK44GM44Go44GG44GU44GW44GE44G+44GX44GfJywgJ2phLWpwJywgJ2ZlbWFsZScpO1xuICAgICAgICAgICAgJChkb2N1bWVudC5ib2R5KS5hZGRDbGFzcygnZW5kJyk7XG4gICAgICAgIH0pO1xuICAgICAgICAkKCcjcmV0cnknKS5vbmUoJ2NsaWNrJywgYXN5bmMgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAkKCcjcGFzcycpLm9mZignY2xpY2snKTtcbiAgICAgICAgICAgICQoJyNyZXNpZ24nKS5vZmYoJ2NsaWNrJyk7XG4gICAgICAgICAgICBib2FyZC5kZXN0cm95KCk7XG4gICAgICAgICAgICBlbmdpbmUuY2xlYXIoKTtcbiAgICAgICAgICAgICQoZG9jdW1lbnQuYm9keSkucmVtb3ZlQ2xhc3MoJ2VuZCcpO1xuICAgICAgICAgICAgc2V0VGltZW91dChtYWluLCAwKTtcbiAgICAgICAgfSk7XG4gICAgfSwgMCk7XG59XG5cbmNvbnN0IHdvcmtlciA9IG5ldyBXb3JrZXIoJ2pzL3dvcmtlci5qcycpO1xuKDAsIF93b3JrZXJSbWkucmVzaWd0ZXJXb3JrZXJSTUkpKHdvcmtlciwgX25ldXJhbF9uZXR3b3JrLk5ldXJhbE5ldHdvcmspO1xuY29uc3QgZW5naW5lID0gbmV3IEE5RW5naW5lKHdvcmtlcik7XG5tYWluKCk7IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLk5ldXJhbE5ldHdvcmsgPSB1bmRlZmluZWQ7XG5cbnZhciBfY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMuanMnKTtcblxudmFyIF91dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcblxuaWYgKCFBcnJheUJ1ZmZlci5wcm90b3R5cGUuc2xpY2UpIHtcbiAgICBBcnJheUJ1ZmZlci5wcm90b3R5cGUuc2xpY2UgPSBmdW5jdGlvbiAoc3RhcnQsIGVuZCkge1xuICAgICAgICB2YXIgdGhhdCA9IG5ldyBVaW50OEFycmF5KHRoaXMpO1xuICAgICAgICBpZiAoZW5kID09IHVuZGVmaW5lZCkgZW5kID0gdGhhdC5sZW5ndGg7XG4gICAgICAgIHZhciByZXN1bHQgPSBuZXcgQXJyYXlCdWZmZXIoZW5kIC0gc3RhcnQpO1xuICAgICAgICB2YXIgcmVzdWx0QXJyYXkgPSBuZXcgVWludDhBcnJheShyZXN1bHQpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJlc3VsdEFycmF5Lmxlbmd0aDsgaSsrKSByZXN1bHRBcnJheVtpXSA9IHRoYXRbaSArIHN0YXJ0XTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xufSAvKiBnbG9iYWwgV2ViRE5OICovXG5jbGFzcyBOZXVyYWxOZXR3b3JrIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpcy5ubiA9IG51bGw7XG4gICAgfVxuXG4gICAgYXN5bmMgbG9hZCgpIHtcbiAgICAgICAgaWYgKHRoaXMubm4pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLm5uID0gYXdhaXQgV2ViRE5OLmxvYWQoX2NvbnN0YW50cy5MRUVMQV9aRVJPID8gJy4vb3V0cHV0X2xlZWxhJyA6ICcuL291dHB1dCcsIHsgYmFja2VuZE9yZGVyOiBbJ3dlYmdwdScsICd3ZWJnbCddIH0pO1xuICAgIH1cblxuICAgIGFzeW5jIGV2YWx1YXRlKC4uLmlucHV0cykge1xuICAgICAgICBjb25zdCB2aWV3cyA9IHRoaXMubm4uZ2V0SW5wdXRWaWV3cygpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGlucHV0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmlld3NbaV0uc2V0KGlucHV0c1tpXSk7XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgdGhpcy5ubi5ydW4oKTtcbiAgICAgICAgcmV0dXJuIHRoaXMubm4uZ2V0T3V0cHV0Vmlld3MoKS5tYXAoZSA9PiBlLnRvQWN0dWFsKCkuc2xpY2UoMCkpOyAvLyB0by5BY3R1YWzjgZ3jga7jgoLjga7jgafjga93b3JrZXLlgbTjgadkZXRhY2jjgYzjgafjgY3jgarjgYTmqKHmp5hcbiAgICB9XG59XG5leHBvcnRzLk5ldXJhbE5ldHdvcmsgPSBOZXVyYWxOZXR3b3JrOyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5zcGVhayA9IHNwZWFrO1xuZnVuY3Rpb24gc3BlYWsodGV4dCwgbGFuZywgZ2VuZGVyKSB7XG4gICAgaWYgKCFTcGVlY2hTeW50aGVzaXNVdHRlcmFuY2UpIHJldHVybiBmYWxzZTtcblxuICAgIHN3aXRjaCAobGFuZykge1xuICAgICAgICBjYXNlICdlbic6XG4gICAgICAgICAgICBsYW5nID0gJ2VuLXVzJztcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdqYSc6XG4gICAgICAgICAgICBsYW5nID0gJ2phLWpwJztcbiAgICAgICAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBjb25zdCB1dHRlcmFuY2UgPSBuZXcgU3BlZWNoU3ludGhlc2lzVXR0ZXJhbmNlKHRleHQpO1xuICAgIGlmICgvKGlQaG9uZXxpUGFkfGlQb2QpKD89LipPUyBbNy04XSkvLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCkpIHV0dGVyYW5jZS5yYXRlID0gMC4yO1xuICAgIGNvbnN0IHZvaWNlcyA9IHNwZWVjaFN5bnRoZXNpcy5nZXRWb2ljZXMoKS5maWx0ZXIoZSA9PiBlLmxhbmcudG9Mb3dlckNhc2UoKSA9PT0gbGFuZyk7XG4gICAgbGV0IHZvaWNlID0gbnVsbDtcbiAgICBpZiAodm9pY2VzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgbGV0IG5hbWVzID0gbnVsbDtcbiAgICAgICAgc3dpdGNoIChsYW5nKSB7XG4gICAgICAgICAgICBjYXNlICdqYS1qcCc6XG4gICAgICAgICAgICAgICAgc3dpdGNoIChnZW5kZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnbWFsZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lcyA9IFsnT3RveWEnLCAnSGF0dG9yaScsICdJY2hpcm8nXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdmZW1hbGUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZXMgPSBbJ08tcmVu77yI5ouh5by177yJJywgJ08tcmVuJywgJ0t5b2tvJywgJ0hhcnVrYSddOyAvLyBXaW5kb3dzIDEw44GuQXl1bWnjga7lo7Djga/ku4rjgbLjgajjgaRcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2VuLXVzJzpcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGdlbmRlcikge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdtYWxlJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWVzID0gWydBbGV4JywgJ0ZyZWQnXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdmZW1hbGUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZXMgPSBbJ1NhbWFudGhhJywgJ1ZpY3RvcmlhJ107XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5hbWVzKSB7XG4gICAgICAgICAgICB2b2ljZSA9IHZvaWNlcy5maWx0ZXIodiA9PiBuYW1lcy5zb21lKG4gPT4gdi5uYW1lLmluZGV4T2YobikgPj0gMCkpWzBdO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdm9pY2UpIHtcbiAgICAgICAgICAgIHZvaWNlID0gdm9pY2VzLmZpbHRlcih2ID0+IHYuZ2VuZGVyICYmIHYuZ2VuZGVyLnRvTG93ZXJDYXNlKCkgPT09IGdlbmRlcilbMF07XG4gICAgICAgIH1cbiAgICB9XG4gICAgdXR0ZXJhbmNlLnZvaWNlID0gdm9pY2UgfHwgdm9pY2VzWzBdO1xuICAgIC8vIGlPUyAxMCBTYWZhcmkgaGFzIGEgYnVnIHRoYXQgdXR0ZXJhbmNlLnZvaWNlIGlzIG5vIGVmZmVjdC5cbiAgICB1dHRlcmFuY2Uudm9sdW1lID0gcGFyc2VGbG9hdChsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgndm9sdW1lJykgfHwgJzEuMCcpO1xuICAgIHNwZWVjaFN5bnRoZXNpcy5zcGVhayh1dHRlcmFuY2UpO1xuICAgIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiB1bmxvY2soKSB7XG4gICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdW5sb2NrKTtcbiAgICBzcGVlY2hTeW50aGVzaXMuc3BlYWsobmV3IFNwZWVjaFN5bnRoZXNpc1V0dGVyYW5jZSgnJykpO1xufVxuXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIGZ1bmN0aW9uIChldmVudCkge1xuICAgIGlmIChzcGVlY2hTeW50aGVzaXMpIHtcbiAgICAgICAgc3BlZWNoU3ludGhlc2lzLmdldFZvaWNlcygpO1xuICAgICAgICBpZiAoc3BlZWNoU3ludGhlc2lzLm9udm9pY2VzY2hhbmdlZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBzcGVlY2hTeW50aGVzaXMub252b2ljZXNjaGFuZ2VkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdvbnZvaWNlc2NoYW5nZWQnKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdW5sb2NrLCBmYWxzZSk7IC8vIGZvciBpT1NcbiAgICB9XG59KTsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuc2h1ZmZsZSA9IHNodWZmbGU7XG5leHBvcnRzLm1vc3RDb21tb24gPSBtb3N0Q29tbW9uO1xuZXhwb3J0cy5hcmdzb3J0ID0gYXJnc29ydDtcbmV4cG9ydHMuYXJnbWF4ID0gYXJnbWF4O1xuZXhwb3J0cy5oYXNoID0gaGFzaDtcbmV4cG9ydHMuc29mdG1heCA9IHNvZnRtYXg7XG5leHBvcnRzLnByaW50UHJvYiA9IHByaW50UHJvYjtcblxudmFyIF9jb25zdGFudHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cy5qcycpO1xuXG5mdW5jdGlvbiBzaHVmZmxlKGFycmF5KSB7XG4gICAgbGV0IG4gPSBhcnJheS5sZW5ndGg7XG4gICAgbGV0IHQ7XG4gICAgbGV0IGk7XG5cbiAgICB3aGlsZSAobikge1xuICAgICAgICBpID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogbi0tKTtcbiAgICAgICAgdCA9IGFycmF5W25dO1xuICAgICAgICBhcnJheVtuXSA9IGFycmF5W2ldO1xuICAgICAgICBhcnJheVtpXSA9IHQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFycmF5O1xufVxuXG5mdW5jdGlvbiBtb3N0Q29tbW9uKGFycmF5KSB7XG4gICAgY29uc3QgbWFwID0gbmV3IE1hcCgpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgZSA9IGFycmF5W2ldO1xuICAgICAgICBpZiAobWFwLmhhcyhlKSkge1xuICAgICAgICAgICAgbWFwLnNldChlLCBtYXAuZ2V0KGUpICsgMSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBtYXAuc2V0KGUsIDEpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGxldCBtYXhLZXk7XG4gICAgbGV0IG1heFZhbHVlID0gLTE7XG4gICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgbWFwLmVudHJpZXMoKSkge1xuICAgICAgICBpZiAodmFsdWUgPiBtYXhWYWx1ZSkge1xuICAgICAgICAgICAgbWF4S2V5ID0ga2V5O1xuICAgICAgICAgICAgbWF4VmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbWF4S2V5O1xufVxuXG5mdW5jdGlvbiBhcmdzb3J0KGFycmF5LCByZXZlcnNlKSB7XG4gICAgY29uc3QgZW4gPSBBcnJheS5mcm9tKGFycmF5KS5tYXAoKGUsIGkpID0+IFtpLCBlXSk7XG4gICAgZW4uc29ydCgoYSwgYikgPT4gcmV2ZXJzZSA/IGJbMV0gLSBhWzFdIDogYVsxXSAtIGJbMV0pO1xuICAgIHJldHVybiBlbi5tYXAoZSA9PiBlWzBdKTtcbn1cblxuZnVuY3Rpb24gYXJnbWF4KGFycmF5KSB7XG4gICAgbGV0IG1heEluZGV4O1xuICAgIGxldCBtYXhWYWx1ZSA9IC1JbmZpbml0eTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IHYgPSBhcnJheVtpXTtcbiAgICAgICAgaWYgKHYgPiBtYXhWYWx1ZSkge1xuICAgICAgICAgICAgbWF4SW5kZXggPSBpO1xuICAgICAgICAgICAgbWF4VmFsdWUgPSB2O1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBtYXhJbmRleDtcbn1cblxuZnVuY3Rpb24gaGFzaChzdHIpIHtcbiAgICBsZXQgaGFzaCA9IDUzODE7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgY2hhciA9IHN0ci5jaGFyQ29kZUF0KGkpO1xuICAgICAgICBoYXNoID0gKGhhc2ggPDwgNSkgKyBoYXNoICsgY2hhcjsgLyogaGFzaCAqIDMzICsgYyAqL1xuICAgICAgICBoYXNoID0gaGFzaCAmIGhhc2g7IC8vIENvbnZlcnQgdG8gMzJiaXQgaW50ZWdlclxuICAgIH1cbiAgICByZXR1cm4gTWF0aC5hYnMoaGFzaCk7XG59XG5cbmZ1bmN0aW9uIHNvZnRtYXgoaW5wdXQsIHRlbXBlcmF0dXJlID0gMS4wKSB7XG4gICAgY29uc3Qgb3V0cHV0ID0gbmV3IEZsb2F0MzJBcnJheShpbnB1dC5sZW5ndGgpO1xuICAgIGNvbnN0IGFscGhhID0gTWF0aC5tYXguYXBwbHkobnVsbCwgaW5wdXQpO1xuICAgIGxldCBkZW5vbSA9IDAuMDtcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaW5wdXQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgdmFsID0gTWF0aC5leHAoKGlucHV0W2ldIC0gYWxwaGEpIC8gdGVtcGVyYXR1cmUpO1xuICAgICAgICBkZW5vbSArPSB2YWw7XG4gICAgICAgIG91dHB1dFtpXSA9IHZhbDtcbiAgICB9XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG91dHB1dC5sZW5ndGg7IGkrKykge1xuICAgICAgICBvdXRwdXRbaV0gLz0gZGVub207XG4gICAgfVxuXG4gICAgcmV0dXJuIG91dHB1dDtcbn1cblxuZnVuY3Rpb24gcHJpbnRQcm9iKHByb2IpIHtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IF9jb25zdGFudHMuQlNJWkU7IHkrKykge1xuICAgICAgICBsZXQgc3RyID0gYCR7eSArIDF9IGA7XG4gICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgX2NvbnN0YW50cy5CU0laRTsgeCsrKSB7XG4gICAgICAgICAgICBzdHIgKz0gKCcgICcgKyBwcm9iW3ggKyB5ICogX2NvbnN0YW50cy5CU0laRV0udG9GaXhlZCgxKSkuc2xpY2UoLTUpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKHN0cik7XG4gICAgfVxuICAgIGNvbnNvbGUubG9nKCdwYXNzPSVzJywgcHJvYltwcm9iLmxlbmd0aCAtIDFdLnRvRml4ZWQoMSkpO1xufSJdfQ==
