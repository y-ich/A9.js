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

function i18nSpeak(message) {
    return (0, _speech.speak)(message, i18n.lang, 'female');
} /* global $ JGO BoardController i18n */


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
}

class PlayController {
    constructor(engine, board, igoQuest = false) {
        this.engine = engine;
        this.board = board;
        this.isSelfPlay = false;
        this.igoQuest = igoQuest;
        if (igoQuest) {
            this.timeLeft = [0, // dumy
            3 * 60 * 1000, // black
            3 * 60 * 1000];
            this.start = Date.now();
            this.timer = setInterval(() => {
                const start = Date.now();
                this.timeLeft[this.board.turn] -= start - this.start;
                this.start = start;
                $('#your-time').text(Math.ceil(this.timeLeft[this.board.ownColor] / 1000));
                $('#ai-time').text(Math.ceil(this.timeLeft[this.board.ownColor % 2 + 1] / 1000));
                if (this.timeLeft[this.board.turn] < 0) {
                    clearInterval(this.timer);
                    this.timer = null;
                    alert(i18n.timeout);
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
            i18nSpeak(i18n.scoring);
            try {
                const score = await this.finalScore();
                let message;
                if (score === 0) {
                    message = i18n.jigo;
                } else {
                    message = i18n[score > 0 ? 'black' : 'white'];
                    switch (i18n.lang) {
                        case 'en':
                            message += ` won by ${score} points`;
                            break;
                        case 'ja':
                            {
                                const absScore = Math.abs(score);
                                message += absScore < 1 ? '半目勝ち' : Math.floor(absScore) + '目半勝ち';
                            }
                            break;
                    }
                }
                switch (i18n.lang) {
                    case 'en':
                        message += '?';
                        break;
                    case 'ja':
                        message += 'ですか？';
                        break;
                }
                i18nSpeak(message.replace('半', 'はん'));
                setTimeout(function () {
                    alert(message);
                    $(document.body).addClass('end');
                }, 3000);
            } catch (e) {
                console.log(e);
                i18nSpeak(i18n.failScoring);
            }
            return;
        }

        if (this.igoQuest) {
            this.timeLeft[this.board.turn % 2 + 1] += 1000;
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
                        i18nSpeak(i18n.resign);
                        $(document.body).addClass('end');
                        break;
                    case 'pass':
                        this.board.play(null);
                        i18nSpeak(i18n.pass);
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
            url: 'https://mimiaka-python.herokuapp.com/gnugo', // httpでは通信できなかった。 'http://35.203.161.100/gnugo',
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
    const $startModal = $('#start-modal');
    $startModal.modal('show');
    setTimeout(async function () {
        try {
            await engine.loadNN();
            $('#loading-message').text(i18n.finishDownload);
            $('#start-game').prop('disabled', false);
        } catch (e) {
            if (e.message === 'No backend is available') {
                if (/(Mac OS X 10_13|(iPad|iPhone|iPod); CPU OS 11).*Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)) {
                    i18nSpeak(i18n.notSupport + i18n.safariWithoutWebgpu);
                } else if (!i18nSpeak(i18n.notSupport)) {
                    alert(i18n.notSupport);
                }
            } else {
                console.error(e);
            }
            return;
        }
        const condition = await new Promise(function (res, rej) {
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
            i18nSpeak(i18n.startGreet);
        }
        controller.setIsSelfPlay(isSelfPlay);
        board.addObserver(controller);
        $('#pass').on('click', function (event) {
            controller.pass();
        });
        $('#resign').on('click', async function (event) {
            controller.clearTimer();
            await engine.stopPonder();
            i18nSpeak(i18n.endGreet);
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
} /* global WebDNN $ */


function setLoadingBar(percentage) {
    const $loadingBar = $('#loading-bar');
    $loadingBar.attr('aria-valuenow', percentage);
    $loadingBar.css('width', percentage.toString() + '%');
}

class NeuralNetwork {
    constructor() {
        this.nn = null;
    }

    async load() {
        if (this.nn) {
            return;
        }
        const options = {
            backendOrder: ['webgpu', 'webgl'],
            progressCallback: function (loaded, total) {
                setLoadingBar(loaded / total * 100);
            }
        };
        setLoadingBar(0);
        this.nn = await WebDNN.load(_constants.LEELA_ZERO ? './output_leela' : './output', options);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnNvbi1vYmplY3RpZC9vYmplY3RpZC5qcyIsIm5vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvd29ya2VyLXJtaS93b3JrZXItcm1pLmpzIiwic3JjL2NvbnN0YW50cy5qcyIsInNyYy9jb29yZF9jb252ZXJ0LmpzIiwic3JjL21haW4uanMiLCJzcmMvbmV1cmFsX25ldHdvcmsuanMiLCJzcmMvc3BlZWNoLmpzIiwic3JjL3V0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDOU5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc31yZXR1cm4gZX0pKCkiLCJcbnZhciBNQUNISU5FX0lEID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMHhGRkZGRkYpO1xudmFyIGluZGV4ID0gT2JqZWN0SUQuaW5kZXggPSBwYXJzZUludChNYXRoLnJhbmRvbSgpICogMHhGRkZGRkYsIDEwKTtcbnZhciBwaWQgPSAodHlwZW9mIHByb2Nlc3MgPT09ICd1bmRlZmluZWQnIHx8IHR5cGVvZiBwcm9jZXNzLnBpZCAhPT0gJ251bWJlcicgPyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDAwMDApIDogcHJvY2Vzcy5waWQpICUgMHhGRkZGO1xuXG4vKipcbiAqIERldGVybWluZSBpZiBhbiBvYmplY3QgaXMgQnVmZmVyXG4gKlxuICogQXV0aG9yOiAgIEZlcm9zcyBBYm91a2hhZGlqZWggPGZlcm9zc0BmZXJvc3Mub3JnPiA8aHR0cDovL2Zlcm9zcy5vcmc+XG4gKiBMaWNlbnNlOiAgTUlUXG4gKlxuICovXG52YXIgaXNCdWZmZXIgPSBmdW5jdGlvbiAob2JqKSB7XG4gIHJldHVybiAhIShcbiAgb2JqICE9IG51bGwgJiZcbiAgb2JqLmNvbnN0cnVjdG9yICYmXG4gIHR5cGVvZiBvYmouY29uc3RydWN0b3IuaXNCdWZmZXIgPT09ICdmdW5jdGlvbicgJiZcbiAgb2JqLmNvbnN0cnVjdG9yLmlzQnVmZmVyKG9iailcbiAgKVxufTtcblxuLyoqXG4gKiBDcmVhdGUgYSBuZXcgaW1tdXRhYmxlIE9iamVjdElEIGluc3RhbmNlXG4gKlxuICogQGNsYXNzIFJlcHJlc2VudHMgdGhlIEJTT04gT2JqZWN0SUQgdHlwZVxuICogQHBhcmFtIHtTdHJpbmd8TnVtYmVyfSBhcmcgQ2FuIGJlIGEgMjQgYnl0ZSBoZXggc3RyaW5nLCAxMiBieXRlIGJpbmFyeSBzdHJpbmcgb3IgYSBOdW1iZXIuXG4gKiBAcmV0dXJuIHtPYmplY3R9IGluc3RhbmNlIG9mIE9iamVjdElELlxuICovXG5mdW5jdGlvbiBPYmplY3RJRChhcmcpIHtcbiAgaWYoISh0aGlzIGluc3RhbmNlb2YgT2JqZWN0SUQpKSByZXR1cm4gbmV3IE9iamVjdElEKGFyZyk7XG4gIGlmKGFyZyAmJiAoKGFyZyBpbnN0YW5jZW9mIE9iamVjdElEKSB8fCBhcmcuX2Jzb250eXBlPT09XCJPYmplY3RJRFwiKSlcbiAgICByZXR1cm4gYXJnO1xuXG4gIHZhciBidWY7XG5cbiAgaWYoaXNCdWZmZXIoYXJnKSB8fCAoQXJyYXkuaXNBcnJheShhcmcpICYmIGFyZy5sZW5ndGg9PT0xMikpIHtcbiAgICBidWYgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmcpO1xuICB9XG4gIGVsc2UgaWYodHlwZW9mIGFyZyA9PT0gXCJzdHJpbmdcIikge1xuICAgIGlmKGFyZy5sZW5ndGghPT0xMiAmJiAhT2JqZWN0SUQuaXNWYWxpZChhcmcpKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQXJndW1lbnQgcGFzc2VkIGluIG11c3QgYmUgYSBzaW5nbGUgU3RyaW5nIG9mIDEyIGJ5dGVzIG9yIGEgc3RyaW5nIG9mIDI0IGhleCBjaGFyYWN0ZXJzXCIpO1xuXG4gICAgYnVmID0gYnVmZmVyKGFyZyk7XG4gIH1cbiAgZWxzZSBpZigvbnVtYmVyfHVuZGVmaW5lZC8udGVzdCh0eXBlb2YgYXJnKSkge1xuICAgIGJ1ZiA9IGJ1ZmZlcihnZW5lcmF0ZShhcmcpKTtcbiAgfVxuXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBcImlkXCIsIHtcbiAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KHRoaXMsIGJ1Zik7IH1cbiAgfSk7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBcInN0clwiLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIGJ1Zi5tYXAoaGV4LmJpbmQodGhpcywgMikpLmpvaW4oJycpOyB9XG4gIH0pO1xufVxubW9kdWxlLmV4cG9ydHMgPSBPYmplY3RJRDtcbk9iamVjdElELmdlbmVyYXRlID0gZ2VuZXJhdGU7XG5PYmplY3RJRC5kZWZhdWx0ID0gT2JqZWN0SUQ7XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBPYmplY3RJRCBmcm9tIGEgc2Vjb25kIGJhc2VkIG51bWJlciwgd2l0aCB0aGUgcmVzdCBvZiB0aGUgT2JqZWN0SUQgemVyb2VkIG91dC4gVXNlZCBmb3IgY29tcGFyaXNvbnMgb3Igc29ydGluZyB0aGUgT2JqZWN0SUQuXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHRpbWUgYW4gaW50ZWdlciBudW1iZXIgcmVwcmVzZW50aW5nIGEgbnVtYmVyIG9mIHNlY29uZHMuXG4gKiBAcmV0dXJuIHtPYmplY3RJRH0gcmV0dXJuIHRoZSBjcmVhdGVkIE9iamVjdElEXG4gKiBAYXBpIHB1YmxpY1xuICovXG5PYmplY3RJRC5jcmVhdGVGcm9tVGltZSA9IGZ1bmN0aW9uKHRpbWUpe1xuICB0aW1lID0gcGFyc2VJbnQodGltZSwgMTApICUgMHhGRkZGRkZGRjtcbiAgcmV0dXJuIG5ldyBPYmplY3RJRChoZXgoOCx0aW1lKStcIjAwMDAwMDAwMDAwMDAwMDBcIik7XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYW4gT2JqZWN0SUQgZnJvbSBhIGhleCBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgYW4gT2JqZWN0SUQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGhleFN0cmluZyBjcmVhdGUgYSBPYmplY3RJRCBmcm9tIGEgcGFzc2VkIGluIDI0IGJ5dGUgaGV4c3RyaW5nLlxuICogQHJldHVybiB7T2JqZWN0SUR9IHJldHVybiB0aGUgY3JlYXRlZCBPYmplY3RJRFxuICogQGFwaSBwdWJsaWNcbiAqL1xuT2JqZWN0SUQuY3JlYXRlRnJvbUhleFN0cmluZyA9IGZ1bmN0aW9uKGhleFN0cmluZykge1xuICBpZighT2JqZWN0SUQuaXNWYWxpZChoZXhTdHJpbmcpKVxuICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgT2JqZWN0SUQgaGV4IHN0cmluZ1wiKTtcblxuICByZXR1cm4gbmV3IE9iamVjdElEKGhleFN0cmluZyk7XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiBhIHZhbHVlIGlzIGEgdmFsaWQgYnNvbiBPYmplY3RJZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBvYmplY3RpZCBDYW4gYmUgYSAyNCBieXRlIGhleCBzdHJpbmcgb3IgYW4gaW5zdGFuY2Ugb2YgT2JqZWN0SUQuXG4gKiBAcmV0dXJuIHtCb29sZWFufSByZXR1cm4gdHJ1ZSBpZiB0aGUgdmFsdWUgaXMgYSB2YWxpZCBic29uIE9iamVjdElELCByZXR1cm4gZmFsc2Ugb3RoZXJ3aXNlLlxuICogQGFwaSBwdWJsaWNcbiAqXG4gKiBUSEUgTkFUSVZFIERPQ1VNRU5UQVRJT04gSVNOJ1QgQ0xFQVIgT04gVEhJUyBHVVkhXG4gKiBodHRwOi8vbW9uZ29kYi5naXRodWIuaW8vbm9kZS1tb25nb2RiLW5hdGl2ZS9hcGktYnNvbi1nZW5lcmF0ZWQvb2JqZWN0aWQuaHRtbCNvYmplY3RpZC1pc3ZhbGlkXG4gKi9cbk9iamVjdElELmlzVmFsaWQgPSBmdW5jdGlvbihvYmplY3RpZCkge1xuICBpZighb2JqZWN0aWQpIHJldHVybiBmYWxzZTtcblxuICAvL2NhbGwgLnRvU3RyaW5nKCkgdG8gZ2V0IHRoZSBoZXggaWYgd2UncmVcbiAgLy8gd29ya2luZyB3aXRoIGFuIGluc3RhbmNlIG9mIE9iamVjdElEXG4gIHJldHVybiAvXlswLTlBLUZdezI0fSQvaS50ZXN0KG9iamVjdGlkLnRvU3RyaW5nKCkpO1xufTtcblxuLyoqXG4gKiBzZXQgYSBjdXN0b20gbWFjaGluZUlEXG4gKiBcbiAqIEBwYXJhbSB7U3RyaW5nfE51bWJlcn0gbWFjaGluZWlkIENhbiBiZSBhIHN0cmluZywgaGV4LXN0cmluZyBvciBhIG51bWJlclxuICogQHJldHVybiB7dm9pZH1cbiAqIEBhcGkgcHVibGljXG4gKi9cbk9iamVjdElELnNldE1hY2hpbmVJRCA9IGZ1bmN0aW9uKGFyZykge1xuICB2YXIgbWFjaGluZUlEO1xuXG4gIGlmKHR5cGVvZiBhcmcgPT09IFwic3RyaW5nXCIpIHtcbiAgICAvLyBoZXggc3RyaW5nXG4gICAgbWFjaGluZUlEID0gcGFyc2VJbnQoYXJnLCAxNik7XG4gICBcbiAgICAvLyBhbnkgc3RyaW5nXG4gICAgaWYoaXNOYU4obWFjaGluZUlEKSkge1xuICAgICAgYXJnID0gKCcwMDAwMDAnICsgYXJnKS5zdWJzdHIoLTcsNik7XG5cbiAgICAgIG1hY2hpbmVJRCA9IFwiXCI7XG4gICAgICBmb3IodmFyIGkgPSAwO2k8NjsgaSsrKSB7XG4gICAgICAgIG1hY2hpbmVJRCArPSAoYXJnLmNoYXJDb2RlQXQoaSkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBlbHNlIGlmKC9udW1iZXJ8dW5kZWZpbmVkLy50ZXN0KHR5cGVvZiBhcmcpKSB7XG4gICAgbWFjaGluZUlEID0gYXJnIHwgMDtcbiAgfVxuXG4gIE1BQ0hJTkVfSUQgPSAobWFjaGluZUlEICYgMHhGRkZGRkYpO1xufVxuXG4vKipcbiAqIGdldCB0aGUgbWFjaGluZUlEXG4gKiBcbiAqIEByZXR1cm4ge251bWJlcn1cbiAqIEBhcGkgcHVibGljXG4gKi9cbk9iamVjdElELmdldE1hY2hpbmVJRCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gTUFDSElORV9JRDtcbn1cblxuT2JqZWN0SUQucHJvdG90eXBlID0ge1xuICBfYnNvbnR5cGU6ICdPYmplY3RJRCcsXG4gIGNvbnN0cnVjdG9yOiBPYmplY3RJRCxcblxuICAvKipcbiAgICogUmV0dXJuIHRoZSBPYmplY3RJRCBpZCBhcyBhIDI0IGJ5dGUgaGV4IHN0cmluZyByZXByZXNlbnRhdGlvblxuICAgKlxuICAgKiBAcmV0dXJuIHtTdHJpbmd9IHJldHVybiB0aGUgMjQgYnl0ZSBoZXggc3RyaW5nIHJlcHJlc2VudGF0aW9uLlxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgdG9IZXhTdHJpbmc6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnN0cjtcbiAgfSxcblxuICAvKipcbiAgICogQ29tcGFyZXMgdGhlIGVxdWFsaXR5IG9mIHRoaXMgT2JqZWN0SUQgd2l0aCBgb3RoZXJJRGAuXG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvdGhlciBPYmplY3RJRCBpbnN0YW5jZSB0byBjb21wYXJlIGFnYWluc3QuXG4gICAqIEByZXR1cm4ge0Jvb2xlYW59IHRoZSByZXN1bHQgb2YgY29tcGFyaW5nIHR3byBPYmplY3RJRCdzXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBlcXVhbHM6IGZ1bmN0aW9uIChvdGhlcil7XG4gICAgcmV0dXJuICEhb3RoZXIgJiYgdGhpcy5zdHIgPT09IG90aGVyLnRvU3RyaW5nKCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGdlbmVyYXRpb24gZGF0ZSAoYWNjdXJhdGUgdXAgdG8gdGhlIHNlY29uZCkgdGhhdCB0aGlzIElEIHdhcyBnZW5lcmF0ZWQuXG4gICAqXG4gICAqIEByZXR1cm4ge0RhdGV9IHRoZSBnZW5lcmF0aW9uIGRhdGVcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIGdldFRpbWVzdGFtcDogZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gbmV3IERhdGUocGFyc2VJbnQodGhpcy5zdHIuc3Vic3RyKDAsOCksIDE2KSAqIDEwMDApO1xuICB9XG59O1xuXG5mdW5jdGlvbiBuZXh0KCkge1xuICByZXR1cm4gaW5kZXggPSAoaW5kZXgrMSkgJSAweEZGRkZGRjtcbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGUodGltZSkge1xuICBpZiAodHlwZW9mIHRpbWUgIT09ICdudW1iZXInKVxuICAgIHRpbWUgPSBEYXRlLm5vdygpLzEwMDA7XG5cbiAgLy9rZWVwIGl0IGluIHRoZSByaW5nIVxuICB0aW1lID0gcGFyc2VJbnQodGltZSwgMTApICUgMHhGRkZGRkZGRjtcblxuICAvL0ZGRkZGRkZGIEZGRkZGRiBGRkZGIEZGRkZGRlxuICByZXR1cm4gaGV4KDgsdGltZSkgKyBoZXgoNixNQUNISU5FX0lEKSArIGhleCg0LHBpZCkgKyBoZXgoNixuZXh0KCkpO1xufVxuXG5mdW5jdGlvbiBoZXgobGVuZ3RoLCBuKSB7XG4gIG4gPSBuLnRvU3RyaW5nKDE2KTtcbiAgcmV0dXJuIChuLmxlbmd0aD09PWxlbmd0aCk/IG4gOiBcIjAwMDAwMDAwXCIuc3Vic3RyaW5nKG4ubGVuZ3RoLCBsZW5ndGgpICsgbjtcbn1cblxuZnVuY3Rpb24gYnVmZmVyKHN0cikge1xuICB2YXIgaT0wLG91dD1bXTtcblxuICBpZihzdHIubGVuZ3RoPT09MjQpXG4gICAgZm9yKDtpPDI0OyBvdXQucHVzaChwYXJzZUludChzdHJbaV0rc3RyW2krMV0sIDE2KSksaSs9Mik7XG5cbiAgZWxzZSBpZihzdHIubGVuZ3RoPT09MTIpXG4gICAgZm9yKDtpPDEyOyBvdXQucHVzaChzdHIuY2hhckNvZGVBdChpKSksaSsrKTtcblxuICByZXR1cm4gb3V0O1xufVxuXG4vKipcbiAqIENvbnZlcnRzIHRvIGEgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIHRoaXMgSWQuXG4gKlxuICogQHJldHVybiB7U3RyaW5nfSByZXR1cm4gdGhlIDI0IGJ5dGUgaGV4IHN0cmluZyByZXByZXNlbnRhdGlvbi5cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5PYmplY3RJRC5wcm90b3R5cGUuaW5zcGVjdCA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gXCJPYmplY3RJRChcIit0aGlzK1wiKVwiIH07XG5PYmplY3RJRC5wcm90b3R5cGUudG9KU09OID0gT2JqZWN0SUQucHJvdG90eXBlLnRvSGV4U3RyaW5nO1xuT2JqZWN0SUQucHJvdG90eXBlLnRvU3RyaW5nID0gT2JqZWN0SUQucHJvdG90eXBlLnRvSGV4U3RyaW5nO1xuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbi8vIGNhY2hlZCBmcm9tIHdoYXRldmVyIGdsb2JhbCBpcyBwcmVzZW50IHNvIHRoYXQgdGVzdCBydW5uZXJzIHRoYXQgc3R1YiBpdFxuLy8gZG9uJ3QgYnJlYWsgdGhpbmdzLiAgQnV0IHdlIG5lZWQgdG8gd3JhcCBpdCBpbiBhIHRyeSBjYXRjaCBpbiBjYXNlIGl0IGlzXG4vLyB3cmFwcGVkIGluIHN0cmljdCBtb2RlIGNvZGUgd2hpY2ggZG9lc24ndCBkZWZpbmUgYW55IGdsb2JhbHMuICBJdCdzIGluc2lkZSBhXG4vLyBmdW5jdGlvbiBiZWNhdXNlIHRyeS9jYXRjaGVzIGRlb3B0aW1pemUgaW4gY2VydGFpbiBlbmdpbmVzLlxuXG52YXIgY2FjaGVkU2V0VGltZW91dDtcbnZhciBjYWNoZWRDbGVhclRpbWVvdXQ7XG5cbmZ1bmN0aW9uIGRlZmF1bHRTZXRUaW1vdXQoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdzZXRUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG5mdW5jdGlvbiBkZWZhdWx0Q2xlYXJUaW1lb3V0ICgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NsZWFyVGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuKGZ1bmN0aW9uICgpIHtcbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIHNldFRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIGNsZWFyVGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICB9XG59ICgpKVxuZnVuY3Rpb24gcnVuVGltZW91dChmdW4pIHtcbiAgICBpZiAoY2FjaGVkU2V0VGltZW91dCA9PT0gc2V0VGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgLy8gaWYgc2V0VGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZFNldFRpbWVvdXQgPT09IGRlZmF1bHRTZXRUaW1vdXQgfHwgIWNhY2hlZFNldFRpbWVvdXQpICYmIHNldFRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9IGNhdGNoKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0IHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKG51bGwsIGZ1biwgMCk7XG4gICAgICAgIH0gY2F0Y2goZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvclxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbCh0aGlzLCBmdW4sIDApO1xuICAgICAgICB9XG4gICAgfVxuXG5cbn1cbmZ1bmN0aW9uIHJ1bkNsZWFyVGltZW91dChtYXJrZXIpIHtcbiAgICBpZiAoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgLy8gaWYgY2xlYXJUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBkZWZhdWx0Q2xlYXJUaW1lb3V0IHx8ICFjYWNoZWRDbGVhclRpbWVvdXQpICYmIGNsZWFyVGltZW91dCkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfSBjYXRjaCAoZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgIHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwobnVsbCwgbWFya2VyKTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvci5cbiAgICAgICAgICAgIC8vIFNvbWUgdmVyc2lvbnMgb2YgSS5FLiBoYXZlIGRpZmZlcmVudCBydWxlcyBmb3IgY2xlYXJUaW1lb3V0IHZzIHNldFRpbWVvdXRcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbCh0aGlzLCBtYXJrZXIpO1xuICAgICAgICB9XG4gICAgfVxuXG5cblxufVxudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgaWYgKCFkcmFpbmluZyB8fCAhY3VycmVudFF1ZXVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gcnVuVGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgcnVuQ2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgcnVuVGltZW91dChkcmFpblF1ZXVlKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kT25jZUxpc3RlbmVyID0gbm9vcDtcblxucHJvY2Vzcy5saXN0ZW5lcnMgPSBmdW5jdGlvbiAobmFtZSkgeyByZXR1cm4gW10gfVxuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsIi8qIGdsb2JhbCBleHBvcnRzICovXG4vKipcbiAqIEBmaWxlb3ZlcnZpZXcgYSB0aW55IGxpYnJhcnkgZm9yIFdlYiBXb3JrZXIgUmVtb3RlIE1ldGhvZCBJbnZvY2F0aW9uXG4gKlxuICovXG5jb25zdCBPYmplY3RJRCA9IHJlcXVpcmUoJ2Jzb24tb2JqZWN0aWQnKTtcblxuLyoqXG4gKiBAcHJpdmF0ZSByZXR1cm5zIGEgbGlzdCBvZiBUcmFuc2ZlcmFibGUgb2JqZWN0cyB3aGljaCB7QGNvZGUgb2JqfSBpbmNsdWRlc1xuICogQHBhcmFtIHtvYmplY3R9IG9iaiBhbnkgb2JqZWN0XG4gKiBAcGFyYW0ge0FycmF5fSBsaXN0IGZvciBpbnRlcm5hbCByZWN1cnNpb24gb25seVxuICogQHJldHVybiB7TGlzdH0gYSBsaXN0IG9mIFRyYW5zZmVyYWJsZSBvYmplY3RzXG4gKi9cbmZ1bmN0aW9uIGdldFRyYW5zZmVyTGlzdChvYmosIGxpc3QgPSBbXSkge1xuICAgIGlmIChBcnJheUJ1ZmZlci5pc1ZpZXcob2JqKSkge1xuICAgICAgICBsaXN0LnB1c2gob2JqLmJ1ZmZlcik7XG4gICAgICAgIHJldHVybiBsaXN0O1xuICAgIH1cbiAgICBpZiAoaXNUcmFuc2ZlcmFibGUob2JqKSkge1xuICAgICAgICBsaXN0LnB1c2gob2JqKTtcbiAgICAgICAgcmV0dXJuIGxpc3Q7XG4gICAgfVxuICAgIGlmICghKHR5cGVvZiBvYmogPT09ICdvYmplY3QnKSkge1xuICAgICAgICByZXR1cm4gbGlzdDtcbiAgICB9XG4gICAgZm9yIChjb25zdCBwcm9wIGluIG9iaikge1xuICAgICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KHByb3ApKSB7XG4gICAgICAgICAgICBnZXRUcmFuc2Zlckxpc3Qob2JqW3Byb3BdLCBsaXN0KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbGlzdDtcbn1cblxuLyoqXG4gKiBAcHJpdmF0ZSBjaGVja3MgaWYge0Bjb2RlIG9ian0gaXMgVHJhbnNmZXJhYmxlIG9yIG5vdC5cbiAqIEBwYXJhbSB7b2JqZWN0fSBvYmogYW55IG9iamVjdFxuICogQHJldHVybiB7Ym9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNUcmFuc2ZlcmFibGUob2JqKSB7XG4gICAgY29uc3QgdHJhbnNmZXJhYmxlID0gW0FycmF5QnVmZmVyXTtcbiAgICBpZiAodHlwZW9mIE1lc3NhZ2VQb3J0ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICB0cmFuc2ZlcmFibGUucHVzaChNZXNzYWdlUG9ydCk7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgSW1hZ2VCaXRtYXAgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHRyYW5zZmVyYWJsZS5wdXNoKEltYWdlQml0bWFwKTtcbiAgICB9XG4gICAgcmV0dXJuIHRyYW5zZmVyYWJsZS5zb21lKGUgPT4gb2JqIGluc3RhbmNlb2YgZSk7XG59XG5cbi8qKlxuICogQGNsYXNzIGJhc2UgY2xhc3Mgd2hvc2UgY2hpbGQgY2xhc3NlcyB1c2UgUk1JXG4gKi9cbmNsYXNzIFdvcmtlclJNSSB7XG4gICAgLyoqXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlbW90ZSBhbiBpbnN0YW5jZSB0byBjYWxsIHBvc3RNZXNzYWdlIG1ldGhvZFxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGFyZ3MgYXJndW1lbnRzIHRvIGJlIHBhc3NlZCB0byBzZXJ2ZXItc2lkZSBpbnN0YW5jZVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHJlbW90ZSwgLi4uYXJncykge1xuICAgICAgICB0aGlzLnJlbW90ZSA9IHJlbW90ZTtcbiAgICAgICAgdGhpcy5pZCA9IE9iamVjdElEKCkudG9TdHJpbmcoKTtcbiAgICAgICAgdGhpcy5tZXRob2RTdGF0ZXMgPSB7fTtcbiAgICAgICAgdGhpcy5yZW1vdGUuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGV2ZW50ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBldmVudC5kYXRhO1xuICAgICAgICAgICAgaWYgKGRhdGEuaWQgPT09IHRoaXMuaWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJldHVybkhhbmRsZXIoZGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIGZhbHNlKTtcbiAgICAgICAgdGhpcy5jb25zdHJ1Y3RvclByb21pc2UgPSB0aGlzLmludm9rZVJNKHRoaXMuY29uc3RydWN0b3IubmFtZSwgYXJncyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogaW52b2tlcyByZW1vdGUgbWV0aG9kXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1ldGhvZE5hbWUgTWV0aG9kIG5hbWVcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBhcmdzIGFyZ3VtZW50cyB0byBiZSBwYXNzZWQgdG8gc2VydmVyLXNpZGUgaW5zdGFuY2VcbiAgICAgKiBAcmV0dXJuIHtQcm9taXNlfVxuICAgICAqL1xuICAgIGludm9rZVJNKG1ldGhvZE5hbWUsIGFyZ3MgPSBbXSkge1xuICAgICAgICBpZiAoIXRoaXMubWV0aG9kU3RhdGVzW21ldGhvZE5hbWVdKSB7XG4gICAgICAgICAgICB0aGlzLm1ldGhvZFN0YXRlc1ttZXRob2ROYW1lXSA9IHtcbiAgICAgICAgICAgICAgICBudW06IDAsXG4gICAgICAgICAgICAgICAgcmVzb2x2ZVJlamVjdHM6IHt9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBtZXRob2RTdGF0ZSA9IHRoaXMubWV0aG9kU3RhdGVzW21ldGhvZE5hbWVdO1xuICAgICAgICAgICAgbWV0aG9kU3RhdGUubnVtICs9IDE7XG4gICAgICAgICAgICBtZXRob2RTdGF0ZS5yZXNvbHZlUmVqZWN0c1ttZXRob2RTdGF0ZS5udW1dID0geyByZXNvbHZlLCByZWplY3QgfTtcbiAgICAgICAgICAgIHRoaXMucmVtb3RlLnBvc3RNZXNzYWdlKHtcbiAgICAgICAgICAgICAgICBpZDogdGhpcy5pZCxcbiAgICAgICAgICAgICAgICBtZXRob2ROYW1lLFxuICAgICAgICAgICAgICAgIG51bTogbWV0aG9kU3RhdGUubnVtLFxuICAgICAgICAgICAgICAgIGFyZ3NcbiAgICAgICAgICAgIH0sIGdldFRyYW5zZmVyTGlzdChhcmdzKSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBwcml2YXRlIGhhbmRsZXMgY29ycmVzcG9uZGVudCAnbWVzc2FnZScgZXZlbnRcbiAgICAgKiBAcGFyYW0ge29ian0gZGF0YSBkYXRhIHByb3BlcnR5IG9mICdtZXNzYWdlJyBldmVudFxuICAgICAqL1xuICAgIHJldHVybkhhbmRsZXIoZGF0YSkge1xuICAgICAgICBjb25zdCByZXNvbHZlUmVqZWN0cyA9IHRoaXMubWV0aG9kU3RhdGVzW2RhdGEubWV0aG9kTmFtZV0ucmVzb2x2ZVJlamVjdHM7XG4gICAgICAgIGlmIChkYXRhLmVycm9yKSB7XG4gICAgICAgICAgICByZXNvbHZlUmVqZWN0c1tkYXRhLm51bV0ucmVqZWN0KGRhdGEuZXJyb3IpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzb2x2ZVJlamVjdHNbZGF0YS5udW1dLnJlc29sdmUoZGF0YS5yZXN1bHQpO1xuICAgICAgICB9XG4gICAgICAgIGRlbGV0ZSByZXNvbHZlUmVqZWN0c1tkYXRhLm51bV07XG4gICAgfVxufVxuXG5cbi8qKlxuICogQHByaXZhdGUgZXhlY3V0ZXMgYSBtZXRob2Qgb24gc2VydmVyIGFuZCBwb3N0IGEgcmVzdWx0IGFzIG1lc3NhZ2UuXG4gKiBAcGFyYW0ge29ian0gZXZlbnQgJ21lc3NhZ2UnIGV2ZW50XG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZVdvcmtlclJNSShldmVudCkge1xuICAgIGNvbnN0IGRhdGEgPSBldmVudC5kYXRhO1xuICAgIGNvbnN0IG1lc3NhZ2UgPSB7XG4gICAgICAgIGlkOiBkYXRhLmlkLFxuICAgICAgICBtZXRob2ROYW1lOiBkYXRhLm1ldGhvZE5hbWUsXG4gICAgICAgIG51bTogZGF0YS5udW0sXG4gICAgfTtcbiAgICBsZXQgcmVzdWx0O1xuICAgIGlmIChkYXRhLm1ldGhvZE5hbWUgPT09IHRoaXMubmFtZSkge1xuICAgICAgICB0aGlzLndvcmtlclJNSS5pbnN0YW5jZXNbZGF0YS5pZF0gPSBuZXcgdGhpcyguLi5kYXRhLmFyZ3MpO1xuICAgICAgICBtZXNzYWdlLnJlc3VsdCA9IG51bGw7XG4gICAgICAgIHRoaXMud29ya2VyUk1JLnRhcmdldC5wb3N0TWVzc2FnZShtZXNzYWdlLCBnZXRUcmFuc2Zlckxpc3QocmVzdWx0KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB0aGlzLndvcmtlclJNSS5pbnN0YW5jZXNbZGF0YS5pZF07XG4gICAgICAgIGlmIChpbnN0YW5jZSkge1xuICAgICAgICAgICAgcmVzdWx0ID0gYXdhaXQgaW5zdGFuY2VbZGF0YS5tZXRob2ROYW1lXS5hcHBseShpbnN0YW5jZSwgZGF0YS5hcmdzKVxuICAgICAgICAgICAgbWVzc2FnZS5yZXN1bHQgPSByZXN1bHQ7XG4gICAgICAgICAgICB0aGlzLndvcmtlclJNSS50YXJnZXQucG9zdE1lc3NhZ2UobWVzc2FnZSwgZ2V0VHJhbnNmZXJMaXN0KHJlc3VsdCkpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vKipcbiAqIHJlZ2lzdGVycyBhIGNsYXNzIGFzIGFuIGV4ZWN1dGVyIG9mIFJNSSBvbiBzZXJ2ZXJcbiAqIEBwYXJhbSB7b2JqfSB0YXJnZXQgYW4gaW5zdGFuY2UgdGhhdCByZWNlaXZlcyAnbWVzc2FnZScgZXZlbnRzIG9mIFJNSVxuICogQHBhcmFtIHtDbGFzc30ga2xhc3MgYSBjbGFzcyB0byBiZSByZWdpc3RlcmVkXG4gKi9cbmZ1bmN0aW9uIHJlc2lndGVyV29ya2VyUk1JKHRhcmdldCwga2xhc3MpIHtcbiAgICBrbGFzcy53b3JrZXJSTUkgPSB7XG4gICAgICAgIHRhcmdldCxcbiAgICAgICAgaW5zdGFuY2VzOiB7fSxcbiAgICAgICAgaGFuZGxlcjogaGFuZGxlV29ya2VyUk1JLmJpbmQoa2xhc3MpXG4gICAgfVxuICAgIHRhcmdldC5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywga2xhc3Mud29ya2VyUk1JLmhhbmRsZXIpO1xufVxuXG4vKipcbiAqIHVucmVzaWd0ZXJzIGEgY2xhc3MgcmVnaXN0ZXJlZCBieSByZWdpc3RlcldvcmtlclJNSVxuICogQHBhcmFtIHtvYmp9IHRhcmdldCBhbiBpbnN0YW5jZSB0aGF0IHJlY2VpdmVzICdtZXNzYWdlJyBldmVudHMgb2YgUk1JXG4gKiBAcGFyYW0ge0NsYXNzfSBrbGFzcyBhIGNsYXNzIHRvIGJlIHVucmVnaXN0ZXJlZFxuICovXG5mdW5jdGlvbiB1bnJlc2lndGVyV29ya2VyUk1JKHRhcmdldCwga2xhc3MpIHtcbiAgICB0YXJnZXQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGtsYXNzLndvcmtlclJNSS5oYW5kbGVyKVxuICAgIGRlbGV0ZSBrbGFzcy53b3JrZXJSTUk7XG59XG5cbmV4cG9ydHMuV29ya2VyUk1JID0gV29ya2VyUk1JO1xuZXhwb3J0cy5yZXNpZ3RlcldvcmtlclJNSSA9IHJlc2lndGVyV29ya2VyUk1JO1xuZXhwb3J0cy51bnJlc2lndGVyV29ya2VyUk1JID0gdW5yZXNpZ3RlcldvcmtlclJNSTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuLy8vIOeigeebpOOBruOCteOCpOOCuuOBp+OBmeOAglxuY29uc3QgQlNJWkUgPSBleHBvcnRzLkJTSVpFID0gOTtcblxuLy8vIOWkluaeoOOCkuaMgeOBpOaLoeW8teeigeebpOOBruOCteOCpOOCuuOBp+OBmeOAglxuY29uc3QgRUJTSVpFID0gZXhwb3J0cy5FQlNJWkUgPSBCU0laRSArIDI7XG5cbi8vLyDnooHnm6Tjga7kuqTngrnjga7mlbDjgafjgZnjgIJcbmNvbnN0IEJWQ05UID0gZXhwb3J0cy5CVkNOVCA9IEJTSVpFICogQlNJWkU7XG5cbi8vLyDmi6HlvLXnooHnm6Tjga7kuqTngrnjga7mlbDjgafjgZnjgIJcbmNvbnN0IEVCVkNOVCA9IGV4cG9ydHMuRUJWQ05UID0gRUJTSVpFICogRUJTSVpFO1xuXG4vLy8g44OR44K544KS6KGo44GZ57ea5b2i5bqn5qiZ44Gn44GZ44CC6YCa5bi444Gu552A5omL44Gv5ouh5by156KB55uk44Gu57ea5b2i5bqn5qiZ44Gn6KGo44GX44G+44GZ44CCXG4vLyBUT0RPIC0g552A5omL44Gu44Gf44KB44Gr5YiX5oyZ5Z6L44KS5L2c44Gj44Gf44G744GG44GM6Zai5pWw44Gu44K344Kw44OL44OB44Oj44Gv6Kqt44G/44KE44GZ44GE44CCXG5jb25zdCBQQVNTID0gZXhwb3J0cy5QQVNTID0gRUJWQ05UO1xuXG4vLy8g57ea5b2i5bqn5qiZ44Gu44OX44Os44O844K544Ob44Or44OA44O844Gu5pyq5L2/55So44KS56S644GZ5YCk44Gn44GZ44CCXG4vLyBUT0RPIC0g6Kmy5b2T44GZ44KL5aC05omA44GrT3B0aW9uPHVzaXplPuOCkuS9v+OBo+OBn+OBu+OBhuOBjOmWouaVsOOBruOCt+OCsOODi+ODgeODo+OBr+iqreOBv+OChOOBmeOBhOOAglxuY29uc3QgVk5VTEwgPSBleHBvcnRzLlZOVUxMID0gRUJWQ05UICsgMTtcblxuY29uc3QgTEVFTEFfWkVSTyA9IGV4cG9ydHMuTEVFTEFfWkVSTyA9IHRydWU7XG5cbi8vLyBOTuOBuOOBruWFpeWKm+OBq+mWouOBmeOCi+WxpeattOOBrua3seOBleOBp+OBmeOAglxuY29uc3QgS0VFUF9QUkVWX0NOVCA9IGV4cG9ydHMuS0VFUF9QUkVWX0NOVCA9IExFRUxBX1pFUk8gPyA3IDogMjtcblxuLy8vIE5O44G444Gu5YWl5Yqb44OV44Kj44O844OB44Oj44O844Gu5pWw44Gn44GZ44CCXG5jb25zdCBGRUFUVVJFX0NOVCA9IGV4cG9ydHMuRkVBVFVSRV9DTlQgPSBLRUVQX1BSRVZfQ05UICogMiArIChMRUVMQV9aRVJPID8gNCA6IDMpOyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5YX0xBQkVMUyA9IHVuZGVmaW5lZDtcbmV4cG9ydHMubW92ZTJ4eSA9IG1vdmUyeHk7XG5leHBvcnRzLmV2Mnh5ID0gZXYyeHk7XG5leHBvcnRzLnh5MmV2ID0geHkyZXY7XG5leHBvcnRzLnJ2MmV2ID0gcnYyZXY7XG5leHBvcnRzLmV2MnJ2ID0gZXYycnY7XG5leHBvcnRzLmV2MnN0ciA9IGV2MnN0cjtcbmV4cG9ydHMuc3RyMmV2ID0gc3RyMmV2O1xuXG52YXIgX2NvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzLmpzJyk7XG5cbmNvbnN0IFhfTEFCRUxTID0gZXhwb3J0cy5YX0xBQkVMUyA9ICdAQUJDREVGR0hKS0xNTk9QUVJTVCc7XG5cbmZ1bmN0aW9uIG1vdmUyeHkocykge1xuICAgIGNvbnN0IE9GRlNFVCA9ICdhJy5jaGFyQ29kZUF0KDApIC0gMTtcbiAgICByZXR1cm4gW3MuY2hhckNvZGVBdCgwKSAtIE9GRlNFVCwgX2NvbnN0YW50cy5CU0laRSArIDEgLSAocy5jaGFyQ29kZUF0KDEpIC0gT0ZGU0VUKV07XG59XG5cbmZ1bmN0aW9uIGV2Mnh5KGV2KSB7XG4gICAgcmV0dXJuIFtldiAlIF9jb25zdGFudHMuRUJTSVpFLCBNYXRoLmZsb29yKGV2IC8gX2NvbnN0YW50cy5FQlNJWkUpXTtcbn1cblxuZnVuY3Rpb24geHkyZXYoeCwgeSkge1xuICAgIHJldHVybiB5ICogX2NvbnN0YW50cy5FQlNJWkUgKyB4O1xufVxuXG5mdW5jdGlvbiBydjJldihydikge1xuICAgIHJldHVybiBydiA9PT0gX2NvbnN0YW50cy5CVkNOVCA/IF9jb25zdGFudHMuUEFTUyA6IHJ2ICUgX2NvbnN0YW50cy5CU0laRSArIDEgKyBNYXRoLmZsb29yKHJ2IC8gX2NvbnN0YW50cy5CU0laRSArIDEpICogX2NvbnN0YW50cy5FQlNJWkU7XG59XG5cbmZ1bmN0aW9uIGV2MnJ2KGV2KSB7XG4gICAgcmV0dXJuIGV2ID09PSBfY29uc3RhbnRzLlBBU1MgPyBfY29uc3RhbnRzLkJWQ05UIDogZXYgJSBfY29uc3RhbnRzLkVCU0laRSAtIDEgKyBNYXRoLmZsb29yKGV2IC8gX2NvbnN0YW50cy5FQlNJWkUgLSAxKSAqIF9jb25zdGFudHMuQlNJWkU7XG59XG5cbmZ1bmN0aW9uIGV2MnN0cihldikge1xuICAgIGlmIChldiA+PSBfY29uc3RhbnRzLlBBU1MpIHtcbiAgICAgICAgcmV0dXJuICdwYXNzJztcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBbeCwgeV0gPSBldjJ4eShldik7XG4gICAgICAgIHJldHVybiBYX0xBQkVMUy5jaGFyQXQoeCkgKyB5LnRvU3RyaW5nKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBzdHIyZXYodikge1xuICAgIGNvbnN0IHZTdHIgPSB2LnRvVXBwZXJDYXNlKCk7XG4gICAgaWYgKHZTdHIgPT09ICdQQVNTJyB8fCB2U3RyID09PSAnUkVTSUdOJykge1xuICAgICAgICByZXR1cm4gX2NvbnN0YW50cy5QQVNTO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHggPSBYX0xBQkVMUy5pbmRleE9mKHZTdHIuY2hhckF0KDApKTtcbiAgICAgICAgY29uc3QgeSA9IHBhcnNlSW50KHZTdHIuc2xpY2UoMSkpO1xuICAgICAgICByZXR1cm4geHkyZXYoeCwgeSk7XG4gICAgfVxufSIsIid1c2Ugc3RyaWN0JztcblxudmFyIF93b3JrZXJSbWkgPSByZXF1aXJlKCd3b3JrZXItcm1pJyk7XG5cbnZhciBfbmV1cmFsX25ldHdvcmsgPSByZXF1aXJlKCcuL25ldXJhbF9uZXR3b3JrLmpzJyk7XG5cbnZhciBfY29vcmRfY29udmVydCA9IHJlcXVpcmUoJy4vY29vcmRfY29udmVydC5qcycpO1xuXG52YXIgX2NvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzLmpzJyk7XG5cbnZhciBfc3BlZWNoID0gcmVxdWlyZSgnLi9zcGVlY2guanMnKTtcblxuZnVuY3Rpb24gaTE4blNwZWFrKG1lc3NhZ2UpIHtcbiAgICByZXR1cm4gKDAsIF9zcGVlY2guc3BlYWspKG1lc3NhZ2UsIGkxOG4ubGFuZywgJ2ZlbWFsZScpO1xufSAvKiBnbG9iYWwgJCBKR08gQm9hcmRDb250cm9sbGVyIGkxOG4gKi9cblxuXG5jbGFzcyBBOUVuZ2luZSBleHRlbmRzIF93b3JrZXJSbWkuV29ya2VyUk1JIHtcbiAgICBhc3luYyBsb2FkTk4oKSB7XG4gICAgICAgIGF3YWl0IHRoaXMuaW52b2tlUk0oJ2xvYWROTicpO1xuICAgIH1cblxuICAgIGFzeW5jIGNsZWFyKCkge1xuICAgICAgICBhd2FpdCB0aGlzLnN0b3BQb25kZXIoKTtcbiAgICAgICAgYXdhaXQgdGhpcy5pbnZva2VSTSgnY2xlYXInKTtcbiAgICB9XG5cbiAgICBhc3luYyB0aW1lU2V0dGluZ3MobWFpblRpbWUsIGJ5b3lvbWkpIHtcbiAgICAgICAgdGhpcy5tYWluVGltZSA9IG1haW5UaW1lO1xuICAgICAgICB0aGlzLmJ5b3lvbWkgPSBieW95b21pO1xuICAgICAgICBhd2FpdCB0aGlzLmludm9rZVJNKCd0aW1lU2V0dGluZ3MnLCBbbWFpblRpbWUsIGJ5b3lvbWldKTtcbiAgICB9XG5cbiAgICBhc3luYyBnZW5tb3ZlKCkge1xuICAgICAgICBjb25zdCBbbW92ZSwgd2luUmF0ZV0gPSBhd2FpdCB0aGlzLmJlc3RNb3ZlKCk7XG4gICAgICAgIGlmICh3aW5SYXRlIDwgMC4xKSB7XG4gICAgICAgICAgICByZXR1cm4gJ3Jlc2lnbic7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsYXkobW92ZSk7XG4gICAgICAgICAgICByZXR1cm4gKDAsIF9jb29yZF9jb252ZXJ0LmV2MnN0cikobW92ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyBwbGF5KGV2KSB7XG4gICAgICAgIGF3YWl0IHRoaXMuaW52b2tlUk0oJ3BsYXknLCBbZXZdKTtcbiAgICB9XG5cbiAgICBhc3luYyBiZXN0TW92ZSgpIHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuaW52b2tlUk0oJ2Jlc3RNb3ZlJyk7XG4gICAgfVxuXG4gICAgYXN5bmMgZmluYWxTY29yZSgpIHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuaW52b2tlUk0oJ2ZpbmFsU2NvcmUnKTtcbiAgICB9XG5cbiAgICBzdGFydFBvbmRlcigpIHtcbiAgICAgICAgdGhpcy5wb25kZXJQcm9taXNlID0gdGhpcy5pbnZva2VSTSgncG9uZGVyJyk7XG4gICAgfVxuXG4gICAgYXN5bmMgc3RvcFBvbmRlcigpIHtcbiAgICAgICAgaWYgKHRoaXMucG9uZGVyUHJvbWlzZSkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5pbnZva2VSTSgnc3RvcFBvbmRlcicpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wb25kZXJQcm9taXNlO1xuICAgICAgICAgICAgdGhpcy5wb25kZXJQcm9taXNlID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuY2xhc3MgUGxheUNvbnRyb2xsZXIge1xuICAgIGNvbnN0cnVjdG9yKGVuZ2luZSwgYm9hcmQsIGlnb1F1ZXN0ID0gZmFsc2UpIHtcbiAgICAgICAgdGhpcy5lbmdpbmUgPSBlbmdpbmU7XG4gICAgICAgIHRoaXMuYm9hcmQgPSBib2FyZDtcbiAgICAgICAgdGhpcy5pc1NlbGZQbGF5ID0gZmFsc2U7XG4gICAgICAgIHRoaXMuaWdvUXVlc3QgPSBpZ29RdWVzdDtcbiAgICAgICAgaWYgKGlnb1F1ZXN0KSB7XG4gICAgICAgICAgICB0aGlzLnRpbWVMZWZ0ID0gWzAsIC8vIGR1bXlcbiAgICAgICAgICAgIDMgKiA2MCAqIDEwMDAsIC8vIGJsYWNrXG4gICAgICAgICAgICAzICogNjAgKiAxMDAwXTtcbiAgICAgICAgICAgIHRoaXMuc3RhcnQgPSBEYXRlLm5vdygpO1xuICAgICAgICAgICAgdGhpcy50aW1lciA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBzdGFydCA9IERhdGUubm93KCk7XG4gICAgICAgICAgICAgICAgdGhpcy50aW1lTGVmdFt0aGlzLmJvYXJkLnR1cm5dIC09IHN0YXJ0IC0gdGhpcy5zdGFydDtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXJ0ID0gc3RhcnQ7XG4gICAgICAgICAgICAgICAgJCgnI3lvdXItdGltZScpLnRleHQoTWF0aC5jZWlsKHRoaXMudGltZUxlZnRbdGhpcy5ib2FyZC5vd25Db2xvcl0gLyAxMDAwKSk7XG4gICAgICAgICAgICAgICAgJCgnI2FpLXRpbWUnKS50ZXh0KE1hdGguY2VpbCh0aGlzLnRpbWVMZWZ0W3RoaXMuYm9hcmQub3duQ29sb3IgJSAyICsgMV0gLyAxMDAwKSk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudGltZUxlZnRbdGhpcy5ib2FyZC50dXJuXSA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLnRpbWVyKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lciA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIGFsZXJ0KGkxOG4udGltZW91dCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMudGltZUxlZnQgPSBbMCwgLy8gZHVteVxuICAgICAgICAgICAgdGhpcy5ib2FyZC5vd25Db2xvciA9PT0gSkdPLkJMQUNLID8gSW5maW5pdHkgOiB0aGlzLmVuZ2luZS5ieW95b21pICogMTAwMCwgLy8gYmxhY2tcbiAgICAgICAgICAgIHRoaXMuYm9hcmQub3duQ29sb3IgPT09IEpHTy5CTEFDSyA/IHRoaXMuZW5naW5lLmJ5b3lvbWkgKiAxMDAwIDogSW5maW5pdHldO1xuICAgICAgICAgICAgdGhpcy5zdGFydCA9IERhdGUubm93KCk7XG4gICAgICAgICAgICB0aGlzLnRpbWVyID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXJ0ID0gRGF0ZS5ub3coKTtcbiAgICAgICAgICAgICAgICB0aGlzLnRpbWVMZWZ0W3RoaXMuYm9hcmQudHVybl0gLT0gc3RhcnQgLSB0aGlzLnN0YXJ0O1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhcnQgPSBzdGFydDtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5ib2FyZC50dXJuID09IHRoaXMuYm9hcmQub3duQ29sb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnI3lvdXItdGltZScpLnRleHQoTWF0aC5jZWlsKHRoaXMudGltZUxlZnRbdGhpcy5ib2FyZC50dXJuXSAvIDEwMDApKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkKCcjYWktdGltZScpLnRleHQoTWF0aC5jZWlsKHRoaXMudGltZUxlZnRbdGhpcy5ib2FyZC50dXJuXSAvIDEwMDApKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICB9XG4gICAgICAgICQoJyN5b3VyLXRpbWUnKS50ZXh0KE1hdGguY2VpbCh0aGlzLnRpbWVMZWZ0W3RoaXMuYm9hcmQub3duQ29sb3JdIC8gMTAwMCkpO1xuICAgICAgICAkKCcjYWktdGltZScpLnRleHQoTWF0aC5jZWlsKHRoaXMudGltZUxlZnRbdGhpcy5ib2FyZC5vd25Db2xvciAlIDIgKyAxXSAvIDEwMDApKTtcbiAgICB9XG5cbiAgICBjbGVhclRpbWVyKCkge1xuICAgICAgICBpZiAodGhpcy50aW1lcikge1xuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLnRpbWVyKTtcbiAgICAgICAgICAgIHRoaXMudGltZXIgPSBudWxsO1xuICAgICAgICB9XG4gICAgfVxuICAgIHNldElzU2VsZlBsYXkoaXNTZWxmUGxheSkge1xuICAgICAgICB0aGlzLmlzU2VsZlBsYXkgPSBpc1NlbGZQbGF5O1xuICAgIH1cbiAgICBhc3luYyB1cGRhdGUoY29vcmQpIHtcbiAgICAgICAgaWYgKGNvb3JkID09PSAnZW5kJykge1xuICAgICAgICAgICAgdGhpcy5jbGVhclRpbWVyKCk7XG4gICAgICAgICAgICBpMThuU3BlYWsoaTE4bi5zY29yaW5nKTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2NvcmUgPSBhd2FpdCB0aGlzLmZpbmFsU2NvcmUoKTtcbiAgICAgICAgICAgICAgICBsZXQgbWVzc2FnZTtcbiAgICAgICAgICAgICAgICBpZiAoc2NvcmUgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IGkxOG4uamlnbztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gaTE4bltzY29yZSA+IDAgPyAnYmxhY2snIDogJ3doaXRlJ107XG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoaTE4bi5sYW5nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdlbic6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSArPSBgIHdvbiBieSAke3Njb3JlfSBwb2ludHNgO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnamEnOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYWJzU2NvcmUgPSBNYXRoLmFicyhzY29yZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgKz0gYWJzU2NvcmUgPCAxID8gJ+WNiuebruWLneOBoScgOiBNYXRoLmZsb29yKGFic1Njb3JlKSArICfnm67ljYrli53jgaEnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGkxOG4ubGFuZykge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdlbic6XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlICs9ICc/JztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdqYSc6XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlICs9ICfjgafjgZnjgYvvvJ8nO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGkxOG5TcGVhayhtZXNzYWdlLnJlcGxhY2UoJ+WNiicsICfjga/jgpMnKSk7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGFsZXJ0KG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgICAgICAkKGRvY3VtZW50LmJvZHkpLmFkZENsYXNzKCdlbmQnKTtcbiAgICAgICAgICAgICAgICB9LCAzMDAwKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICAgICAgICAgICAgICBpMThuU3BlYWsoaTE4bi5mYWlsU2NvcmluZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5pZ29RdWVzdCkge1xuICAgICAgICAgICAgdGhpcy50aW1lTGVmdFt0aGlzLmJvYXJkLnR1cm4gJSAyICsgMV0gKz0gMTAwMDtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLmJvYXJkLnR1cm4gPT09IHRoaXMuYm9hcmQub3duQ29sb3IpIHtcbiAgICAgICAgICAgIHRoaXMudGltZUxlZnRbdGhpcy5ib2FyZC5vd25Db2xvciAlIDIgKyAxXSA9IHRoaXMuZW5naW5lLmJ5b3lvbWkgKiAxMDAwO1xuICAgICAgICAgICAgJCgnI2FpLXRpbWUnKS50ZXh0KE1hdGguY2VpbCh0aGlzLnRpbWVMZWZ0W3RoaXMuYm9hcmQub3duQ29sb3IgJSAyICsgMV0gLyAxMDAwKSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXRoaXMuaXNTZWxmUGxheSAmJiB0eXBlb2YgY29vcmQgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmVuZ2luZS5zdG9wUG9uZGVyKCk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmVuZ2luZS5wbGF5KCgwLCBfY29vcmRfY29udmVydC54eTJldikoY29vcmQuaSArIDEsIF9jb25zdGFudHMuQlNJWkUgLSBjb29yZC5qKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuaXNTZWxmUGxheSB8fCB0aGlzLmJvYXJkLnR1cm4gIT09IHRoaXMuYm9hcmQub3duQ29sb3IpIHtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IG1vdmUgPSBhd2FpdCB0aGlzLmVuZ2luZS5nZW5tb3ZlKCk7XG4gICAgICAgICAgICAgICAgc3dpdGNoIChtb3ZlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3Jlc2lnbic6XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNsZWFyVGltZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGkxOG5TcGVhayhpMThuLnJlc2lnbik7XG4gICAgICAgICAgICAgICAgICAgICAgICAkKGRvY3VtZW50LmJvZHkpLmFkZENsYXNzKCdlbmQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdwYXNzJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYm9hcmQucGxheShudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGkxOG5TcGVhayhpMThuLnBhc3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZXYgPSAoMCwgX2Nvb3JkX2NvbnZlcnQuc3RyMmV2KShtb3ZlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB4eSA9ICgwLCBfY29vcmRfY29udmVydC5ldjJ4eSkoZXYpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYm9hcmQucGxheShuZXcgSkdPLkNvb3JkaW5hdGUoeHlbMF0gLSAxLCBfY29uc3RhbnRzLkJTSVpFIC0geHlbMV0pLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCAwKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZW5naW5lLnN0YXJ0UG9uZGVyKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyBwYXNzKCkge1xuICAgICAgICBpZiAodGhpcy5ib2FyZC5vd25Db2xvciA9PT0gdGhpcy5ib2FyZC50dXJuKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmVuZ2luZS5zdG9wUG9uZGVyKCk7XG4gICAgICAgICAgICB0aGlzLmVuZ2luZS5wbGF5KF9jb25zdGFudHMuUEFTUyk7XG4gICAgICAgICAgICB0aGlzLmJvYXJkLnBsYXkobnVsbCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyBmaW5hbFNjb3JlKCkge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCAkLnBvc3Qoe1xuICAgICAgICAgICAgdXJsOiAnaHR0cHM6Ly9taW1pYWthLXB5dGhvbi5oZXJva3VhcHAuY29tL2dudWdvJywgLy8gaHR0cOOBp+OBr+mAmuS/oeOBp+OBjeOBquOBi+OBo+OBn+OAgiAnaHR0cDovLzM1LjIwMy4xNjEuMTAwL2dudWdvJyxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICBzZ2Y6IHRoaXMuYm9hcmQuanJlY29yZC50b1NnZigpLFxuICAgICAgICAgICAgICAgIG1vdmU6ICdlc3QnLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ2FmdGVybWF0aCcsXG4gICAgICAgICAgICAgICAgcnVsZTogdGhpcy5ib2FyZC5qcmVjb3JkLmdldFJvb3ROb2RlKCkuaW5mby5rb21pID09PSAnNi41JyA/ICdqYXBhbmVzZScgOiAnY2hpbmVzZSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmICgvSmlnby8udGVzdChyZXN1bHQpKSB7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBtYXRjaCA9IHJlc3VsdC5tYXRjaCgvKEJsYWNrfFdoaXRlKSB3aW5zIGJ5IChbMC05Ll0rKSBwb2ludHMvKTtcbiAgICAgICAgaWYgKG1hdGNoKSB7XG4gICAgICAgICAgICBsZXQgc2NvcmUgPSBwYXJzZUZsb2F0KG1hdGNoWzJdKTtcbiAgICAgICAgICAgIGlmIChtYXRjaFsxXSA9PT0gJ0JsYWNrJykge1xuICAgICAgICAgICAgICAgIHJldHVybiBzY29yZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIC1zY29yZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgfVxuXG59XG5cbmFzeW5jIGZ1bmN0aW9uIG1haW4oKSB7XG4gICAgY29uc3QgYm9hcmQgPSBhd2FpdCBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzLCByZWopIHtcbiAgICAgICAgbmV3IEJvYXJkQ29udHJvbGxlcihfY29uc3RhbnRzLkJTSVpFLCAwLCA3LCByZXMpO1xuICAgIH0pO1xuICAgIC8vIEpHT+OBruODrOODs+ODgOODquODs+OCsOOCkuWujOS6huOBleOBm+OCi+OBn+OCgeOBq3NldFRpbWVvdXTjgafjgqTjg5njg7Pjg4jjg6vjg7zjg5fjgpLpgLLjgoHjgotcbiAgICBjb25zdCAkc3RhcnRNb2RhbCA9ICQoJyNzdGFydC1tb2RhbCcpO1xuICAgICRzdGFydE1vZGFsLm1vZGFsKCdzaG93Jyk7XG4gICAgc2V0VGltZW91dChhc3luYyBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBhd2FpdCBlbmdpbmUubG9hZE5OKCk7XG4gICAgICAgICAgICAkKCcjbG9hZGluZy1tZXNzYWdlJykudGV4dChpMThuLmZpbmlzaERvd25sb2FkKTtcbiAgICAgICAgICAgICQoJyNzdGFydC1nYW1lJykucHJvcCgnZGlzYWJsZWQnLCBmYWxzZSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGlmIChlLm1lc3NhZ2UgPT09ICdObyBiYWNrZW5kIGlzIGF2YWlsYWJsZScpIHtcbiAgICAgICAgICAgICAgICBpZiAoLyhNYWMgT1MgWCAxMF8xM3woaVBhZHxpUGhvbmV8aVBvZCk7IENQVSBPUyAxMSkuKlNhZmFyaS8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSAmJiAhL0Nocm9tZS8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSkge1xuICAgICAgICAgICAgICAgICAgICBpMThuU3BlYWsoaTE4bi5ub3RTdXBwb3J0ICsgaTE4bi5zYWZhcmlXaXRob3V0V2ViZ3B1KTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFpMThuU3BlYWsoaTE4bi5ub3RTdXBwb3J0KSkge1xuICAgICAgICAgICAgICAgICAgICBhbGVydChpMThuLm5vdFN1cHBvcnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjb25kaXRpb24gPSBhd2FpdCBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzLCByZWopIHtcbiAgICAgICAgICAgICRzdGFydE1vZGFsLm9uZSgnaGlkZGVuLmJzLm1vZGFsJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkY29uZGl0aW9uRm9ybSA9ICQoJyNjb25kaXRpb24tZm9ybScpO1xuICAgICAgICAgICAgICAgIHJlcyh7XG4gICAgICAgICAgICAgICAgICAgIGNvbG9yOiAkY29uZGl0aW9uRm9ybVswXVsnY29sb3InXS52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgdGltZVJ1bGU6ICRjb25kaXRpb25Gb3JtWzBdWyd0aW1lJ10udmFsdWUsXG4gICAgICAgICAgICAgICAgICAgIHRpbWU6IHBhcnNlSW50KCRjb25kaXRpb25Gb3JtWzBdWydhaS1ieW95b21pJ10udmFsdWUpXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHN3aXRjaCAoY29uZGl0aW9uLnRpbWVSdWxlKSB7XG4gICAgICAgICAgICBjYXNlICdhaS10aW1lJzpcbiAgICAgICAgICAgICAgICBhd2FpdCBlbmdpbmUudGltZVNldHRpbmdzKDAsIGNvbmRpdGlvbi50aW1lKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2lnby1xdWVzdCc6XG4gICAgICAgICAgICAgICAgYXdhaXQgZW5naW5lLnRpbWVTZXR0aW5ncygzICogNjAgKyA1NSwgMSk7IC8vIDnot6/nm6Tjga/lubPlnYfmiYvmlbDjgYwxMTDmiYvjgonjgZfjgYTjga7jgafjgIE1NeOBruODleOCo+ODg+OCt+ODo+ODvOenkuOCkui/veWKoFxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb25kaXRpb24uY29sb3IgPT09ICdXJykge1xuICAgICAgICAgICAgYm9hcmQuc2V0T3duQ29sb3IoSkdPLldISVRFKTtcbiAgICAgICAgICAgIGJvYXJkLnNldEtvbWkoNS41KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGJvYXJkLnNldE93bkNvbG9yKEpHTy5CTEFDSyk7XG4gICAgICAgICAgICBib2FyZC5zZXRLb21pKDYuNSk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY29udHJvbGxlciA9IG5ldyBQbGF5Q29udHJvbGxlcihlbmdpbmUsIGJvYXJkLCBjb25kaXRpb24udGltZVJ1bGUgPT09ICdpZ28tcXVlc3QnKTtcbiAgICAgICAgY29uc3QgaXNTZWxmUGxheSA9IGNvbmRpdGlvbi5jb2xvciA9PT0gJ3NlbGYtcGxheSc7XG4gICAgICAgIGlmICghaXNTZWxmUGxheSkge1xuICAgICAgICAgICAgaTE4blNwZWFrKGkxOG4uc3RhcnRHcmVldCk7XG4gICAgICAgIH1cbiAgICAgICAgY29udHJvbGxlci5zZXRJc1NlbGZQbGF5KGlzU2VsZlBsYXkpO1xuICAgICAgICBib2FyZC5hZGRPYnNlcnZlcihjb250cm9sbGVyKTtcbiAgICAgICAgJCgnI3Bhc3MnKS5vbignY2xpY2snLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIGNvbnRyb2xsZXIucGFzcygpO1xuICAgICAgICB9KTtcbiAgICAgICAgJCgnI3Jlc2lnbicpLm9uKCdjbGljaycsIGFzeW5jIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgY29udHJvbGxlci5jbGVhclRpbWVyKCk7XG4gICAgICAgICAgICBhd2FpdCBlbmdpbmUuc3RvcFBvbmRlcigpO1xuICAgICAgICAgICAgaTE4blNwZWFrKGkxOG4uZW5kR3JlZXQpO1xuICAgICAgICAgICAgJChkb2N1bWVudC5ib2R5KS5hZGRDbGFzcygnZW5kJyk7XG4gICAgICAgIH0pO1xuICAgICAgICAkKCcjcmV0cnknKS5vbmUoJ2NsaWNrJywgYXN5bmMgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAkKCcjcGFzcycpLm9mZignY2xpY2snKTtcbiAgICAgICAgICAgICQoJyNyZXNpZ24nKS5vZmYoJ2NsaWNrJyk7XG4gICAgICAgICAgICBib2FyZC5kZXN0cm95KCk7XG4gICAgICAgICAgICBlbmdpbmUuY2xlYXIoKTtcbiAgICAgICAgICAgICQoZG9jdW1lbnQuYm9keSkucmVtb3ZlQ2xhc3MoJ2VuZCcpO1xuICAgICAgICAgICAgc2V0VGltZW91dChtYWluLCAwKTtcbiAgICAgICAgfSk7XG4gICAgfSwgMCk7XG59XG5cbmNvbnN0IHdvcmtlciA9IG5ldyBXb3JrZXIoJ2pzL3dvcmtlci5qcycpO1xuKDAsIF93b3JrZXJSbWkucmVzaWd0ZXJXb3JrZXJSTUkpKHdvcmtlciwgX25ldXJhbF9uZXR3b3JrLk5ldXJhbE5ldHdvcmspO1xuY29uc3QgZW5naW5lID0gbmV3IEE5RW5naW5lKHdvcmtlcik7XG5tYWluKCk7IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLk5ldXJhbE5ldHdvcmsgPSB1bmRlZmluZWQ7XG5cbnZhciBfY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMuanMnKTtcblxudmFyIF91dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcblxuaWYgKCFBcnJheUJ1ZmZlci5wcm90b3R5cGUuc2xpY2UpIHtcbiAgICBBcnJheUJ1ZmZlci5wcm90b3R5cGUuc2xpY2UgPSBmdW5jdGlvbiAoc3RhcnQsIGVuZCkge1xuICAgICAgICB2YXIgdGhhdCA9IG5ldyBVaW50OEFycmF5KHRoaXMpO1xuICAgICAgICBpZiAoZW5kID09IHVuZGVmaW5lZCkgZW5kID0gdGhhdC5sZW5ndGg7XG4gICAgICAgIHZhciByZXN1bHQgPSBuZXcgQXJyYXlCdWZmZXIoZW5kIC0gc3RhcnQpO1xuICAgICAgICB2YXIgcmVzdWx0QXJyYXkgPSBuZXcgVWludDhBcnJheShyZXN1bHQpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJlc3VsdEFycmF5Lmxlbmd0aDsgaSsrKSByZXN1bHRBcnJheVtpXSA9IHRoYXRbaSArIHN0YXJ0XTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xufSAvKiBnbG9iYWwgV2ViRE5OICQgKi9cblxuXG5mdW5jdGlvbiBzZXRMb2FkaW5nQmFyKHBlcmNlbnRhZ2UpIHtcbiAgICBjb25zdCAkbG9hZGluZ0JhciA9ICQoJyNsb2FkaW5nLWJhcicpO1xuICAgICRsb2FkaW5nQmFyLmF0dHIoJ2FyaWEtdmFsdWVub3cnLCBwZXJjZW50YWdlKTtcbiAgICAkbG9hZGluZ0Jhci5jc3MoJ3dpZHRoJywgcGVyY2VudGFnZS50b1N0cmluZygpICsgJyUnKTtcbn1cblxuY2xhc3MgTmV1cmFsTmV0d29yayB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMubm4gPSBudWxsO1xuICAgIH1cblxuICAgIGFzeW5jIGxvYWQoKSB7XG4gICAgICAgIGlmICh0aGlzLm5uKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICAgICAgICAgIGJhY2tlbmRPcmRlcjogWyd3ZWJncHUnLCAnd2ViZ2wnXSxcbiAgICAgICAgICAgIHByb2dyZXNzQ2FsbGJhY2s6IGZ1bmN0aW9uIChsb2FkZWQsIHRvdGFsKSB7XG4gICAgICAgICAgICAgICAgc2V0TG9hZGluZ0Jhcihsb2FkZWQgLyB0b3RhbCAqIDEwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHNldExvYWRpbmdCYXIoMCk7XG4gICAgICAgIHRoaXMubm4gPSBhd2FpdCBXZWJETk4ubG9hZChfY29uc3RhbnRzLkxFRUxBX1pFUk8gPyAnLi9vdXRwdXRfbGVlbGEnIDogJy4vb3V0cHV0Jywgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgYXN5bmMgZXZhbHVhdGUoLi4uaW5wdXRzKSB7XG4gICAgICAgIGNvbnN0IHZpZXdzID0gdGhpcy5ubi5nZXRJbnB1dFZpZXdzKCk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaW5wdXRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2aWV3c1tpXS5zZXQoaW5wdXRzW2ldKTtcbiAgICAgICAgfVxuICAgICAgICBhd2FpdCB0aGlzLm5uLnJ1bigpO1xuICAgICAgICByZXR1cm4gdGhpcy5ubi5nZXRPdXRwdXRWaWV3cygpLm1hcChlID0+IGUudG9BY3R1YWwoKS5zbGljZSgwKSk7IC8vIHRvLkFjdHVhbOOBneOBruOCguOBruOBp+OBr3dvcmtlcuWBtOOBp2RldGFjaOOBjOOBp+OBjeOBquOBhOaooeanmFxuICAgIH1cbn1cbmV4cG9ydHMuTmV1cmFsTmV0d29yayA9IE5ldXJhbE5ldHdvcms7IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLnNwZWFrID0gc3BlYWs7XG5mdW5jdGlvbiBzcGVhayh0ZXh0LCBsYW5nLCBnZW5kZXIpIHtcbiAgICBpZiAoIVNwZWVjaFN5bnRoZXNpc1V0dGVyYW5jZSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgc3dpdGNoIChsYW5nKSB7XG4gICAgICAgIGNhc2UgJ2VuJzpcbiAgICAgICAgICAgIGxhbmcgPSAnZW4tdXMnO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2phJzpcbiAgICAgICAgICAgIGxhbmcgPSAnamEtanAnO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGNvbnN0IHV0dGVyYW5jZSA9IG5ldyBTcGVlY2hTeW50aGVzaXNVdHRlcmFuY2UodGV4dCk7XG4gICAgaWYgKC8oaVBob25lfGlQYWR8aVBvZCkoPz0uKk9TIFs3LThdKS8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSkgdXR0ZXJhbmNlLnJhdGUgPSAwLjI7XG4gICAgY29uc3Qgdm9pY2VzID0gc3BlZWNoU3ludGhlc2lzLmdldFZvaWNlcygpLmZpbHRlcihlID0+IGUubGFuZy50b0xvd2VyQ2FzZSgpID09PSBsYW5nKTtcbiAgICBsZXQgdm9pY2UgPSBudWxsO1xuICAgIGlmICh2b2ljZXMubGVuZ3RoID4gMSkge1xuICAgICAgICBsZXQgbmFtZXMgPSBudWxsO1xuICAgICAgICBzd2l0Y2ggKGxhbmcpIHtcbiAgICAgICAgICAgIGNhc2UgJ2phLWpwJzpcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGdlbmRlcikge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdtYWxlJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWVzID0gWydPdG95YScsICdIYXR0b3JpJywgJ0ljaGlybyddO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2ZlbWFsZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lcyA9IFsnTy1yZW7vvIjmi6HlvLXvvIknLCAnTy1yZW4nLCAnS3lva28nLCAnSGFydWthJ107IC8vIFdpbmRvd3MgMTDjga5BeXVtaeOBruWjsOOBr+S7iuOBsuOBqOOBpFxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnZW4tdXMnOlxuICAgICAgICAgICAgICAgIHN3aXRjaCAoZ2VuZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ21hbGUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZXMgPSBbJ0FsZXgnLCAnRnJlZCddO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2ZlbWFsZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lcyA9IFsnU2FtYW50aGEnLCAnVmljdG9yaWEnXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBpZiAobmFtZXMpIHtcbiAgICAgICAgICAgIHZvaWNlID0gdm9pY2VzLmZpbHRlcih2ID0+IG5hbWVzLnNvbWUobiA9PiB2Lm5hbWUuaW5kZXhPZihuKSA+PSAwKSlbMF07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF2b2ljZSkge1xuICAgICAgICAgICAgdm9pY2UgPSB2b2ljZXMuZmlsdGVyKHYgPT4gdi5nZW5kZXIgJiYgdi5nZW5kZXIudG9Mb3dlckNhc2UoKSA9PT0gZ2VuZGVyKVswXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB1dHRlcmFuY2Uudm9pY2UgPSB2b2ljZSB8fCB2b2ljZXNbMF07XG4gICAgLy8gaU9TIDEwIFNhZmFyaSBoYXMgYSBidWcgdGhhdCB1dHRlcmFuY2Uudm9pY2UgaXMgbm8gZWZmZWN0LlxuICAgIHV0dGVyYW5jZS52b2x1bWUgPSBwYXJzZUZsb2F0KGxvY2FsU3RvcmFnZS5nZXRJdGVtKCd2b2x1bWUnKSB8fCAnMS4wJyk7XG4gICAgc3BlZWNoU3ludGhlc2lzLnNwZWFrKHV0dGVyYW5jZSk7XG4gICAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIHVubG9jaygpIHtcbiAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCB1bmxvY2spO1xuICAgIHNwZWVjaFN5bnRoZXNpcy5zcGVhayhuZXcgU3BlZWNoU3ludGhlc2lzVXR0ZXJhbmNlKCcnKSk7XG59XG5cbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgaWYgKHNwZWVjaFN5bnRoZXNpcykge1xuICAgICAgICBzcGVlY2hTeW50aGVzaXMuZ2V0Vm9pY2VzKCk7XG4gICAgICAgIGlmIChzcGVlY2hTeW50aGVzaXMub252b2ljZXNjaGFuZ2VkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHNwZWVjaFN5bnRoZXNpcy5vbnZvaWNlc2NoYW5nZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ29udm9pY2VzY2hhbmdlZCcpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB1bmxvY2ssIGZhbHNlKTsgLy8gZm9yIGlPU1xuICAgIH1cbn0pOyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5zaHVmZmxlID0gc2h1ZmZsZTtcbmV4cG9ydHMubW9zdENvbW1vbiA9IG1vc3RDb21tb247XG5leHBvcnRzLmFyZ3NvcnQgPSBhcmdzb3J0O1xuZXhwb3J0cy5hcmdtYXggPSBhcmdtYXg7XG5leHBvcnRzLmhhc2ggPSBoYXNoO1xuZXhwb3J0cy5zb2Z0bWF4ID0gc29mdG1heDtcbmV4cG9ydHMucHJpbnRQcm9iID0gcHJpbnRQcm9iO1xuXG52YXIgX2NvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzLmpzJyk7XG5cbmZ1bmN0aW9uIHNodWZmbGUoYXJyYXkpIHtcbiAgICBsZXQgbiA9IGFycmF5Lmxlbmd0aDtcbiAgICBsZXQgdDtcbiAgICBsZXQgaTtcblxuICAgIHdoaWxlIChuKSB7XG4gICAgICAgIGkgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBuLS0pO1xuICAgICAgICB0ID0gYXJyYXlbbl07XG4gICAgICAgIGFycmF5W25dID0gYXJyYXlbaV07XG4gICAgICAgIGFycmF5W2ldID0gdDtcbiAgICB9XG5cbiAgICByZXR1cm4gYXJyYXk7XG59XG5cbmZ1bmN0aW9uIG1vc3RDb21tb24oYXJyYXkpIHtcbiAgICBjb25zdCBtYXAgPSBuZXcgTWFwKCk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCBlID0gYXJyYXlbaV07XG4gICAgICAgIGlmIChtYXAuaGFzKGUpKSB7XG4gICAgICAgICAgICBtYXAuc2V0KGUsIG1hcC5nZXQoZSkgKyAxKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG1hcC5zZXQoZSwgMSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgbGV0IG1heEtleTtcbiAgICBsZXQgbWF4VmFsdWUgPSAtMTtcbiAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBtYXAuZW50cmllcygpKSB7XG4gICAgICAgIGlmICh2YWx1ZSA+IG1heFZhbHVlKSB7XG4gICAgICAgICAgICBtYXhLZXkgPSBrZXk7XG4gICAgICAgICAgICBtYXhWYWx1ZSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBtYXhLZXk7XG59XG5cbmZ1bmN0aW9uIGFyZ3NvcnQoYXJyYXksIHJldmVyc2UpIHtcbiAgICBjb25zdCBlbiA9IEFycmF5LmZyb20oYXJyYXkpLm1hcCgoZSwgaSkgPT4gW2ksIGVdKTtcbiAgICBlbi5zb3J0KChhLCBiKSA9PiByZXZlcnNlID8gYlsxXSAtIGFbMV0gOiBhWzFdIC0gYlsxXSk7XG4gICAgcmV0dXJuIGVuLm1hcChlID0+IGVbMF0pO1xufVxuXG5mdW5jdGlvbiBhcmdtYXgoYXJyYXkpIHtcbiAgICBsZXQgbWF4SW5kZXg7XG4gICAgbGV0IG1heFZhbHVlID0gLUluZmluaXR5O1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgdiA9IGFycmF5W2ldO1xuICAgICAgICBpZiAodiA+IG1heFZhbHVlKSB7XG4gICAgICAgICAgICBtYXhJbmRleCA9IGk7XG4gICAgICAgICAgICBtYXhWYWx1ZSA9IHY7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG1heEluZGV4O1xufVxuXG5mdW5jdGlvbiBoYXNoKHN0cikge1xuICAgIGxldCBoYXNoID0gNTM4MTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCBjaGFyID0gc3RyLmNoYXJDb2RlQXQoaSk7XG4gICAgICAgIGhhc2ggPSAoaGFzaCA8PCA1KSArIGhhc2ggKyBjaGFyOyAvKiBoYXNoICogMzMgKyBjICovXG4gICAgICAgIGhhc2ggPSBoYXNoICYgaGFzaDsgLy8gQ29udmVydCB0byAzMmJpdCBpbnRlZ2VyXG4gICAgfVxuICAgIHJldHVybiBNYXRoLmFicyhoYXNoKTtcbn1cblxuZnVuY3Rpb24gc29mdG1heChpbnB1dCwgdGVtcGVyYXR1cmUgPSAxLjApIHtcbiAgICBjb25zdCBvdXRwdXQgPSBuZXcgRmxvYXQzMkFycmF5KGlucHV0Lmxlbmd0aCk7XG4gICAgY29uc3QgYWxwaGEgPSBNYXRoLm1heC5hcHBseShudWxsLCBpbnB1dCk7XG4gICAgbGV0IGRlbm9tID0gMC4wO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbnB1dC5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCB2YWwgPSBNYXRoLmV4cCgoaW5wdXRbaV0gLSBhbHBoYSkgLyB0ZW1wZXJhdHVyZSk7XG4gICAgICAgIGRlbm9tICs9IHZhbDtcbiAgICAgICAgb3V0cHV0W2ldID0gdmFsO1xuICAgIH1cblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgb3V0cHV0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG91dHB1dFtpXSAvPSBkZW5vbTtcbiAgICB9XG5cbiAgICByZXR1cm4gb3V0cHV0O1xufVxuXG5mdW5jdGlvbiBwcmludFByb2IocHJvYikge1xuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgX2NvbnN0YW50cy5CU0laRTsgeSsrKSB7XG4gICAgICAgIGxldCBzdHIgPSBgJHt5ICsgMX0gYDtcbiAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCBfY29uc3RhbnRzLkJTSVpFOyB4KyspIHtcbiAgICAgICAgICAgIHN0ciArPSAoJyAgJyArIHByb2JbeCArIHkgKiBfY29uc3RhbnRzLkJTSVpFXS50b0ZpeGVkKDEpKS5zbGljZSgtNSk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS5sb2coc3RyKTtcbiAgICB9XG4gICAgY29uc29sZS5sb2coJ3Bhc3M9JXMnLCBwcm9iW3Byb2IubGVuZ3RoIC0gMV0udG9GaXhlZCgxKSk7XG59Il19
