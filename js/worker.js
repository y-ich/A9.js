(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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
            try {
                result = await instance[data.methodName].apply(instance, data.args)
                message.result = result;
                this.workerRMI.target.postMessage(message, getTransferList(result));
            } catch (e) {
                message.error = e.toString();
                this.workerRMI.target.postMessage(message);
            }
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
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.Board = exports.Candidates = undefined;
exports.neighbors = neighbors;
exports.diagonals = diagonals;

var _utils = require('./utils.js');

var _constants = require('./constants.js');

var _intersection = require('./intersection.js');

var _stone_group = require('./stone_group.js');

var _coord_convert = require('./coord_convert.js');

function neighbors(v) {
    return [v + 1, v + _constants.EBSIZE, v - 1, v - _constants.EBSIZE];
}

function diagonals(v) {
    return [v + _constants.EBSIZE + 1, v + _constants.EBSIZE - 1, v - _constants.EBSIZE - 1, v - _constants.EBSIZE + 1];
}

class Candidates {
    constructor(hash, moveCnt, list) {
        this.hash = hash;
        this.moveCnt = moveCnt;
        this.list = list;
    }
}

exports.Candidates = Candidates;
class Board {
    constructor(komi = 7) {
        this.komi = komi;
        this.state = new Uint8Array(_constants.EBVCNT);
        this.state.fill(_intersection.EXTERIOR);
        this.id = new Uint8Array(_constants.EBVCNT);
        this.next = new Uint8Array(_constants.EBVCNT);
        this.sg = [];
        for (let i = 0; i < _constants.EBVCNT; i++) {
            this.sg.push(new _stone_group.StoneGroup());
        }
        this.prevState = [];
        this.ko = _constants.VNULL;
        this.turn = _intersection.BLACK;
        this.moveCnt = 0;
        this.prevMove = _constants.VNULL;
        this.removeCnt = 0;
        this.history = [];
        this.clear();
    }

    getMoveCnt() {
        return this.moveCnt;
    }

    getPrevMove() {
        return this.prevMove;
    }

    getHistory() {
        return this.history;
    }

    clear() {
        for (let x = 1; x <= _constants.BSIZE; x++) {
            for (let y = 1; y <= _constants.BSIZE; y++) {
                this.state[(0, _coord_convert.xy2ev)(x, y)] = _intersection.EMPTY;
            }
        }
        for (let i = 0; i < this.id.length; i++) {
            this.id[i] = i;
        }
        for (let i = 0; i < this.next.length; i++) {
            this.next[i] = i;
        }
        this.sg.forEach(e => {
            e.clear(false);
        });
        this.prevState = [];
        for (let i = 0; i < _constants.KEEP_PREV_CNT; i++) {
            this.prevState.push(new Uint8Array(this.state));
        }
        this.ko = _constants.VNULL;
        this.turn = _intersection.BLACK;
        this.moveCnt = 0;
        this.prevMove = _constants.VNULL;
        this.removeCnt = 0;
        this.history = [];
    }

    copyTo(dest) {
        dest.state = new Uint8Array(this.state);
        dest.id = new Uint8Array(this.id);
        dest.next = new Uint8Array(this.next);
        for (let i = 0; i < dest.sg.length; i++) {
            this.sg[i].copyTo(dest.sg[i]);
        }
        dest.prevState = [];
        for (let i = 0; i < _constants.KEEP_PREV_CNT; i++) {
            dest.prevState.push(new Uint8Array(this.prevState[i]));
        }
        dest.ko = this.ko;
        dest.turn = this.turn;
        dest.moveCnt = this.moveCnt;
        dest.removeCnt = this.removeCnt;
        dest.history = Array.from(this.history);
    }

    playSequence(sequence) {
        for (const v of sequence) {
            this.play(v, false);
        }
    }

    remove(v) {
        let vTmp = v;
        while (true) {
            this.removeCnt += 1;
            this.state[vTmp] = _intersection.EMPTY;
            this.id[vTmp] = vTmp;
            for (const nv of neighbors(vTmp)) {
                this.sg[this.id[nv]].add(vTmp);
            }
            const vNext = this.next[vTmp];
            this.next[vTmp] = vTmp;
            vTmp = vNext;
            if (vTmp === v) {
                break;
            }
        }
    }

    merge(v1, v2) {
        let idBase = this.id[v1];
        let idAdd = this.id[v2];
        if (this.sg[idBase].getSize() < this.sg[idAdd].getSize()) {
            let tmp = idBase;
            idBase = idAdd;
            idAdd = tmp;
        }

        this.sg[idBase].merge(this.sg[idAdd]);

        let vTmp = idAdd;
        while (true) {
            this.id[vTmp] = idBase;
            vTmp = this.next[vTmp];
            if (vTmp === idAdd) {
                break;
            }
        }
        const tmp = this.next[v1];
        this.next[v1] = this.next[v2];
        this.next[v2] = tmp;
    }

    placeStone(v) {
        const stoneColor = this.turn;
        this.state[v] = stoneColor;
        this.id[v] = v;
        this.sg[this.id[v]].clear(true);
        for (const nv of neighbors(v)) {
            if (this.state[nv] === _intersection.EMPTY) {
                this.sg[this.id[v]].add(nv);
            } else {
                this.sg[this.id[nv]].sub(v);
            }
        }
        for (const nv of neighbors(v)) {
            if (this.state[nv] === stoneColor && this.id[nv] !== this.id[v]) {
                this.merge(v, nv);
            }
        }
        this.removeCnt = 0;
        const opponentStone = (0, _intersection.opponentOf)(this.turn);
        for (const nv of neighbors(v)) {
            if (this.state[nv] === opponentStone && this.sg[this.id[nv]].getLibCnt() === 0) {
                this.remove(nv);
            }
        }
    }

    legal(v) {
        if (v === _constants.PASS) {
            return true;
        } else if (v === this.ko || this.state[v] !== _intersection.EMPTY) {
            return false;
        }

        const stoneCnt = [0, 0];
        const atrCnt = [0, 0];
        for (const nv of neighbors(v)) {
            const c = this.state[nv];
            switch (c) {
                case _intersection.EMPTY:
                    return true;
                case _intersection.BLACK:
                case _intersection.WHITE:
                    stoneCnt[c] += 1;
                    if (this.sg[this.id[nv]].getLibCnt() === 1) {
                        atrCnt[c] += 1;
                    }
            }
        }
        return atrCnt[(0, _intersection.opponentOf)(this.turn)] !== 0 || atrCnt[this.turn] < stoneCnt[this.turn];
    }

    eyeshape(v, pl) {
        if (v === _constants.PASS) {
            return false;
        }
        for (const nv of neighbors(v)) {
            const c = this.state[nv];
            if (c === _intersection.EMPTY || c === (0, _intersection.opponentOf)(pl)) {
                return false;
            }
        }
        const diagCnt = [0, 0, 0, 0];
        for (const nv of diagonals(v)) {
            diagCnt[this.state[nv]] += 1;
        }
        const wedgeCnt = diagCnt[(0, _intersection.opponentOf)(pl)] + (diagCnt[3] > 0 ? 1 : 0);
        if (wedgeCnt === 2) {
            for (const nv of diagonals(v)) {
                if (this.state[nv] === (0, _intersection.opponentOf)(pl) && this.sg[this.id[nv]].getLibCnt() === 1 && this.sg[this.id[nv]].getVAtr() !== this.ko) {
                    return true;
                }
            }
        }
        return wedgeCnt < 2;
    }

    play(v, notFillEye) {
        if (!this.legal(v)) {
            return false;
        }
        if (notFillEye && this.eyeshape(v, this.turn)) {
            return false;
        }
        for (let i = _constants.KEEP_PREV_CNT - 2; i >= 0; i--) {
            this.prevState[i + 1] = this.prevState[i];
        }
        this.prevState[0] = new Uint8Array(this.state);
        if (v === _constants.PASS) {
            this.ko = _constants.VNULL;
        } else {
            this.placeStone(v);
            const id = this.id[v];
            this.ko = _constants.VNULL;
            if (this.removeCnt === 1 && this.sg[id].getLibCnt() === 1 && this.sg[id].getSize() === 1) {
                this.ko = this.sg[id].getVAtr();
            }
        }
        this.prevMove = v;
        this.history.push(v);
        this.turn = (0, _intersection.opponentOf)(this.turn);
        this.moveCnt += 1;
        return true;
    }

    randomPlay() {
        const emptyList = [];
        for (let i = 0; i < this.state.length; i++) {
            if (this.state[i] === _intersection.EMPTY) {
                emptyList.push(i);
            }
        }
        (0, _utils.shuffle)(emptyList);
        for (const v of emptyList) {
            if (this.play(v, true)) {
                return v;
            }
        }
        this.play(_constants.PASS, true);
        return _constants.PASS;
    }

    score() {
        const stoneCnt = [0, 0];
        for (let _v = 0; _v < _constants.BVCNT; _v++) {
            const v = (0, _coord_convert.rv2ev)(_v);
            const s = this.state[v];
            if (s === _intersection.BLACK || s === _intersection.WHITE) {
                stoneCnt[s] += 1;
            } else {
                const nbrCnt = [0, 0, 0, 0];
                for (const nv of neighbors(v)) {
                    nbrCnt[this.state[nv]] += 1;
                }
                if (nbrCnt[_intersection.WHITE] > 0 && nbrCnt[_intersection.BLACK] === 0) {
                    stoneCnt[_intersection.WHITE] += 1;
                } else if (nbrCnt[_intersection.BLACK] > 0 && nbrCnt[_intersection.WHITE] === 0) {
                    stoneCnt[_intersection.BLACK] += 1;
                }
            }
        }
        return stoneCnt[1] - stoneCnt[0] - this.komi;
    }

    rollout(showBoard) {
        while (this.moveCnt < _constants.EBVCNT * 2) {
            const prevMove = this.prevMove;
            const move = this.randomPlay();
            if (showBoard && move !== _constants.PASS) {
                console.log('\nmove count=%d', this.moveCnt);
                this.showboard();
            }
            if (prevMove === _constants.PASS && move === _constants.PASS) {
                break;
            }
        }
    }

    showboard() {
        function printXlabel() {
            let lineStr = '  ';
            for (let x = 1; x <= _constants.BSIZE; x++) {
                lineStr += ` ${_coord_convert.X_LABELS[x]} `;
            }
            console.log(lineStr);
        }
        printXlabel();
        for (let y = _constants.BSIZE; y > 0; y--) {
            let lineStr = (' ' + y.toString()).slice(-2);
            for (let x = 1; x <= _constants.BSIZE; x++) {
                const v = (0, _coord_convert.xy2ev)(x, y);
                let xStr;
                switch (this.state[v]) {
                    case _intersection.BLACK:
                        xStr = v === this.prevMove ? '[X]' : ' X ';
                        break;
                    case _intersection.WHITE:
                        xStr = v === this.prevMove ? '[O]' : ' O ';
                        break;
                    case _intersection.EMPTY:
                        xStr = ' . ';
                        break;
                    default:
                        xStr = ' ? ';
                }
                lineStr += xStr;
            }
            lineStr += (' ' + y.toString()).slice(-2);
            console.log(lineStr);
        }
        printXlabel();
        console.log('');
    }

    feature() {
        const index = (p, f) => p * _constants.FEATURE_CNT + f;
        const array = new Float32Array(_constants.BVCNT * _constants.FEATURE_CNT);
        const my = this.turn;
        const opp = (0, _intersection.opponentOf)(this.turn);

        if (_constants.LEELA_ZERO) {
            const N = _constants.KEEP_PREV_CNT + 1;
            for (let p = 0; p < _constants.BVCNT; p++) {
                array[index(p, 0)] = this.state[(0, _coord_convert.rv2ev)(p)] === my ? 1.0 : 0.0;
            }
            for (let p = 0; p < _constants.BVCNT; p++) {
                array[index(p, N)] = this.state[(0, _coord_convert.rv2ev)(p)] === opp ? 1.0 : 0.0;
            }
            for (let i = 0; i < _constants.KEEP_PREV_CNT; i++) {
                for (let p = 0; p < _constants.BVCNT; p++) {
                    array[index(p, i + 1)] = this.prevState[i][(0, _coord_convert.rv2ev)(p)] === my ? 1.0 : 0.0;
                }
                for (let p = 0; p < _constants.BVCNT; p++) {
                    array[index(p, N + i + 1)] = this.prevState[i][(0, _coord_convert.rv2ev)(p)] === opp ? 1.0 : 0.0;
                }
            }
            let is_black_turn, is_white_turn;
            if (my === _intersection.BLACK) {
                is_black_turn = 1.0;
                is_white_turn = 0.0;
            } else {
                is_black_turn = 0.0;
                is_white_turn = 1.0;
            }
            for (let p = 0; p < _constants.BVCNT; p++) {
                array[index(p, _constants.FEATURE_CNT - 2)] = is_black_turn;
                array[index(p, _constants.FEATURE_CNT - 1)] = is_white_turn;
            }
        } else {
            for (let p = 0; p < _constants.BVCNT; p++) {
                array[index(p, 0)] = this.state[(0, _coord_convert.rv2ev)(p)] === my ? 1.0 : 0.0;
            }
            for (let p = 0; p < _constants.BVCNT; p++) {
                array[index(p, 1)] = this.state[(0, _coord_convert.rv2ev)(p)] === opp ? 1.0 : 0.0;
            }
            for (let i = 0; i < _constants.KEEP_PREV_CNT; i++) {
                for (let p = 0; p < _constants.BVCNT; p++) {
                    array[index(p, (i + 1) * 2)] = this.prevState[i][(0, _coord_convert.rv2ev)(p)] === my ? 1.0 : 0.0;
                }
                for (let p = 0; p < _constants.BVCNT; p++) {
                    array[index(p, (i + 1) * 2 + 1)] = this.prevState[i][(0, _coord_convert.rv2ev)(p)] === opp ? 1.0 : 0.0;
                }
            }
            for (let p = 0; p < _constants.BVCNT; p++) {
                array[index(p, _constants.FEATURE_CNT - 1)] = my;
            }
        }
        return array;
    }

    hash() {
        return (0, _utils.hash)((this.state.toString() + this.prevState[0].toString() + this.turn.toString()).replace(',', ''));
    }

    candidates() {
        const candList = [];
        for (let v = 0; v < this.state.length; v++) {
            if (this.state[v] === _intersection.EMPTY && this.legal(v) && !this.eyeshape(v, this.turn)) {
                candList.push((0, _coord_convert.ev2rv)(v));
            }
        }
        candList.push((0, _coord_convert.ev2rv)(_constants.PASS));
        return new Candidates(this.hash(), this.moveCnt, candList);
    }

    finalScore() {
        const ROLL_OUT_NUM = 256;
        const doubleScoreList = [];
        let bCpy = new Board(this.komi);
        for (let i = 0; i < ROLL_OUT_NUM; i++) {
            this.copyTo(bCpy);
            bCpy.rollout(false);
            doubleScoreList.push(bCpy.score());
        }
        return (0, _utils.mostCommon)(doubleScoreList);
    }
}
exports.Board = Board; /*
                       function testBoard() {
                           const b = new Board();
                           b.playSequence(['A1', 'A2', 'A9', 'B1'].map(str2ev));
                           b.showboard();
                       }
                       testBoard();
                       */
},{"./constants.js":5,"./coord_convert.js":6,"./intersection.js":7,"./stone_group.js":10,"./utils.js":11}],5:[function(require,module,exports){
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
},{}],6:[function(require,module,exports){
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
},{"./constants.js":5}],7:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.opponentOf = opponentOf;
const WHITE = exports.WHITE = 0;
const BLACK = exports.BLACK = 1;

function opponentOf(color) {
    switch (color) {
        case WHITE:
            return BLACK;
        case BLACK:
            return WHITE;
    }
}

const EMPTY = exports.EMPTY = 2;
const EXTERIOR = exports.EXTERIOR = 3;
},{}],8:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.NeuralNetwork = undefined;

var _workerRmi = require('worker-rmi');

var _constants = require('./constants.js');

var _utils = require('./utils.js');

class NeuralNetwork extends _workerRmi.WorkerRMI {
    async evaluate(...inputs) {
        const result = await this.invokeRM('evaluate', inputs);
        if (_constants.LEELA_ZERO) {
            result[0] = (0, _utils.softmax)(result[0]);
        }
        return result;
    }
}
exports.NeuralNetwork = NeuralNetwork; /* global */
},{"./constants.js":5,"./utils.js":11,"worker-rmi":3}],9:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.Tree = undefined;

var _utils = require('./utils.js');

var _constants = require('./constants.js');

var _coord_convert = require('./coord_convert.js');

var _board = require('./board.js');

const MAX_NODE_CNT = 16384;
const EXPAND_CNT = 8;

let TREE_CP = 2.0;

class Tree {
    constructor(nn) {
        this.mainTime = 0.0;
        this.byoyomi = 1.0;
        this.leftTime = 0.0;
        this.node = [];
        for (let i = 0; i < MAX_NODE_CNT; i++) {
            this.node.push(new Node());
        }
        this.nodeCnt = 0;
        this.rootId = 0;
        this.rootMoveCnt = 0;
        this.nodeHashs = new Map();
        this.evalCnt = 0;
        this.nn = nn;
    }

    setTime(mainTime, byoyomi) {
        this.mainTime = mainTime;
        this.leftTime = mainTime;
        this.byoyomi = byoyomi;
    }

    setLeftTime(leftTime) {
        this.leftTime = leftTime;
    }

    clear() {
        this.leftTime = this.mainTime;
        for (const nd of this.node) {
            nd.clear();
        }
        this.nodeCnt = 0;
        this.rootId = 0;
        this.rootMoveCnt = 0;
        this.nodeHashs.clear();
        this.evalCnt = 0;
    }

    deleteNode() {
        if (this.nodeCnt < MAX_NODE_CNT / 2) {
            return;
        }
        for (let i = 0; i < MAX_NODE_CNT; i++) {
            const mc = this.node[i].moveCnt;
            if (mc != null && mc < this.rootMoveCnt) {
                this.nodeHashs.delete(this.node[i].hash);
                this.node[i].clear();
            }
        }
    }

    createNode(b, prob) {
        const candidates = b.candidates();
        const hs = candidates.hash;
        if (this.nodeHashs.has(hs) && this.node[this.nodeHashs[hs]].hash === hs && this.node[this.nodeHashs[hs]].moveCnt === candidates.moveCnt) {
            return this.nodeHashs[hs];
        }

        let nodeId = hs % MAX_NODE_CNT;

        while (this.node[nodeId].moveCnt != -1) {
            nodeId = nodeId + 1 < MAX_NODE_CNT ? nodeId + 1 : 0;
        }

        this.nodeHashs[hs] = nodeId;
        this.nodeCnt += 1;

        const nd = this.node[nodeId];
        nd.clear();
        nd.moveCnt = candidates.moveCnt;
        nd.hash = hs;
        nd.initBranch();

        for (const rv of (0, _utils.argsort)(prob, true)) {
            if (candidates.list.includes(rv)) {
                nd.move[nd.branchCnt] = (0, _coord_convert.rv2ev)(rv);
                nd.prob[nd.branchCnt] = prob[rv];
                nd.branchCnt += 1;
            }
        }
        return nodeId;
    }

    bestByUCB(b, nodeId) {
        const nd = this.node[nodeId];
        const ndRate = nd.totalCnt === 0 ? 0.0 : nd.totalValue / nd.totalCnt;
        const cpsv = TREE_CP * Math.sqrt(nd.totalCnt);
        const actionValue = new Float32Array(_constants.BVCNT + 1);
        for (let i = 0; i < actionValue.length; i++) {
            actionValue[i] = nd.visitCnt[i] === 0 ? ndRate : nd.valueWin[i] / nd.visitCnt[i];
        }
        const ucb = new Float32Array(nd.branchCnt);
        for (let i = 0; i < ucb.length; i++) {
            ucb[i] = actionValue[i] + cpsv * nd.prob[i] / (nd.visitCnt[i] + 1);
        }
        const best = (0, _utils.argmax)(ucb);
        const nextId = nd.nextId[best];
        const nextMove = nd.move[best];
        const isHeadNode = !this.hasNext(nodeId, best, b.getMoveCnt() + 1) || nd.visitCnt[best] < EXPAND_CNT || b.getMoveCnt() > _constants.BVCNT * 2 || nextMove === _constants.PASS && b.getPrevMove() === _constants.PASS;
        return [best, nextId, nextMove, isHeadNode];
    }

    shouldSearch(best, second) {
        const nd = this.node[this.rootId];
        const winRate = this.branchRate(nd, best);

        return nd.totalCnt <= 5000 || nd.visitCnt[best] <= nd.visitCnt[second] * 100 && winRate >= 0.1 && winRate <= 0.9;
    }

    getSearchTime() {
        if (this.mainTime === 0.0 || this.leftTime < self.byoyomi * 2.0) {
            return Math.max(this.byoyomi, 1.0);
        } else {
            return this.leftTime / (55.0 + Math.max(50 - this.rootMoveCnt, 0));
        }
    }

    hasNext(nodeId, brId, moveCnt) {
        const nd = this.node[nodeId];
        const nextId = nd.nextId[brId];
        return nextId >= 0 && nd.nextHash[brId] === this.node[nextId].hash && this.node[nextId].moveCnt === moveCnt;
    }

    branchRate(nd, id) {
        return nd.valueWin[id] / Math.max(nd.visitCnt[id], 1) / 2.0 + 0.5;
    }

    bestSequence(nodeId, headMove) {
        let seqStr = ('   ' + (0, _coord_convert.ev2str)(headMove)).slice(-5);
        let nextMove = headMove;

        for (let i = 0; i < 7; i++) {
            const nd = this.node[nodeId];
            if (nextMove === _constants.PASS || nd.branchCnt < 1) {
                break;
            }

            const best = (0, _utils.argmax)(nd.visitCnt.slice(0, nd.branchCnt));
            if (nd.visitCnt[best] === 0) {
                break;
            }
            nextMove = nd.move[best];
            seqStr += '->' + ('   ' + (0, _coord_convert.ev2str)(nextMove)).slice(-5);

            if (!this.hasNext(nodeId, best, nd.moveCnt + 1)) {
                break;
            }
            nodeId = nd.nextId[best];
        }

        return seqStr;
    }

    printInfo(nodeId) {
        const nd = this.node[nodeId];
        const order = (0, _utils.argsort)(nd.visitCnt.slice(0, nd.branchCnt), true);
        console.log('|move|count  |rate |value|prob | best sequence');
        for (let i = 0; i < Math.min(order.length, 9); i++) {
            const m = order[i];
            const visitCnt = nd.visitCnt[m];
            if (visitCnt === 0) {
                break;
            }

            const rate = visitCnt === 0 ? 0.0 : this.branchRate(nd, m) * 100.0;
            const value = (nd.value[m] / 2.0 + 0.5) * 100.0;
            console.log('|%s|%s|%s|%s|%s| %s', ('   ' + (0, _coord_convert.ev2str)(nd.move[m])).slice(-4), (visitCnt + '      ').slice(0, 7), ('  ' + rate.toFixed(1)).slice(-5), ('  ' + value.toFixed(1)).slice(-5), ('  ' + (nd.prob[m] * 100.0).toFixed(1)).slice(-5), this.bestSequence(nd.nextId[m], nd.move[m]));
        }
    }

    async preSearch(b) {
        const [prob] = await this.nn.evaluate(b.feature());
        this.rootId = this.createNode(b, prob);
        this.rootMoveCnt = b.getMoveCnt();
        TREE_CP = this.rootMoveCnt < 8 ? 0.01 : 1.5;
    }

    async evaluateChildNode(b, nodeId, child) {
        let [prob, value] = await this.nn.evaluate(b.feature());
        this.evalCnt += 1;
        value = -value[0];
        const nd = this.node[nodeId];
        nd.value[child] = value;
        nd.evaluated[child] = true;
        if (this.nodeCnt > 0.85 * MAX_NODE_CNT) {
            this.deleteNode();
        }
        const nextId = this.createNode(b, prob);
        nd.nextId[child] = nextId;
        nd.nextHash[child] = b.hash();
        nd.totalValue -= nd.valueWin[child];
        nd.totalCnt += nd.visitCnt[child];
        return value;
    }

    async searchBranch(b, nodeId, route) {
        const [best, nextId, nextMove, isHeadNode] = this.bestByUCB(b, nodeId);
        route.push([nodeId, best]);
        b.play(nextMove, false);
        const nd = this.node[nodeId];
        const value = isHeadNode ? nd.evaluated[best] ? nd.value[best] : await this.evaluateChildNode(b, nodeId, best) : -(await this.searchBranch(b, nextId, route));
        nd.totalValue += value;
        nd.totalCnt += 1;
        nd.valueWin[best] += value;
        nd.visitCnt[best] += 1;
        return value;
    }

    async keepPlayout(b, exitCondition) {
        this.evalCnt = 0;
        let bCpy = new _board.Board();
        while (true) {
            b.copyTo(bCpy);
            await this.searchBranch(bCpy, this.rootId, []);
            if (exitCondition()) {
                break;
            }
        }
    }

    async _search(b, ponder, clean, exitCondition) {
        let [best, second] = this.node[this.rootId].best2();
        if (ponder || this.shouldSearch(best, second)) {
            await this.keepPlayout(b, exitCondition);
            const best2 = this.node[this.rootId].best2();
            best = best2[0];
            second = best2[1];
        }

        const nd = this.node[this.rootId];
        let nextMove = nd.move[best];
        let winRate = this.branchRate(nd, best);

        if (clean && nextMove === _constants.PASS && nd.valueWin[best] * nd.valueWin[second] > 0.0) {
            nextMove = nd.move[second];
            winRate = this.branchRate(nd, second);
        }
        return [nextMove, winRate];
    }

    async search(b, time, ponder, clean) {
        const start = Date.now();
        await this.preSearch(b);

        if (this.node[this.rootId].branchCnt <= 1) {
            console.log('\nmove count=%d:', this.rootMoveCnt + 1);
            this.printInfo(this.rootId);
            return [_constants.PASS, 0.5];
        }

        this.deleteNode();

        const time_ = (time === 0.0 ? this.getSearchTime() : time) * 1000;
        if (ponder) {
            self.PONDER_STOP = false;
        }
        const [nextMove, winRate] = await this._search(b, ponder, clean, ponder ? function () {
            return self.PONDER_STOP;
        } : function () {
            return Date.now() - start > time_;
        });

        if (!ponder) {
            console.log('\nmove count=%d: left time=%s[sec] evaluated=%d', this.rootMoveCnt + 1, Math.max(this.leftTime - time, 0.0).toFixed(1), this.evalCnt);
            this.printInfo(this.rootId);
            this.leftTime = this.leftTime - (Date.now() - start) / 1000;
        }

        return [nextMove, winRate];
    }
}

exports.Tree = Tree;
class Node {
    constructor() {
        this.move = new Uint8Array(_constants.BVCNT + 1);
        this.prob = new Float32Array(_constants.BVCNT + 1);
        this.value = new Float32Array(_constants.BVCNT + 1);
        this.valueWin = new Float32Array(_constants.BVCNT + 1);
        this.visitCnt = new Uint32Array(_constants.BVCNT + 1);
        this.nextId = new Int16Array(_constants.BVCNT + 1);
        this.nextHash = new Uint32Array(_constants.BVCNT + 1);
        this.evaluated = [];
        this.branchCnt = 0;
        this.totalValue = 0.0;
        this.totalCnt = 0;
        this.hash = 0;
        this.moveCnt = -1;
        this.initBranch();
        this.clear();
    }

    initBranch() {
        this.move.fill(_constants.VNULL);
        this.prob.fill(0.0);
        this.value.fill(0.0);
        this.valueWin.fill(0.0);
        this.visitCnt.fill(0);
        this.nextId.fill(-1);
        this.nextHash.fill(0);
        this.evaluated = [];
        for (let i = 0; i < _constants.BVCNT + 1; i++) {
            this.evaluated.push(false);
        }
    }

    clear() {
        this.branchCnt = 0;
        this.totalValue = 0.0;
        this.totalCnt = 0;
        this.hash = 0;
        this.moveCnt = -1;
    }

    best2() {
        const order = (0, _utils.argsort)(this.visitCnt.slice(0, this.branchCnt), true);
        return order.slice(0, 2);
    }
}
},{"./board.js":4,"./constants.js":5,"./coord_convert.js":6,"./utils.js":11}],10:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.StoneGroup = undefined;

var _constants = require('./constants.js');

class StoneGroup {
    constructor() {
        this.libCnt = _constants.VNULL;
        this.size = _constants.VNULL;
        this.vAtr = _constants.VNULL;
        this.libs = new Set();
    }

    getSize() {
        return this.size;
    }

    getLibCnt() {
        return this.libCnt;
    }

    getVAtr() {
        return this.vAtr;
    }

    clear(stone) {
        this.libCnt = stone ? 0 : _constants.VNULL;
        this.size = stone ? 1 : _constants.VNULL;
        this.vAtr = _constants.VNULL;
        this.libs.clear();
    }

    add(v) {
        if (this.libs.has(v)) {
            return;
        }
        this.libs.add(v);
        this.libCnt += 1;
        this.vAtr = v;
    }

    sub(v) {
        if (!this.libs.has(v)) {
            return;
        }
        this.libs.delete(v);
        this.libCnt -= 1;
    }

    merge(other) {
        this.libs = new Set([...this.libs, ...other.libs]);
        this.libCnt = this.libs.size;
        this.size += other.size;
        if (this.libCnt === 1) {
            self.vAtr = this.libs[0];
        }
    }

    copyTo(dest) {
        dest.libCnt = this.libCnt;
        dest.size = this.size;
        dest.vAtr = this.vAtr;
        dest.libs = new Set(this.libs);
    }
}
exports.StoneGroup = StoneGroup;
},{"./constants.js":5}],11:[function(require,module,exports){
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
},{"./constants.js":5}],12:[function(require,module,exports){
'use strict';

var _workerRmi = require('worker-rmi');

var _neural_network_client = require('./neural_network_client.js');

var _coord_convert = require('./coord_convert.js');

var _constants = require('./constants.js');

var _intersection = require('./intersection.js');

var _board = require('./board.js');

var _search = require('./search.js');

class A9Engine {
    constructor() {
        this.b = new _board.Board();
        this.nn = new _neural_network_client.NeuralNetwork(self);
        this.tree = new _search.Tree(this.nn);
    }

    async loadNN() {
        await this.nn.invokeRM('load');
    }

    clear() {
        this.b.clear();
        this.tree.clear();
    }

    timeSettings(mainTime, byoyomi) {
        this.tree.setTime(mainTime, byoyomi);
    }

    async genmove() {
        const [move, winRate] = await this.bestMove();
        if (winRate < 0.1) {
            return 'resign';
        } else if (move === _constants.PASS || this.b.state[move] === _intersection.EMPTY) {
            this.b.play(move, true);
            return (0, _coord_convert.ev2str)(move);
        } else {
            console.log('error');
            console.log('%d(%s) is not empty', move, (0, _coord_convert.ev2str)(move));
            this.b.showboard();
            console.log(this.b.candidates());
        }
    }

    play(ev) {
        this.b.play(ev, false);
    }

    async bestMove() {
        return await this.tree.search(this.b, 0.0, false, false);
    }

    finalScore() {
        return this.b.finalScore();
    }

    async ponder() {
        return await this.tree.search(this.b, Infinity, true, false);
    }

    stopPonder() {
        self.PONDER_STOP = true;
    }
}

(0, _workerRmi.resigterWorkerRMI)(self, A9Engine);
},{"./board.js":4,"./constants.js":5,"./coord_convert.js":6,"./intersection.js":7,"./neural_network_client.js":8,"./search.js":9,"worker-rmi":3}]},{},[12])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnNvbi1vYmplY3RpZC9vYmplY3RpZC5qcyIsIm5vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvd29ya2VyLXJtaS93b3JrZXItcm1pLmpzIiwic3JjL2JvYXJkLmpzIiwic3JjL2NvbnN0YW50cy5qcyIsInNyYy9jb29yZF9jb252ZXJ0LmpzIiwic3JjL2ludGVyc2VjdGlvbi5qcyIsInNyYy9uZXVyYWxfbmV0d29ya19jbGllbnQuanMiLCJzcmMvc2VhcmNoLmpzIiwic3JjL3N0b25lX2dyb3VwLmpzIiwic3JjL3V0aWxzLmpzIiwic3JjL3dvcmtlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzlOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3YkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25WQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIlxudmFyIE1BQ0hJTkVfSUQgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAweEZGRkZGRik7XG52YXIgaW5kZXggPSBPYmplY3RJRC5pbmRleCA9IHBhcnNlSW50KE1hdGgucmFuZG9tKCkgKiAweEZGRkZGRiwgMTApO1xudmFyIHBpZCA9ICh0eXBlb2YgcHJvY2VzcyA9PT0gJ3VuZGVmaW5lZCcgfHwgdHlwZW9mIHByb2Nlc3MucGlkICE9PSAnbnVtYmVyJyA/IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwMDAwMCkgOiBwcm9jZXNzLnBpZCkgJSAweEZGRkY7XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGFuIG9iamVjdCBpcyBCdWZmZXJcbiAqXG4gKiBBdXRob3I6ICAgRmVyb3NzIEFib3VraGFkaWplaCA8ZmVyb3NzQGZlcm9zcy5vcmc+IDxodHRwOi8vZmVyb3NzLm9yZz5cbiAqIExpY2Vuc2U6ICBNSVRcbiAqXG4gKi9cbnZhciBpc0J1ZmZlciA9IGZ1bmN0aW9uIChvYmopIHtcbiAgcmV0dXJuICEhKFxuICBvYmogIT0gbnVsbCAmJlxuICBvYmouY29uc3RydWN0b3IgJiZcbiAgdHlwZW9mIG9iai5jb25zdHJ1Y3Rvci5pc0J1ZmZlciA9PT0gJ2Z1bmN0aW9uJyAmJlxuICBvYmouY29uc3RydWN0b3IuaXNCdWZmZXIob2JqKVxuICApXG59O1xuXG4vKipcbiAqIENyZWF0ZSBhIG5ldyBpbW11dGFibGUgT2JqZWN0SUQgaW5zdGFuY2VcbiAqXG4gKiBAY2xhc3MgUmVwcmVzZW50cyB0aGUgQlNPTiBPYmplY3RJRCB0eXBlXG4gKiBAcGFyYW0ge1N0cmluZ3xOdW1iZXJ9IGFyZyBDYW4gYmUgYSAyNCBieXRlIGhleCBzdHJpbmcsIDEyIGJ5dGUgYmluYXJ5IHN0cmluZyBvciBhIE51bWJlci5cbiAqIEByZXR1cm4ge09iamVjdH0gaW5zdGFuY2Ugb2YgT2JqZWN0SUQuXG4gKi9cbmZ1bmN0aW9uIE9iamVjdElEKGFyZykge1xuICBpZighKHRoaXMgaW5zdGFuY2VvZiBPYmplY3RJRCkpIHJldHVybiBuZXcgT2JqZWN0SUQoYXJnKTtcbiAgaWYoYXJnICYmICgoYXJnIGluc3RhbmNlb2YgT2JqZWN0SUQpIHx8IGFyZy5fYnNvbnR5cGU9PT1cIk9iamVjdElEXCIpKVxuICAgIHJldHVybiBhcmc7XG5cbiAgdmFyIGJ1ZjtcblxuICBpZihpc0J1ZmZlcihhcmcpIHx8IChBcnJheS5pc0FycmF5KGFyZykgJiYgYXJnLmxlbmd0aD09PTEyKSkge1xuICAgIGJ1ZiA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZyk7XG4gIH1cbiAgZWxzZSBpZih0eXBlb2YgYXJnID09PSBcInN0cmluZ1wiKSB7XG4gICAgaWYoYXJnLmxlbmd0aCE9PTEyICYmICFPYmplY3RJRC5pc1ZhbGlkKGFyZykpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJBcmd1bWVudCBwYXNzZWQgaW4gbXVzdCBiZSBhIHNpbmdsZSBTdHJpbmcgb2YgMTIgYnl0ZXMgb3IgYSBzdHJpbmcgb2YgMjQgaGV4IGNoYXJhY3RlcnNcIik7XG5cbiAgICBidWYgPSBidWZmZXIoYXJnKTtcbiAgfVxuICBlbHNlIGlmKC9udW1iZXJ8dW5kZWZpbmVkLy50ZXN0KHR5cGVvZiBhcmcpKSB7XG4gICAgYnVmID0gYnVmZmVyKGdlbmVyYXRlKGFyZykpO1xuICB9XG5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIFwiaWRcIiwge1xuICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkodGhpcywgYnVmKTsgfVxuICB9KTtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIFwic3RyXCIsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gYnVmLm1hcChoZXguYmluZCh0aGlzLCAyKSkuam9pbignJyk7IH1cbiAgfSk7XG59XG5tb2R1bGUuZXhwb3J0cyA9IE9iamVjdElEO1xuT2JqZWN0SUQuZ2VuZXJhdGUgPSBnZW5lcmF0ZTtcbk9iamVjdElELmRlZmF1bHQgPSBPYmplY3RJRDtcblxuLyoqXG4gKiBDcmVhdGVzIGFuIE9iamVjdElEIGZyb20gYSBzZWNvbmQgYmFzZWQgbnVtYmVyLCB3aXRoIHRoZSByZXN0IG9mIHRoZSBPYmplY3RJRCB6ZXJvZWQgb3V0LiBVc2VkIGZvciBjb21wYXJpc29ucyBvciBzb3J0aW5nIHRoZSBPYmplY3RJRC5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gdGltZSBhbiBpbnRlZ2VyIG51bWJlciByZXByZXNlbnRpbmcgYSBudW1iZXIgb2Ygc2Vjb25kcy5cbiAqIEByZXR1cm4ge09iamVjdElEfSByZXR1cm4gdGhlIGNyZWF0ZWQgT2JqZWN0SURcbiAqIEBhcGkgcHVibGljXG4gKi9cbk9iamVjdElELmNyZWF0ZUZyb21UaW1lID0gZnVuY3Rpb24odGltZSl7XG4gIHRpbWUgPSBwYXJzZUludCh0aW1lLCAxMCkgJSAweEZGRkZGRkZGO1xuICByZXR1cm4gbmV3IE9iamVjdElEKGhleCg4LHRpbWUpK1wiMDAwMDAwMDAwMDAwMDAwMFwiKTtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBPYmplY3RJRCBmcm9tIGEgaGV4IHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiBhbiBPYmplY3RJRC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gaGV4U3RyaW5nIGNyZWF0ZSBhIE9iamVjdElEIGZyb20gYSBwYXNzZWQgaW4gMjQgYnl0ZSBoZXhzdHJpbmcuXG4gKiBAcmV0dXJuIHtPYmplY3RJRH0gcmV0dXJuIHRoZSBjcmVhdGVkIE9iamVjdElEXG4gKiBAYXBpIHB1YmxpY1xuICovXG5PYmplY3RJRC5jcmVhdGVGcm9tSGV4U3RyaW5nID0gZnVuY3Rpb24oaGV4U3RyaW5nKSB7XG4gIGlmKCFPYmplY3RJRC5pc1ZhbGlkKGhleFN0cmluZykpXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBPYmplY3RJRCBoZXggc3RyaW5nXCIpO1xuXG4gIHJldHVybiBuZXcgT2JqZWN0SUQoaGV4U3RyaW5nKTtcbn07XG5cbi8qKlxuICogQ2hlY2tzIGlmIGEgdmFsdWUgaXMgYSB2YWxpZCBic29uIE9iamVjdElkXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG9iamVjdGlkIENhbiBiZSBhIDI0IGJ5dGUgaGV4IHN0cmluZyBvciBhbiBpbnN0YW5jZSBvZiBPYmplY3RJRC5cbiAqIEByZXR1cm4ge0Jvb2xlYW59IHJldHVybiB0cnVlIGlmIHRoZSB2YWx1ZSBpcyBhIHZhbGlkIGJzb24gT2JqZWN0SUQsIHJldHVybiBmYWxzZSBvdGhlcndpc2UuXG4gKiBAYXBpIHB1YmxpY1xuICpcbiAqIFRIRSBOQVRJVkUgRE9DVU1FTlRBVElPTiBJU04nVCBDTEVBUiBPTiBUSElTIEdVWSFcbiAqIGh0dHA6Ly9tb25nb2RiLmdpdGh1Yi5pby9ub2RlLW1vbmdvZGItbmF0aXZlL2FwaS1ic29uLWdlbmVyYXRlZC9vYmplY3RpZC5odG1sI29iamVjdGlkLWlzdmFsaWRcbiAqL1xuT2JqZWN0SUQuaXNWYWxpZCA9IGZ1bmN0aW9uKG9iamVjdGlkKSB7XG4gIGlmKCFvYmplY3RpZCkgcmV0dXJuIGZhbHNlO1xuXG4gIC8vY2FsbCAudG9TdHJpbmcoKSB0byBnZXQgdGhlIGhleCBpZiB3ZSdyZVxuICAvLyB3b3JraW5nIHdpdGggYW4gaW5zdGFuY2Ugb2YgT2JqZWN0SURcbiAgcmV0dXJuIC9eWzAtOUEtRl17MjR9JC9pLnRlc3Qob2JqZWN0aWQudG9TdHJpbmcoKSk7XG59O1xuXG4vKipcbiAqIHNldCBhIGN1c3RvbSBtYWNoaW5lSURcbiAqIFxuICogQHBhcmFtIHtTdHJpbmd8TnVtYmVyfSBtYWNoaW5laWQgQ2FuIGJlIGEgc3RyaW5nLCBoZXgtc3RyaW5nIG9yIGEgbnVtYmVyXG4gKiBAcmV0dXJuIHt2b2lkfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuT2JqZWN0SUQuc2V0TWFjaGluZUlEID0gZnVuY3Rpb24oYXJnKSB7XG4gIHZhciBtYWNoaW5lSUQ7XG5cbiAgaWYodHlwZW9mIGFyZyA9PT0gXCJzdHJpbmdcIikge1xuICAgIC8vIGhleCBzdHJpbmdcbiAgICBtYWNoaW5lSUQgPSBwYXJzZUludChhcmcsIDE2KTtcbiAgIFxuICAgIC8vIGFueSBzdHJpbmdcbiAgICBpZihpc05hTihtYWNoaW5lSUQpKSB7XG4gICAgICBhcmcgPSAoJzAwMDAwMCcgKyBhcmcpLnN1YnN0cigtNyw2KTtcblxuICAgICAgbWFjaGluZUlEID0gXCJcIjtcbiAgICAgIGZvcih2YXIgaSA9IDA7aTw2OyBpKyspIHtcbiAgICAgICAgbWFjaGluZUlEICs9IChhcmcuY2hhckNvZGVBdChpKSk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGVsc2UgaWYoL251bWJlcnx1bmRlZmluZWQvLnRlc3QodHlwZW9mIGFyZykpIHtcbiAgICBtYWNoaW5lSUQgPSBhcmcgfCAwO1xuICB9XG5cbiAgTUFDSElORV9JRCA9IChtYWNoaW5lSUQgJiAweEZGRkZGRik7XG59XG5cbi8qKlxuICogZ2V0IHRoZSBtYWNoaW5lSURcbiAqIFxuICogQHJldHVybiB7bnVtYmVyfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuT2JqZWN0SUQuZ2V0TWFjaGluZUlEID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBNQUNISU5FX0lEO1xufVxuXG5PYmplY3RJRC5wcm90b3R5cGUgPSB7XG4gIF9ic29udHlwZTogJ09iamVjdElEJyxcbiAgY29uc3RydWN0b3I6IE9iamVjdElELFxuXG4gIC8qKlxuICAgKiBSZXR1cm4gdGhlIE9iamVjdElEIGlkIGFzIGEgMjQgYnl0ZSBoZXggc3RyaW5nIHJlcHJlc2VudGF0aW9uXG4gICAqXG4gICAqIEByZXR1cm4ge1N0cmluZ30gcmV0dXJuIHRoZSAyNCBieXRlIGhleCBzdHJpbmcgcmVwcmVzZW50YXRpb24uXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICB0b0hleFN0cmluZzogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuc3RyO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDb21wYXJlcyB0aGUgZXF1YWxpdHkgb2YgdGhpcyBPYmplY3RJRCB3aXRoIGBvdGhlcklEYC5cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IG90aGVyIE9iamVjdElEIGluc3RhbmNlIHRvIGNvbXBhcmUgYWdhaW5zdC5cbiAgICogQHJldHVybiB7Qm9vbGVhbn0gdGhlIHJlc3VsdCBvZiBjb21wYXJpbmcgdHdvIE9iamVjdElEJ3NcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIGVxdWFsczogZnVuY3Rpb24gKG90aGVyKXtcbiAgICByZXR1cm4gISFvdGhlciAmJiB0aGlzLnN0ciA9PT0gb3RoZXIudG9TdHJpbmcoKTtcbiAgfSxcblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgZ2VuZXJhdGlvbiBkYXRlIChhY2N1cmF0ZSB1cCB0byB0aGUgc2Vjb25kKSB0aGF0IHRoaXMgSUQgd2FzIGdlbmVyYXRlZC5cbiAgICpcbiAgICogQHJldHVybiB7RGF0ZX0gdGhlIGdlbmVyYXRpb24gZGF0ZVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgZ2V0VGltZXN0YW1wOiBmdW5jdGlvbigpe1xuICAgIHJldHVybiBuZXcgRGF0ZShwYXJzZUludCh0aGlzLnN0ci5zdWJzdHIoMCw4KSwgMTYpICogMTAwMCk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIG5leHQoKSB7XG4gIHJldHVybiBpbmRleCA9IChpbmRleCsxKSAlIDB4RkZGRkZGO1xufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZSh0aW1lKSB7XG4gIGlmICh0eXBlb2YgdGltZSAhPT0gJ251bWJlcicpXG4gICAgdGltZSA9IERhdGUubm93KCkvMTAwMDtcblxuICAvL2tlZXAgaXQgaW4gdGhlIHJpbmchXG4gIHRpbWUgPSBwYXJzZUludCh0aW1lLCAxMCkgJSAweEZGRkZGRkZGO1xuXG4gIC8vRkZGRkZGRkYgRkZGRkZGIEZGRkYgRkZGRkZGXG4gIHJldHVybiBoZXgoOCx0aW1lKSArIGhleCg2LE1BQ0hJTkVfSUQpICsgaGV4KDQscGlkKSArIGhleCg2LG5leHQoKSk7XG59XG5cbmZ1bmN0aW9uIGhleChsZW5ndGgsIG4pIHtcbiAgbiA9IG4udG9TdHJpbmcoMTYpO1xuICByZXR1cm4gKG4ubGVuZ3RoPT09bGVuZ3RoKT8gbiA6IFwiMDAwMDAwMDBcIi5zdWJzdHJpbmcobi5sZW5ndGgsIGxlbmd0aCkgKyBuO1xufVxuXG5mdW5jdGlvbiBidWZmZXIoc3RyKSB7XG4gIHZhciBpPTAsb3V0PVtdO1xuXG4gIGlmKHN0ci5sZW5ndGg9PT0yNClcbiAgICBmb3IoO2k8MjQ7IG91dC5wdXNoKHBhcnNlSW50KHN0cltpXStzdHJbaSsxXSwgMTYpKSxpKz0yKTtcblxuICBlbHNlIGlmKHN0ci5sZW5ndGg9PT0xMilcbiAgICBmb3IoO2k8MTI7IG91dC5wdXNoKHN0ci5jaGFyQ29kZUF0KGkpKSxpKyspO1xuXG4gIHJldHVybiBvdXQ7XG59XG5cbi8qKlxuICogQ29udmVydHMgdG8gYSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgdGhpcyBJZC5cbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9IHJldHVybiB0aGUgMjQgYnl0ZSBoZXggc3RyaW5nIHJlcHJlc2VudGF0aW9uLlxuICogQGFwaSBwcml2YXRlXG4gKi9cbk9iamVjdElELnByb3RvdHlwZS5pbnNwZWN0ID0gZnVuY3Rpb24oKSB7IHJldHVybiBcIk9iamVjdElEKFwiK3RoaXMrXCIpXCIgfTtcbk9iamVjdElELnByb3RvdHlwZS50b0pTT04gPSBPYmplY3RJRC5wcm90b3R5cGUudG9IZXhTdHJpbmc7XG5PYmplY3RJRC5wcm90b3R5cGUudG9TdHJpbmcgPSBPYmplY3RJRC5wcm90b3R5cGUudG9IZXhTdHJpbmc7XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxuLy8gY2FjaGVkIGZyb20gd2hhdGV2ZXIgZ2xvYmFsIGlzIHByZXNlbnQgc28gdGhhdCB0ZXN0IHJ1bm5lcnMgdGhhdCBzdHViIGl0XG4vLyBkb24ndCBicmVhayB0aGluZ3MuICBCdXQgd2UgbmVlZCB0byB3cmFwIGl0IGluIGEgdHJ5IGNhdGNoIGluIGNhc2UgaXQgaXNcbi8vIHdyYXBwZWQgaW4gc3RyaWN0IG1vZGUgY29kZSB3aGljaCBkb2Vzbid0IGRlZmluZSBhbnkgZ2xvYmFscy4gIEl0J3MgaW5zaWRlIGFcbi8vIGZ1bmN0aW9uIGJlY2F1c2UgdHJ5L2NhdGNoZXMgZGVvcHRpbWl6ZSBpbiBjZXJ0YWluIGVuZ2luZXMuXG5cbnZhciBjYWNoZWRTZXRUaW1lb3V0O1xudmFyIGNhY2hlZENsZWFyVGltZW91dDtcblxuZnVuY3Rpb24gZGVmYXVsdFNldFRpbW91dCgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3NldFRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbmZ1bmN0aW9uIGRlZmF1bHRDbGVhclRpbWVvdXQgKCkge1xuICAgIHRocm93IG5ldyBFcnJvcignY2xlYXJUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG4oZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc2V0VGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2YgY2xlYXJUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgIH1cbn0gKCkpXG5mdW5jdGlvbiBydW5UaW1lb3V0KGZ1bikge1xuICAgIGlmIChjYWNoZWRTZXRUaW1lb3V0ID09PSBzZXRUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICAvLyBpZiBzZXRUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkU2V0VGltZW91dCA9PT0gZGVmYXVsdFNldFRpbW91dCB8fCAhY2FjaGVkU2V0VGltZW91dCkgJiYgc2V0VGltZW91dCkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dChmdW4sIDApO1xuICAgIH0gY2F0Y2goZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwobnVsbCwgZnVuLCAwKTtcbiAgICAgICAgfSBjYXRjaChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKHRoaXMsIGZ1biwgMCk7XG4gICAgICAgIH1cbiAgICB9XG5cblxufVxuZnVuY3Rpb24gcnVuQ2xlYXJUaW1lb3V0KG1hcmtlcikge1xuICAgIGlmIChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGNsZWFyVGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICAvLyBpZiBjbGVhclRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGRlZmF1bHRDbGVhclRpbWVvdXQgfHwgIWNhY2hlZENsZWFyVGltZW91dCkgJiYgY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCAgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbChudWxsLCBtYXJrZXIpO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yLlxuICAgICAgICAgICAgLy8gU29tZSB2ZXJzaW9ucyBvZiBJLkUuIGhhdmUgZGlmZmVyZW50IHJ1bGVzIGZvciBjbGVhclRpbWVvdXQgdnMgc2V0VGltZW91dFxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKHRoaXMsIG1hcmtlcik7XG4gICAgICAgIH1cbiAgICB9XG5cblxuXG59XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBpZiAoIWRyYWluaW5nIHx8ICFjdXJyZW50UXVldWUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBydW5UaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBydW5DbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAxICYmICFkcmFpbmluZykge1xuICAgICAgICBydW5UaW1lb3V0KGRyYWluUXVldWUpO1xuICAgIH1cbn07XG5cbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcbmZ1bmN0aW9uIEl0ZW0oZnVuLCBhcnJheSkge1xuICAgIHRoaXMuZnVuID0gZnVuO1xuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbn1cbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcbn07XG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5wcm9jZXNzLnByZXBlbmRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnByZXBlbmRPbmNlTGlzdGVuZXIgPSBub29wO1xuXG5wcm9jZXNzLmxpc3RlbmVycyA9IGZ1bmN0aW9uIChuYW1lKSB7IHJldHVybiBbXSB9XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwiLyogZ2xvYmFsIGV4cG9ydHMgKi9cbi8qKlxuICogQGZpbGVvdmVydmlldyBhIHRpbnkgbGlicmFyeSBmb3IgV2ViIFdvcmtlciBSZW1vdGUgTWV0aG9kIEludm9jYXRpb25cbiAqXG4gKi9cbmNvbnN0IE9iamVjdElEID0gcmVxdWlyZSgnYnNvbi1vYmplY3RpZCcpO1xuXG4vKipcbiAqIEBwcml2YXRlIHJldHVybnMgYSBsaXN0IG9mIFRyYW5zZmVyYWJsZSBvYmplY3RzIHdoaWNoIHtAY29kZSBvYmp9IGluY2x1ZGVzXG4gKiBAcGFyYW0ge29iamVjdH0gb2JqIGFueSBvYmplY3RcbiAqIEBwYXJhbSB7QXJyYXl9IGxpc3QgZm9yIGludGVybmFsIHJlY3Vyc2lvbiBvbmx5XG4gKiBAcmV0dXJuIHtMaXN0fSBhIGxpc3Qgb2YgVHJhbnNmZXJhYmxlIG9iamVjdHNcbiAqL1xuZnVuY3Rpb24gZ2V0VHJhbnNmZXJMaXN0KG9iaiwgbGlzdCA9IFtdKSB7XG4gICAgaWYgKEFycmF5QnVmZmVyLmlzVmlldyhvYmopKSB7XG4gICAgICAgIGxpc3QucHVzaChvYmouYnVmZmVyKTtcbiAgICAgICAgcmV0dXJuIGxpc3Q7XG4gICAgfVxuICAgIGlmIChpc1RyYW5zZmVyYWJsZShvYmopKSB7XG4gICAgICAgIGxpc3QucHVzaChvYmopO1xuICAgICAgICByZXR1cm4gbGlzdDtcbiAgICB9XG4gICAgaWYgKCEodHlwZW9mIG9iaiA9PT0gJ29iamVjdCcpKSB7XG4gICAgICAgIHJldHVybiBsaXN0O1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHByb3AgaW4gb2JqKSB7XG4gICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkocHJvcCkpIHtcbiAgICAgICAgICAgIGdldFRyYW5zZmVyTGlzdChvYmpbcHJvcF0sIGxpc3QpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBsaXN0O1xufVxuXG4vKipcbiAqIEBwcml2YXRlIGNoZWNrcyBpZiB7QGNvZGUgb2JqfSBpcyBUcmFuc2ZlcmFibGUgb3Igbm90LlxuICogQHBhcmFtIHtvYmplY3R9IG9iaiBhbnkgb2JqZWN0XG4gKiBAcmV0dXJuIHtib29sZWFufVxuICovXG5mdW5jdGlvbiBpc1RyYW5zZmVyYWJsZShvYmopIHtcbiAgICBjb25zdCB0cmFuc2ZlcmFibGUgPSBbQXJyYXlCdWZmZXJdO1xuICAgIGlmICh0eXBlb2YgTWVzc2FnZVBvcnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHRyYW5zZmVyYWJsZS5wdXNoKE1lc3NhZ2VQb3J0KTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBJbWFnZUJpdG1hcCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgdHJhbnNmZXJhYmxlLnB1c2goSW1hZ2VCaXRtYXApO1xuICAgIH1cbiAgICByZXR1cm4gdHJhbnNmZXJhYmxlLnNvbWUoZSA9PiBvYmogaW5zdGFuY2VvZiBlKTtcbn1cblxuLyoqXG4gKiBAY2xhc3MgYmFzZSBjbGFzcyB3aG9zZSBjaGlsZCBjbGFzc2VzIHVzZSBSTUlcbiAqL1xuY2xhc3MgV29ya2VyUk1JIHtcbiAgICAvKipcbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVtb3RlIGFuIGluc3RhbmNlIHRvIGNhbGwgcG9zdE1lc3NhZ2UgbWV0aG9kXG4gICAgICogQHBhcmFtIHtBcnJheX0gYXJncyBhcmd1bWVudHMgdG8gYmUgcGFzc2VkIHRvIHNlcnZlci1zaWRlIGluc3RhbmNlXG4gICAgICovXG4gICAgY29uc3RydWN0b3IocmVtb3RlLCAuLi5hcmdzKSB7XG4gICAgICAgIHRoaXMucmVtb3RlID0gcmVtb3RlO1xuICAgICAgICB0aGlzLmlkID0gT2JqZWN0SUQoKS50b1N0cmluZygpO1xuICAgICAgICB0aGlzLm1ldGhvZFN0YXRlcyA9IHt9O1xuICAgICAgICB0aGlzLnJlbW90ZS5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZXZlbnQgPT4ge1xuICAgICAgICAgICAgY29uc3QgZGF0YSA9IGV2ZW50LmRhdGE7XG4gICAgICAgICAgICBpZiAoZGF0YS5pZCA9PT0gdGhpcy5pZCkge1xuICAgICAgICAgICAgICAgIHRoaXMucmV0dXJuSGFuZGxlcihkYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgZmFsc2UpO1xuICAgICAgICB0aGlzLmNvbnN0cnVjdG9yUHJvbWlzZSA9IHRoaXMuaW52b2tlUk0odGhpcy5jb25zdHJ1Y3Rvci5uYW1lLCBhcmdzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBpbnZva2VzIHJlbW90ZSBtZXRob2RcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbWV0aG9kTmFtZSBNZXRob2QgbmFtZVxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGFyZ3MgYXJndW1lbnRzIHRvIGJlIHBhc3NlZCB0byBzZXJ2ZXItc2lkZSBpbnN0YW5jZVxuICAgICAqIEByZXR1cm4ge1Byb21pc2V9XG4gICAgICovXG4gICAgaW52b2tlUk0obWV0aG9kTmFtZSwgYXJncyA9IFtdKSB7XG4gICAgICAgIGlmICghdGhpcy5tZXRob2RTdGF0ZXNbbWV0aG9kTmFtZV0pIHtcbiAgICAgICAgICAgIHRoaXMubWV0aG9kU3RhdGVzW21ldGhvZE5hbWVdID0ge1xuICAgICAgICAgICAgICAgIG51bTogMCxcbiAgICAgICAgICAgICAgICByZXNvbHZlUmVqZWN0czoge31cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG1ldGhvZFN0YXRlID0gdGhpcy5tZXRob2RTdGF0ZXNbbWV0aG9kTmFtZV07XG4gICAgICAgICAgICBtZXRob2RTdGF0ZS5udW0gKz0gMTtcbiAgICAgICAgICAgIG1ldGhvZFN0YXRlLnJlc29sdmVSZWplY3RzW21ldGhvZFN0YXRlLm51bV0gPSB7IHJlc29sdmUsIHJlamVjdCB9O1xuICAgICAgICAgICAgdGhpcy5yZW1vdGUucG9zdE1lc3NhZ2Uoe1xuICAgICAgICAgICAgICAgIGlkOiB0aGlzLmlkLFxuICAgICAgICAgICAgICAgIG1ldGhvZE5hbWUsXG4gICAgICAgICAgICAgICAgbnVtOiBtZXRob2RTdGF0ZS5udW0sXG4gICAgICAgICAgICAgICAgYXJnc1xuICAgICAgICAgICAgfSwgZ2V0VHJhbnNmZXJMaXN0KGFyZ3MpKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHByaXZhdGUgaGFuZGxlcyBjb3JyZXNwb25kZW50ICdtZXNzYWdlJyBldmVudFxuICAgICAqIEBwYXJhbSB7b2JqfSBkYXRhIGRhdGEgcHJvcGVydHkgb2YgJ21lc3NhZ2UnIGV2ZW50XG4gICAgICovXG4gICAgcmV0dXJuSGFuZGxlcihkYXRhKSB7XG4gICAgICAgIGNvbnN0IHJlc29sdmVSZWplY3RzID0gdGhpcy5tZXRob2RTdGF0ZXNbZGF0YS5tZXRob2ROYW1lXS5yZXNvbHZlUmVqZWN0cztcbiAgICAgICAgaWYgKGRhdGEuZXJyb3IpIHtcbiAgICAgICAgICAgIHJlc29sdmVSZWplY3RzW2RhdGEubnVtXS5yZWplY3QoZGF0YS5lcnJvcik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXNvbHZlUmVqZWN0c1tkYXRhLm51bV0ucmVzb2x2ZShkYXRhLnJlc3VsdCk7XG4gICAgICAgIH1cbiAgICAgICAgZGVsZXRlIHJlc29sdmVSZWplY3RzW2RhdGEubnVtXTtcbiAgICB9XG59XG5cblxuLyoqXG4gKiBAcHJpdmF0ZSBleGVjdXRlcyBhIG1ldGhvZCBvbiBzZXJ2ZXIgYW5kIHBvc3QgYSByZXN1bHQgYXMgbWVzc2FnZS5cbiAqIEBwYXJhbSB7b2JqfSBldmVudCAnbWVzc2FnZScgZXZlbnRcbiAqL1xuYXN5bmMgZnVuY3Rpb24gaGFuZGxlV29ya2VyUk1JKGV2ZW50KSB7XG4gICAgY29uc3QgZGF0YSA9IGV2ZW50LmRhdGE7XG4gICAgY29uc3QgbWVzc2FnZSA9IHtcbiAgICAgICAgaWQ6IGRhdGEuaWQsXG4gICAgICAgIG1ldGhvZE5hbWU6IGRhdGEubWV0aG9kTmFtZSxcbiAgICAgICAgbnVtOiBkYXRhLm51bSxcbiAgICB9O1xuICAgIGxldCByZXN1bHQ7XG4gICAgaWYgKGRhdGEubWV0aG9kTmFtZSA9PT0gdGhpcy5uYW1lKSB7XG4gICAgICAgIHRoaXMud29ya2VyUk1JLmluc3RhbmNlc1tkYXRhLmlkXSA9IG5ldyB0aGlzKC4uLmRhdGEuYXJncyk7XG4gICAgICAgIG1lc3NhZ2UucmVzdWx0ID0gbnVsbDtcbiAgICAgICAgdGhpcy53b3JrZXJSTUkudGFyZ2V0LnBvc3RNZXNzYWdlKG1lc3NhZ2UsIGdldFRyYW5zZmVyTGlzdChyZXN1bHQpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHRoaXMud29ya2VyUk1JLmluc3RhbmNlc1tkYXRhLmlkXTtcbiAgICAgICAgaWYgKGluc3RhbmNlKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGF3YWl0IGluc3RhbmNlW2RhdGEubWV0aG9kTmFtZV0uYXBwbHkoaW5zdGFuY2UsIGRhdGEuYXJncylcbiAgICAgICAgICAgICAgICBtZXNzYWdlLnJlc3VsdCA9IHJlc3VsdDtcbiAgICAgICAgICAgICAgICB0aGlzLndvcmtlclJNSS50YXJnZXQucG9zdE1lc3NhZ2UobWVzc2FnZSwgZ2V0VHJhbnNmZXJMaXN0KHJlc3VsdCkpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UuZXJyb3IgPSBlLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgdGhpcy53b3JrZXJSTUkudGFyZ2V0LnBvc3RNZXNzYWdlKG1lc3NhZ2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG4vKipcbiAqIHJlZ2lzdGVycyBhIGNsYXNzIGFzIGFuIGV4ZWN1dGVyIG9mIFJNSSBvbiBzZXJ2ZXJcbiAqIEBwYXJhbSB7b2JqfSB0YXJnZXQgYW4gaW5zdGFuY2UgdGhhdCByZWNlaXZlcyAnbWVzc2FnZScgZXZlbnRzIG9mIFJNSVxuICogQHBhcmFtIHtDbGFzc30ga2xhc3MgYSBjbGFzcyB0byBiZSByZWdpc3RlcmVkXG4gKi9cbmZ1bmN0aW9uIHJlc2lndGVyV29ya2VyUk1JKHRhcmdldCwga2xhc3MpIHtcbiAgICBrbGFzcy53b3JrZXJSTUkgPSB7XG4gICAgICAgIHRhcmdldCxcbiAgICAgICAgaW5zdGFuY2VzOiB7fSxcbiAgICAgICAgaGFuZGxlcjogaGFuZGxlV29ya2VyUk1JLmJpbmQoa2xhc3MpXG4gICAgfVxuICAgIHRhcmdldC5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywga2xhc3Mud29ya2VyUk1JLmhhbmRsZXIpO1xufVxuXG4vKipcbiAqIHVucmVzaWd0ZXJzIGEgY2xhc3MgcmVnaXN0ZXJlZCBieSByZWdpc3RlcldvcmtlclJNSVxuICogQHBhcmFtIHtvYmp9IHRhcmdldCBhbiBpbnN0YW5jZSB0aGF0IHJlY2VpdmVzICdtZXNzYWdlJyBldmVudHMgb2YgUk1JXG4gKiBAcGFyYW0ge0NsYXNzfSBrbGFzcyBhIGNsYXNzIHRvIGJlIHVucmVnaXN0ZXJlZFxuICovXG5mdW5jdGlvbiB1bnJlc2lndGVyV29ya2VyUk1JKHRhcmdldCwga2xhc3MpIHtcbiAgICB0YXJnZXQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGtsYXNzLndvcmtlclJNSS5oYW5kbGVyKVxuICAgIGRlbGV0ZSBrbGFzcy53b3JrZXJSTUk7XG59XG5cbmV4cG9ydHMuV29ya2VyUk1JID0gV29ya2VyUk1JO1xuZXhwb3J0cy5yZXNpZ3RlcldvcmtlclJNSSA9IHJlc2lndGVyV29ya2VyUk1JO1xuZXhwb3J0cy51bnJlc2lndGVyV29ya2VyUk1JID0gdW5yZXNpZ3RlcldvcmtlclJNSTtcbiIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5Cb2FyZCA9IGV4cG9ydHMuQ2FuZGlkYXRlcyA9IHVuZGVmaW5lZDtcbmV4cG9ydHMubmVpZ2hib3JzID0gbmVpZ2hib3JzO1xuZXhwb3J0cy5kaWFnb25hbHMgPSBkaWFnb25hbHM7XG5cbnZhciBfdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG5cbnZhciBfY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMuanMnKTtcblxudmFyIF9pbnRlcnNlY3Rpb24gPSByZXF1aXJlKCcuL2ludGVyc2VjdGlvbi5qcycpO1xuXG52YXIgX3N0b25lX2dyb3VwID0gcmVxdWlyZSgnLi9zdG9uZV9ncm91cC5qcycpO1xuXG52YXIgX2Nvb3JkX2NvbnZlcnQgPSByZXF1aXJlKCcuL2Nvb3JkX2NvbnZlcnQuanMnKTtcblxuZnVuY3Rpb24gbmVpZ2hib3JzKHYpIHtcbiAgICByZXR1cm4gW3YgKyAxLCB2ICsgX2NvbnN0YW50cy5FQlNJWkUsIHYgLSAxLCB2IC0gX2NvbnN0YW50cy5FQlNJWkVdO1xufVxuXG5mdW5jdGlvbiBkaWFnb25hbHModikge1xuICAgIHJldHVybiBbdiArIF9jb25zdGFudHMuRUJTSVpFICsgMSwgdiArIF9jb25zdGFudHMuRUJTSVpFIC0gMSwgdiAtIF9jb25zdGFudHMuRUJTSVpFIC0gMSwgdiAtIF9jb25zdGFudHMuRUJTSVpFICsgMV07XG59XG5cbmNsYXNzIENhbmRpZGF0ZXMge1xuICAgIGNvbnN0cnVjdG9yKGhhc2gsIG1vdmVDbnQsIGxpc3QpIHtcbiAgICAgICAgdGhpcy5oYXNoID0gaGFzaDtcbiAgICAgICAgdGhpcy5tb3ZlQ250ID0gbW92ZUNudDtcbiAgICAgICAgdGhpcy5saXN0ID0gbGlzdDtcbiAgICB9XG59XG5cbmV4cG9ydHMuQ2FuZGlkYXRlcyA9IENhbmRpZGF0ZXM7XG5jbGFzcyBCb2FyZCB7XG4gICAgY29uc3RydWN0b3Ioa29taSA9IDcpIHtcbiAgICAgICAgdGhpcy5rb21pID0ga29taTtcbiAgICAgICAgdGhpcy5zdGF0ZSA9IG5ldyBVaW50OEFycmF5KF9jb25zdGFudHMuRUJWQ05UKTtcbiAgICAgICAgdGhpcy5zdGF0ZS5maWxsKF9pbnRlcnNlY3Rpb24uRVhURVJJT1IpO1xuICAgICAgICB0aGlzLmlkID0gbmV3IFVpbnQ4QXJyYXkoX2NvbnN0YW50cy5FQlZDTlQpO1xuICAgICAgICB0aGlzLm5leHQgPSBuZXcgVWludDhBcnJheShfY29uc3RhbnRzLkVCVkNOVCk7XG4gICAgICAgIHRoaXMuc2cgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBfY29uc3RhbnRzLkVCVkNOVDsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLnNnLnB1c2gobmV3IF9zdG9uZV9ncm91cC5TdG9uZUdyb3VwKCkpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucHJldlN0YXRlID0gW107XG4gICAgICAgIHRoaXMua28gPSBfY29uc3RhbnRzLlZOVUxMO1xuICAgICAgICB0aGlzLnR1cm4gPSBfaW50ZXJzZWN0aW9uLkJMQUNLO1xuICAgICAgICB0aGlzLm1vdmVDbnQgPSAwO1xuICAgICAgICB0aGlzLnByZXZNb3ZlID0gX2NvbnN0YW50cy5WTlVMTDtcbiAgICAgICAgdGhpcy5yZW1vdmVDbnQgPSAwO1xuICAgICAgICB0aGlzLmhpc3RvcnkgPSBbXTtcbiAgICAgICAgdGhpcy5jbGVhcigpO1xuICAgIH1cblxuICAgIGdldE1vdmVDbnQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm1vdmVDbnQ7XG4gICAgfVxuXG4gICAgZ2V0UHJldk1vdmUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnByZXZNb3ZlO1xuICAgIH1cblxuICAgIGdldEhpc3RvcnkoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmhpc3Rvcnk7XG4gICAgfVxuXG4gICAgY2xlYXIoKSB7XG4gICAgICAgIGZvciAobGV0IHggPSAxOyB4IDw9IF9jb25zdGFudHMuQlNJWkU7IHgrKykge1xuICAgICAgICAgICAgZm9yIChsZXQgeSA9IDE7IHkgPD0gX2NvbnN0YW50cy5CU0laRTsgeSsrKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZVsoMCwgX2Nvb3JkX2NvbnZlcnQueHkyZXYpKHgsIHkpXSA9IF9pbnRlcnNlY3Rpb24uRU1QVFk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmlkLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLmlkW2ldID0gaTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubmV4dC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdGhpcy5uZXh0W2ldID0gaTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnNnLmZvckVhY2goZSA9PiB7XG4gICAgICAgICAgICBlLmNsZWFyKGZhbHNlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMucHJldlN0YXRlID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgX2NvbnN0YW50cy5LRUVQX1BSRVZfQ05UOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMucHJldlN0YXRlLnB1c2gobmV3IFVpbnQ4QXJyYXkodGhpcy5zdGF0ZSkpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMua28gPSBfY29uc3RhbnRzLlZOVUxMO1xuICAgICAgICB0aGlzLnR1cm4gPSBfaW50ZXJzZWN0aW9uLkJMQUNLO1xuICAgICAgICB0aGlzLm1vdmVDbnQgPSAwO1xuICAgICAgICB0aGlzLnByZXZNb3ZlID0gX2NvbnN0YW50cy5WTlVMTDtcbiAgICAgICAgdGhpcy5yZW1vdmVDbnQgPSAwO1xuICAgICAgICB0aGlzLmhpc3RvcnkgPSBbXTtcbiAgICB9XG5cbiAgICBjb3B5VG8oZGVzdCkge1xuICAgICAgICBkZXN0LnN0YXRlID0gbmV3IFVpbnQ4QXJyYXkodGhpcy5zdGF0ZSk7XG4gICAgICAgIGRlc3QuaWQgPSBuZXcgVWludDhBcnJheSh0aGlzLmlkKTtcbiAgICAgICAgZGVzdC5uZXh0ID0gbmV3IFVpbnQ4QXJyYXkodGhpcy5uZXh0KTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkZXN0LnNnLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLnNnW2ldLmNvcHlUbyhkZXN0LnNnW2ldKTtcbiAgICAgICAgfVxuICAgICAgICBkZXN0LnByZXZTdGF0ZSA9IFtdO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IF9jb25zdGFudHMuS0VFUF9QUkVWX0NOVDsgaSsrKSB7XG4gICAgICAgICAgICBkZXN0LnByZXZTdGF0ZS5wdXNoKG5ldyBVaW50OEFycmF5KHRoaXMucHJldlN0YXRlW2ldKSk7XG4gICAgICAgIH1cbiAgICAgICAgZGVzdC5rbyA9IHRoaXMua287XG4gICAgICAgIGRlc3QudHVybiA9IHRoaXMudHVybjtcbiAgICAgICAgZGVzdC5tb3ZlQ250ID0gdGhpcy5tb3ZlQ250O1xuICAgICAgICBkZXN0LnJlbW92ZUNudCA9IHRoaXMucmVtb3ZlQ250O1xuICAgICAgICBkZXN0Lmhpc3RvcnkgPSBBcnJheS5mcm9tKHRoaXMuaGlzdG9yeSk7XG4gICAgfVxuXG4gICAgcGxheVNlcXVlbmNlKHNlcXVlbmNlKSB7XG4gICAgICAgIGZvciAoY29uc3QgdiBvZiBzZXF1ZW5jZSkge1xuICAgICAgICAgICAgdGhpcy5wbGF5KHYsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJlbW92ZSh2KSB7XG4gICAgICAgIGxldCB2VG1wID0gdjtcbiAgICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlQ250ICs9IDE7XG4gICAgICAgICAgICB0aGlzLnN0YXRlW3ZUbXBdID0gX2ludGVyc2VjdGlvbi5FTVBUWTtcbiAgICAgICAgICAgIHRoaXMuaWRbdlRtcF0gPSB2VG1wO1xuICAgICAgICAgICAgZm9yIChjb25zdCBudiBvZiBuZWlnaGJvcnModlRtcCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNnW3RoaXMuaWRbbnZdXS5hZGQodlRtcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCB2TmV4dCA9IHRoaXMubmV4dFt2VG1wXTtcbiAgICAgICAgICAgIHRoaXMubmV4dFt2VG1wXSA9IHZUbXA7XG4gICAgICAgICAgICB2VG1wID0gdk5leHQ7XG4gICAgICAgICAgICBpZiAodlRtcCA9PT0gdikge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgbWVyZ2UodjEsIHYyKSB7XG4gICAgICAgIGxldCBpZEJhc2UgPSB0aGlzLmlkW3YxXTtcbiAgICAgICAgbGV0IGlkQWRkID0gdGhpcy5pZFt2Ml07XG4gICAgICAgIGlmICh0aGlzLnNnW2lkQmFzZV0uZ2V0U2l6ZSgpIDwgdGhpcy5zZ1tpZEFkZF0uZ2V0U2l6ZSgpKSB7XG4gICAgICAgICAgICBsZXQgdG1wID0gaWRCYXNlO1xuICAgICAgICAgICAgaWRCYXNlID0gaWRBZGQ7XG4gICAgICAgICAgICBpZEFkZCA9IHRtcDtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuc2dbaWRCYXNlXS5tZXJnZSh0aGlzLnNnW2lkQWRkXSk7XG5cbiAgICAgICAgbGV0IHZUbXAgPSBpZEFkZDtcbiAgICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgICAgIHRoaXMuaWRbdlRtcF0gPSBpZEJhc2U7XG4gICAgICAgICAgICB2VG1wID0gdGhpcy5uZXh0W3ZUbXBdO1xuICAgICAgICAgICAgaWYgKHZUbXAgPT09IGlkQWRkKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgdG1wID0gdGhpcy5uZXh0W3YxXTtcbiAgICAgICAgdGhpcy5uZXh0W3YxXSA9IHRoaXMubmV4dFt2Ml07XG4gICAgICAgIHRoaXMubmV4dFt2Ml0gPSB0bXA7XG4gICAgfVxuXG4gICAgcGxhY2VTdG9uZSh2KSB7XG4gICAgICAgIGNvbnN0IHN0b25lQ29sb3IgPSB0aGlzLnR1cm47XG4gICAgICAgIHRoaXMuc3RhdGVbdl0gPSBzdG9uZUNvbG9yO1xuICAgICAgICB0aGlzLmlkW3ZdID0gdjtcbiAgICAgICAgdGhpcy5zZ1t0aGlzLmlkW3ZdXS5jbGVhcih0cnVlKTtcbiAgICAgICAgZm9yIChjb25zdCBudiBvZiBuZWlnaGJvcnModikpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnN0YXRlW252XSA9PT0gX2ludGVyc2VjdGlvbi5FTVBUWSkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2dbdGhpcy5pZFt2XV0uYWRkKG52KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZ1t0aGlzLmlkW252XV0uc3ViKHYpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgbnYgb2YgbmVpZ2hib3JzKHYpKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5zdGF0ZVtudl0gPT09IHN0b25lQ29sb3IgJiYgdGhpcy5pZFtudl0gIT09IHRoaXMuaWRbdl0pIHtcbiAgICAgICAgICAgICAgICB0aGlzLm1lcmdlKHYsIG52KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJlbW92ZUNudCA9IDA7XG4gICAgICAgIGNvbnN0IG9wcG9uZW50U3RvbmUgPSAoMCwgX2ludGVyc2VjdGlvbi5vcHBvbmVudE9mKSh0aGlzLnR1cm4pO1xuICAgICAgICBmb3IgKGNvbnN0IG52IG9mIG5laWdoYm9ycyh2KSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuc3RhdGVbbnZdID09PSBvcHBvbmVudFN0b25lICYmIHRoaXMuc2dbdGhpcy5pZFtudl1dLmdldExpYkNudCgpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZW1vdmUobnYpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgbGVnYWwodikge1xuICAgICAgICBpZiAodiA9PT0gX2NvbnN0YW50cy5QQVNTKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmICh2ID09PSB0aGlzLmtvIHx8IHRoaXMuc3RhdGVbdl0gIT09IF9pbnRlcnNlY3Rpb24uRU1QVFkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHN0b25lQ250ID0gWzAsIDBdO1xuICAgICAgICBjb25zdCBhdHJDbnQgPSBbMCwgMF07XG4gICAgICAgIGZvciAoY29uc3QgbnYgb2YgbmVpZ2hib3JzKHYpKSB7XG4gICAgICAgICAgICBjb25zdCBjID0gdGhpcy5zdGF0ZVtudl07XG4gICAgICAgICAgICBzd2l0Y2ggKGMpIHtcbiAgICAgICAgICAgICAgICBjYXNlIF9pbnRlcnNlY3Rpb24uRU1QVFk6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIGNhc2UgX2ludGVyc2VjdGlvbi5CTEFDSzpcbiAgICAgICAgICAgICAgICBjYXNlIF9pbnRlcnNlY3Rpb24uV0hJVEU6XG4gICAgICAgICAgICAgICAgICAgIHN0b25lQ250W2NdICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnNnW3RoaXMuaWRbbnZdXS5nZXRMaWJDbnQoKSA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXRyQ250W2NdICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYXRyQ250WygwLCBfaW50ZXJzZWN0aW9uLm9wcG9uZW50T2YpKHRoaXMudHVybildICE9PSAwIHx8IGF0ckNudFt0aGlzLnR1cm5dIDwgc3RvbmVDbnRbdGhpcy50dXJuXTtcbiAgICB9XG5cbiAgICBleWVzaGFwZSh2LCBwbCkge1xuICAgICAgICBpZiAodiA9PT0gX2NvbnN0YW50cy5QQVNTKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBudiBvZiBuZWlnaGJvcnModikpIHtcbiAgICAgICAgICAgIGNvbnN0IGMgPSB0aGlzLnN0YXRlW252XTtcbiAgICAgICAgICAgIGlmIChjID09PSBfaW50ZXJzZWN0aW9uLkVNUFRZIHx8IGMgPT09ICgwLCBfaW50ZXJzZWN0aW9uLm9wcG9uZW50T2YpKHBsKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjb25zdCBkaWFnQ250ID0gWzAsIDAsIDAsIDBdO1xuICAgICAgICBmb3IgKGNvbnN0IG52IG9mIGRpYWdvbmFscyh2KSkge1xuICAgICAgICAgICAgZGlhZ0NudFt0aGlzLnN0YXRlW252XV0gKz0gMTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB3ZWRnZUNudCA9IGRpYWdDbnRbKDAsIF9pbnRlcnNlY3Rpb24ub3Bwb25lbnRPZikocGwpXSArIChkaWFnQ250WzNdID4gMCA/IDEgOiAwKTtcbiAgICAgICAgaWYgKHdlZGdlQ250ID09PSAyKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IG52IG9mIGRpYWdvbmFscyh2KSkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnN0YXRlW252XSA9PT0gKDAsIF9pbnRlcnNlY3Rpb24ub3Bwb25lbnRPZikocGwpICYmIHRoaXMuc2dbdGhpcy5pZFtudl1dLmdldExpYkNudCgpID09PSAxICYmIHRoaXMuc2dbdGhpcy5pZFtudl1dLmdldFZBdHIoKSAhPT0gdGhpcy5rbykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHdlZGdlQ250IDwgMjtcbiAgICB9XG5cbiAgICBwbGF5KHYsIG5vdEZpbGxFeWUpIHtcbiAgICAgICAgaWYgKCF0aGlzLmxlZ2FsKHYpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5vdEZpbGxFeWUgJiYgdGhpcy5leWVzaGFwZSh2LCB0aGlzLnR1cm4pKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChsZXQgaSA9IF9jb25zdGFudHMuS0VFUF9QUkVWX0NOVCAtIDI7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgICAgICB0aGlzLnByZXZTdGF0ZVtpICsgMV0gPSB0aGlzLnByZXZTdGF0ZVtpXTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnByZXZTdGF0ZVswXSA9IG5ldyBVaW50OEFycmF5KHRoaXMuc3RhdGUpO1xuICAgICAgICBpZiAodiA9PT0gX2NvbnN0YW50cy5QQVNTKSB7XG4gICAgICAgICAgICB0aGlzLmtvID0gX2NvbnN0YW50cy5WTlVMTDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMucGxhY2VTdG9uZSh2KTtcbiAgICAgICAgICAgIGNvbnN0IGlkID0gdGhpcy5pZFt2XTtcbiAgICAgICAgICAgIHRoaXMua28gPSBfY29uc3RhbnRzLlZOVUxMO1xuICAgICAgICAgICAgaWYgKHRoaXMucmVtb3ZlQ250ID09PSAxICYmIHRoaXMuc2dbaWRdLmdldExpYkNudCgpID09PSAxICYmIHRoaXMuc2dbaWRdLmdldFNpemUoKSA9PT0gMSkge1xuICAgICAgICAgICAgICAgIHRoaXMua28gPSB0aGlzLnNnW2lkXS5nZXRWQXRyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5wcmV2TW92ZSA9IHY7XG4gICAgICAgIHRoaXMuaGlzdG9yeS5wdXNoKHYpO1xuICAgICAgICB0aGlzLnR1cm4gPSAoMCwgX2ludGVyc2VjdGlvbi5vcHBvbmVudE9mKSh0aGlzLnR1cm4pO1xuICAgICAgICB0aGlzLm1vdmVDbnQgKz0gMTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcmFuZG9tUGxheSgpIHtcbiAgICAgICAgY29uc3QgZW1wdHlMaXN0ID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5zdGF0ZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuc3RhdGVbaV0gPT09IF9pbnRlcnNlY3Rpb24uRU1QVFkpIHtcbiAgICAgICAgICAgICAgICBlbXB0eUxpc3QucHVzaChpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAoMCwgX3V0aWxzLnNodWZmbGUpKGVtcHR5TGlzdCk7XG4gICAgICAgIGZvciAoY29uc3QgdiBvZiBlbXB0eUxpc3QpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnBsYXkodiwgdHJ1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLnBsYXkoX2NvbnN0YW50cy5QQVNTLCB0cnVlKTtcbiAgICAgICAgcmV0dXJuIF9jb25zdGFudHMuUEFTUztcbiAgICB9XG5cbiAgICBzY29yZSgpIHtcbiAgICAgICAgY29uc3Qgc3RvbmVDbnQgPSBbMCwgMF07XG4gICAgICAgIGZvciAobGV0IF92ID0gMDsgX3YgPCBfY29uc3RhbnRzLkJWQ05UOyBfdisrKSB7XG4gICAgICAgICAgICBjb25zdCB2ID0gKDAsIF9jb29yZF9jb252ZXJ0LnJ2MmV2KShfdik7XG4gICAgICAgICAgICBjb25zdCBzID0gdGhpcy5zdGF0ZVt2XTtcbiAgICAgICAgICAgIGlmIChzID09PSBfaW50ZXJzZWN0aW9uLkJMQUNLIHx8IHMgPT09IF9pbnRlcnNlY3Rpb24uV0hJVEUpIHtcbiAgICAgICAgICAgICAgICBzdG9uZUNudFtzXSArPSAxO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCBuYnJDbnQgPSBbMCwgMCwgMCwgMF07XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBudiBvZiBuZWlnaGJvcnModikpIHtcbiAgICAgICAgICAgICAgICAgICAgbmJyQ250W3RoaXMuc3RhdGVbbnZdXSArPSAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobmJyQ250W19pbnRlcnNlY3Rpb24uV0hJVEVdID4gMCAmJiBuYnJDbnRbX2ludGVyc2VjdGlvbi5CTEFDS10gPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgc3RvbmVDbnRbX2ludGVyc2VjdGlvbi5XSElURV0gKz0gMTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG5ickNudFtfaW50ZXJzZWN0aW9uLkJMQUNLXSA+IDAgJiYgbmJyQ250W19pbnRlcnNlY3Rpb24uV0hJVEVdID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0b25lQ250W19pbnRlcnNlY3Rpb24uQkxBQ0tdICs9IDE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdG9uZUNudFsxXSAtIHN0b25lQ250WzBdIC0gdGhpcy5rb21pO1xuICAgIH1cblxuICAgIHJvbGxvdXQoc2hvd0JvYXJkKSB7XG4gICAgICAgIHdoaWxlICh0aGlzLm1vdmVDbnQgPCBfY29uc3RhbnRzLkVCVkNOVCAqIDIpIHtcbiAgICAgICAgICAgIGNvbnN0IHByZXZNb3ZlID0gdGhpcy5wcmV2TW92ZTtcbiAgICAgICAgICAgIGNvbnN0IG1vdmUgPSB0aGlzLnJhbmRvbVBsYXkoKTtcbiAgICAgICAgICAgIGlmIChzaG93Qm9hcmQgJiYgbW92ZSAhPT0gX2NvbnN0YW50cy5QQVNTKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1xcbm1vdmUgY291bnQ9JWQnLCB0aGlzLm1vdmVDbnQpO1xuICAgICAgICAgICAgICAgIHRoaXMuc2hvd2JvYXJkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocHJldk1vdmUgPT09IF9jb25zdGFudHMuUEFTUyAmJiBtb3ZlID09PSBfY29uc3RhbnRzLlBBU1MpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHNob3dib2FyZCgpIHtcbiAgICAgICAgZnVuY3Rpb24gcHJpbnRYbGFiZWwoKSB7XG4gICAgICAgICAgICBsZXQgbGluZVN0ciA9ICcgICc7XG4gICAgICAgICAgICBmb3IgKGxldCB4ID0gMTsgeCA8PSBfY29uc3RhbnRzLkJTSVpFOyB4KyspIHtcbiAgICAgICAgICAgICAgICBsaW5lU3RyICs9IGAgJHtfY29vcmRfY29udmVydC5YX0xBQkVMU1t4XX0gYDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGxpbmVTdHIpO1xuICAgICAgICB9XG4gICAgICAgIHByaW50WGxhYmVsKCk7XG4gICAgICAgIGZvciAobGV0IHkgPSBfY29uc3RhbnRzLkJTSVpFOyB5ID4gMDsgeS0tKSB7XG4gICAgICAgICAgICBsZXQgbGluZVN0ciA9ICgnICcgKyB5LnRvU3RyaW5nKCkpLnNsaWNlKC0yKTtcbiAgICAgICAgICAgIGZvciAobGV0IHggPSAxOyB4IDw9IF9jb25zdGFudHMuQlNJWkU7IHgrKykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHYgPSAoMCwgX2Nvb3JkX2NvbnZlcnQueHkyZXYpKHgsIHkpO1xuICAgICAgICAgICAgICAgIGxldCB4U3RyO1xuICAgICAgICAgICAgICAgIHN3aXRjaCAodGhpcy5zdGF0ZVt2XSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIF9pbnRlcnNlY3Rpb24uQkxBQ0s6XG4gICAgICAgICAgICAgICAgICAgICAgICB4U3RyID0gdiA9PT0gdGhpcy5wcmV2TW92ZSA/ICdbWF0nIDogJyBYICc7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBfaW50ZXJzZWN0aW9uLldISVRFOlxuICAgICAgICAgICAgICAgICAgICAgICAgeFN0ciA9IHYgPT09IHRoaXMucHJldk1vdmUgPyAnW09dJyA6ICcgTyAnO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgX2ludGVyc2VjdGlvbi5FTVBUWTpcbiAgICAgICAgICAgICAgICAgICAgICAgIHhTdHIgPSAnIC4gJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgeFN0ciA9ICcgPyAnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBsaW5lU3RyICs9IHhTdHI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsaW5lU3RyICs9ICgnICcgKyB5LnRvU3RyaW5nKCkpLnNsaWNlKC0yKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGxpbmVTdHIpO1xuICAgICAgICB9XG4gICAgICAgIHByaW50WGxhYmVsKCk7XG4gICAgICAgIGNvbnNvbGUubG9nKCcnKTtcbiAgICB9XG5cbiAgICBmZWF0dXJlKCkge1xuICAgICAgICBjb25zdCBpbmRleCA9IChwLCBmKSA9PiBwICogX2NvbnN0YW50cy5GRUFUVVJFX0NOVCArIGY7XG4gICAgICAgIGNvbnN0IGFycmF5ID0gbmV3IEZsb2F0MzJBcnJheShfY29uc3RhbnRzLkJWQ05UICogX2NvbnN0YW50cy5GRUFUVVJFX0NOVCk7XG4gICAgICAgIGNvbnN0IG15ID0gdGhpcy50dXJuO1xuICAgICAgICBjb25zdCBvcHAgPSAoMCwgX2ludGVyc2VjdGlvbi5vcHBvbmVudE9mKSh0aGlzLnR1cm4pO1xuXG4gICAgICAgIGlmIChfY29uc3RhbnRzLkxFRUxBX1pFUk8pIHtcbiAgICAgICAgICAgIGNvbnN0IE4gPSBfY29uc3RhbnRzLktFRVBfUFJFVl9DTlQgKyAxO1xuICAgICAgICAgICAgZm9yIChsZXQgcCA9IDA7IHAgPCBfY29uc3RhbnRzLkJWQ05UOyBwKyspIHtcbiAgICAgICAgICAgICAgICBhcnJheVtpbmRleChwLCAwKV0gPSB0aGlzLnN0YXRlWygwLCBfY29vcmRfY29udmVydC5ydjJldikocCldID09PSBteSA/IDEuMCA6IDAuMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAobGV0IHAgPSAwOyBwIDwgX2NvbnN0YW50cy5CVkNOVDsgcCsrKSB7XG4gICAgICAgICAgICAgICAgYXJyYXlbaW5kZXgocCwgTildID0gdGhpcy5zdGF0ZVsoMCwgX2Nvb3JkX2NvbnZlcnQucnYyZXYpKHApXSA9PT0gb3BwID8gMS4wIDogMC4wO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBfY29uc3RhbnRzLktFRVBfUFJFVl9DTlQ7IGkrKykge1xuICAgICAgICAgICAgICAgIGZvciAobGV0IHAgPSAwOyBwIDwgX2NvbnN0YW50cy5CVkNOVDsgcCsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGFycmF5W2luZGV4KHAsIGkgKyAxKV0gPSB0aGlzLnByZXZTdGF0ZVtpXVsoMCwgX2Nvb3JkX2NvbnZlcnQucnYyZXYpKHApXSA9PT0gbXkgPyAxLjAgOiAwLjA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZvciAobGV0IHAgPSAwOyBwIDwgX2NvbnN0YW50cy5CVkNOVDsgcCsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGFycmF5W2luZGV4KHAsIE4gKyBpICsgMSldID0gdGhpcy5wcmV2U3RhdGVbaV1bKDAsIF9jb29yZF9jb252ZXJ0LnJ2MmV2KShwKV0gPT09IG9wcCA/IDEuMCA6IDAuMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsZXQgaXNfYmxhY2tfdHVybiwgaXNfd2hpdGVfdHVybjtcbiAgICAgICAgICAgIGlmIChteSA9PT0gX2ludGVyc2VjdGlvbi5CTEFDSykge1xuICAgICAgICAgICAgICAgIGlzX2JsYWNrX3R1cm4gPSAxLjA7XG4gICAgICAgICAgICAgICAgaXNfd2hpdGVfdHVybiA9IDAuMDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaXNfYmxhY2tfdHVybiA9IDAuMDtcbiAgICAgICAgICAgICAgICBpc193aGl0ZV90dXJuID0gMS4wO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChsZXQgcCA9IDA7IHAgPCBfY29uc3RhbnRzLkJWQ05UOyBwKyspIHtcbiAgICAgICAgICAgICAgICBhcnJheVtpbmRleChwLCBfY29uc3RhbnRzLkZFQVRVUkVfQ05UIC0gMildID0gaXNfYmxhY2tfdHVybjtcbiAgICAgICAgICAgICAgICBhcnJheVtpbmRleChwLCBfY29uc3RhbnRzLkZFQVRVUkVfQ05UIC0gMSldID0gaXNfd2hpdGVfdHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAobGV0IHAgPSAwOyBwIDwgX2NvbnN0YW50cy5CVkNOVDsgcCsrKSB7XG4gICAgICAgICAgICAgICAgYXJyYXlbaW5kZXgocCwgMCldID0gdGhpcy5zdGF0ZVsoMCwgX2Nvb3JkX2NvbnZlcnQucnYyZXYpKHApXSA9PT0gbXkgPyAxLjAgOiAwLjA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGxldCBwID0gMDsgcCA8IF9jb25zdGFudHMuQlZDTlQ7IHArKykge1xuICAgICAgICAgICAgICAgIGFycmF5W2luZGV4KHAsIDEpXSA9IHRoaXMuc3RhdGVbKDAsIF9jb29yZF9jb252ZXJ0LnJ2MmV2KShwKV0gPT09IG9wcCA/IDEuMCA6IDAuMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgX2NvbnN0YW50cy5LRUVQX1BSRVZfQ05UOyBpKyspIHtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBwID0gMDsgcCA8IF9jb25zdGFudHMuQlZDTlQ7IHArKykge1xuICAgICAgICAgICAgICAgICAgICBhcnJheVtpbmRleChwLCAoaSArIDEpICogMildID0gdGhpcy5wcmV2U3RhdGVbaV1bKDAsIF9jb29yZF9jb252ZXJ0LnJ2MmV2KShwKV0gPT09IG15ID8gMS4wIDogMC4wO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmb3IgKGxldCBwID0gMDsgcCA8IF9jb25zdGFudHMuQlZDTlQ7IHArKykge1xuICAgICAgICAgICAgICAgICAgICBhcnJheVtpbmRleChwLCAoaSArIDEpICogMiArIDEpXSA9IHRoaXMucHJldlN0YXRlW2ldWygwLCBfY29vcmRfY29udmVydC5ydjJldikocCldID09PSBvcHAgPyAxLjAgOiAwLjA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChsZXQgcCA9IDA7IHAgPCBfY29uc3RhbnRzLkJWQ05UOyBwKyspIHtcbiAgICAgICAgICAgICAgICBhcnJheVtpbmRleChwLCBfY29uc3RhbnRzLkZFQVRVUkVfQ05UIC0gMSldID0gbXk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGFycmF5O1xuICAgIH1cblxuICAgIGhhc2goKSB7XG4gICAgICAgIHJldHVybiAoMCwgX3V0aWxzLmhhc2gpKCh0aGlzLnN0YXRlLnRvU3RyaW5nKCkgKyB0aGlzLnByZXZTdGF0ZVswXS50b1N0cmluZygpICsgdGhpcy50dXJuLnRvU3RyaW5nKCkpLnJlcGxhY2UoJywnLCAnJykpO1xuICAgIH1cblxuICAgIGNhbmRpZGF0ZXMoKSB7XG4gICAgICAgIGNvbnN0IGNhbmRMaXN0ID0gW107XG4gICAgICAgIGZvciAobGV0IHYgPSAwOyB2IDwgdGhpcy5zdGF0ZS5sZW5ndGg7IHYrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuc3RhdGVbdl0gPT09IF9pbnRlcnNlY3Rpb24uRU1QVFkgJiYgdGhpcy5sZWdhbCh2KSAmJiAhdGhpcy5leWVzaGFwZSh2LCB0aGlzLnR1cm4pKSB7XG4gICAgICAgICAgICAgICAgY2FuZExpc3QucHVzaCgoMCwgX2Nvb3JkX2NvbnZlcnQuZXYycnYpKHYpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjYW5kTGlzdC5wdXNoKCgwLCBfY29vcmRfY29udmVydC5ldjJydikoX2NvbnN0YW50cy5QQVNTKSk7XG4gICAgICAgIHJldHVybiBuZXcgQ2FuZGlkYXRlcyh0aGlzLmhhc2goKSwgdGhpcy5tb3ZlQ250LCBjYW5kTGlzdCk7XG4gICAgfVxuXG4gICAgZmluYWxTY29yZSgpIHtcbiAgICAgICAgY29uc3QgUk9MTF9PVVRfTlVNID0gMjU2O1xuICAgICAgICBjb25zdCBkb3VibGVTY29yZUxpc3QgPSBbXTtcbiAgICAgICAgbGV0IGJDcHkgPSBuZXcgQm9hcmQodGhpcy5rb21pKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBST0xMX09VVF9OVU07IGkrKykge1xuICAgICAgICAgICAgdGhpcy5jb3B5VG8oYkNweSk7XG4gICAgICAgICAgICBiQ3B5LnJvbGxvdXQoZmFsc2UpO1xuICAgICAgICAgICAgZG91YmxlU2NvcmVMaXN0LnB1c2goYkNweS5zY29yZSgpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKDAsIF91dGlscy5tb3N0Q29tbW9uKShkb3VibGVTY29yZUxpc3QpO1xuICAgIH1cbn1cbmV4cG9ydHMuQm9hcmQgPSBCb2FyZDsgLypcbiAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gdGVzdEJvYXJkKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYiA9IG5ldyBCb2FyZCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgYi5wbGF5U2VxdWVuY2UoWydBMScsICdBMicsICdBOScsICdCMSddLm1hcChzdHIyZXYpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGIuc2hvd2JvYXJkKCk7XG4gICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgdGVzdEJvYXJkKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICovIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG4vLy8g56KB55uk44Gu44K144Kk44K644Gn44GZ44CCXG5jb25zdCBCU0laRSA9IGV4cG9ydHMuQlNJWkUgPSA5O1xuXG4vLy8g5aSW5p6g44KS5oyB44Gk5ouh5by156KB55uk44Gu44K144Kk44K644Gn44GZ44CCXG5jb25zdCBFQlNJWkUgPSBleHBvcnRzLkVCU0laRSA9IEJTSVpFICsgMjtcblxuLy8vIOeigeebpOOBruS6pOeCueOBruaVsOOBp+OBmeOAglxuY29uc3QgQlZDTlQgPSBleHBvcnRzLkJWQ05UID0gQlNJWkUgKiBCU0laRTtcblxuLy8vIOaLoeW8teeigeebpOOBruS6pOeCueOBruaVsOOBp+OBmeOAglxuY29uc3QgRUJWQ05UID0gZXhwb3J0cy5FQlZDTlQgPSBFQlNJWkUgKiBFQlNJWkU7XG5cbi8vLyDjg5HjgrnjgpLooajjgZnnt5rlvaLluqfmqJnjgafjgZnjgILpgJrluLjjga7nnYDmiYvjga/mi6HlvLXnooHnm6Tjga7nt5rlvaLluqfmqJnjgafooajjgZfjgb7jgZnjgIJcbi8vIFRPRE8gLSDnnYDmiYvjga7jgZ/jgoHjgavliJfmjJnlnovjgpLkvZzjgaPjgZ/jgbvjgYbjgYzplqLmlbDjga7jgrfjgrDjg4vjg4Hjg6Pjga/oqq3jgb/jgoTjgZnjgYTjgIJcbmNvbnN0IFBBU1MgPSBleHBvcnRzLlBBU1MgPSBFQlZDTlQ7XG5cbi8vLyDnt5rlvaLluqfmqJnjga7jg5fjg6zjg7zjgrnjg5vjg6vjg4Djg7zjga7mnKrkvb/nlKjjgpLnpLrjgZnlgKTjgafjgZnjgIJcbi8vIFRPRE8gLSDoqbLlvZPjgZnjgovloLTmiYDjgatPcHRpb248dXNpemU+44KS5L2/44Gj44Gf44G744GG44GM6Zai5pWw44Gu44K344Kw44OL44OB44Oj44Gv6Kqt44G/44KE44GZ44GE44CCXG5jb25zdCBWTlVMTCA9IGV4cG9ydHMuVk5VTEwgPSBFQlZDTlQgKyAxO1xuXG5jb25zdCBMRUVMQV9aRVJPID0gZXhwb3J0cy5MRUVMQV9aRVJPID0gdHJ1ZTtcblxuLy8vIE5O44G444Gu5YWl5Yqb44Gr6Zai44GZ44KL5bGl5q2044Gu5rex44GV44Gn44GZ44CCXG5jb25zdCBLRUVQX1BSRVZfQ05UID0gZXhwb3J0cy5LRUVQX1BSRVZfQ05UID0gTEVFTEFfWkVSTyA/IDcgOiAyO1xuXG4vLy8gTk7jgbjjga7lhaXlipvjg5XjgqPjg7zjg4Hjg6Pjg7zjga7mlbDjgafjgZnjgIJcbmNvbnN0IEZFQVRVUkVfQ05UID0gZXhwb3J0cy5GRUFUVVJFX0NOVCA9IEtFRVBfUFJFVl9DTlQgKiAyICsgKExFRUxBX1pFUk8gPyA0IDogMyk7IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLlhfTEFCRUxTID0gdW5kZWZpbmVkO1xuZXhwb3J0cy5tb3ZlMnh5ID0gbW92ZTJ4eTtcbmV4cG9ydHMuZXYyeHkgPSBldjJ4eTtcbmV4cG9ydHMueHkyZXYgPSB4eTJldjtcbmV4cG9ydHMucnYyZXYgPSBydjJldjtcbmV4cG9ydHMuZXYycnYgPSBldjJydjtcbmV4cG9ydHMuZXYyc3RyID0gZXYyc3RyO1xuZXhwb3J0cy5zdHIyZXYgPSBzdHIyZXY7XG5cbnZhciBfY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMuanMnKTtcblxuY29uc3QgWF9MQUJFTFMgPSBleHBvcnRzLlhfTEFCRUxTID0gJ0BBQkNERUZHSEpLTE1OT1BRUlNUJztcblxuZnVuY3Rpb24gbW92ZTJ4eShzKSB7XG4gICAgY29uc3QgT0ZGU0VUID0gJ2EnLmNoYXJDb2RlQXQoMCkgLSAxO1xuICAgIHJldHVybiBbcy5jaGFyQ29kZUF0KDApIC0gT0ZGU0VULCBfY29uc3RhbnRzLkJTSVpFICsgMSAtIChzLmNoYXJDb2RlQXQoMSkgLSBPRkZTRVQpXTtcbn1cblxuZnVuY3Rpb24gZXYyeHkoZXYpIHtcbiAgICByZXR1cm4gW2V2ICUgX2NvbnN0YW50cy5FQlNJWkUsIE1hdGguZmxvb3IoZXYgLyBfY29uc3RhbnRzLkVCU0laRSldO1xufVxuXG5mdW5jdGlvbiB4eTJldih4LCB5KSB7XG4gICAgcmV0dXJuIHkgKiBfY29uc3RhbnRzLkVCU0laRSArIHg7XG59XG5cbmZ1bmN0aW9uIHJ2MmV2KHJ2KSB7XG4gICAgcmV0dXJuIHJ2ID09PSBfY29uc3RhbnRzLkJWQ05UID8gX2NvbnN0YW50cy5QQVNTIDogcnYgJSBfY29uc3RhbnRzLkJTSVpFICsgMSArIE1hdGguZmxvb3IocnYgLyBfY29uc3RhbnRzLkJTSVpFICsgMSkgKiBfY29uc3RhbnRzLkVCU0laRTtcbn1cblxuZnVuY3Rpb24gZXYycnYoZXYpIHtcbiAgICByZXR1cm4gZXYgPT09IF9jb25zdGFudHMuUEFTUyA/IF9jb25zdGFudHMuQlZDTlQgOiBldiAlIF9jb25zdGFudHMuRUJTSVpFIC0gMSArIE1hdGguZmxvb3IoZXYgLyBfY29uc3RhbnRzLkVCU0laRSAtIDEpICogX2NvbnN0YW50cy5CU0laRTtcbn1cblxuZnVuY3Rpb24gZXYyc3RyKGV2KSB7XG4gICAgaWYgKGV2ID49IF9jb25zdGFudHMuUEFTUykge1xuICAgICAgICByZXR1cm4gJ3Bhc3MnO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IFt4LCB5XSA9IGV2Mnh5KGV2KTtcbiAgICAgICAgcmV0dXJuIFhfTEFCRUxTLmNoYXJBdCh4KSArIHkudG9TdHJpbmcoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHN0cjJldih2KSB7XG4gICAgY29uc3QgdlN0ciA9IHYudG9VcHBlckNhc2UoKTtcbiAgICBpZiAodlN0ciA9PT0gJ1BBU1MnIHx8IHZTdHIgPT09ICdSRVNJR04nKSB7XG4gICAgICAgIHJldHVybiBfY29uc3RhbnRzLlBBU1M7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgeCA9IFhfTEFCRUxTLmluZGV4T2YodlN0ci5jaGFyQXQoMCkpO1xuICAgICAgICBjb25zdCB5ID0gcGFyc2VJbnQodlN0ci5zbGljZSgxKSk7XG4gICAgICAgIHJldHVybiB4eTJldih4LCB5KTtcbiAgICB9XG59IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMub3Bwb25lbnRPZiA9IG9wcG9uZW50T2Y7XG5jb25zdCBXSElURSA9IGV4cG9ydHMuV0hJVEUgPSAwO1xuY29uc3QgQkxBQ0sgPSBleHBvcnRzLkJMQUNLID0gMTtcblxuZnVuY3Rpb24gb3Bwb25lbnRPZihjb2xvcikge1xuICAgIHN3aXRjaCAoY29sb3IpIHtcbiAgICAgICAgY2FzZSBXSElURTpcbiAgICAgICAgICAgIHJldHVybiBCTEFDSztcbiAgICAgICAgY2FzZSBCTEFDSzpcbiAgICAgICAgICAgIHJldHVybiBXSElURTtcbiAgICB9XG59XG5cbmNvbnN0IEVNUFRZID0gZXhwb3J0cy5FTVBUWSA9IDI7XG5jb25zdCBFWFRFUklPUiA9IGV4cG9ydHMuRVhURVJJT1IgPSAzOyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5OZXVyYWxOZXR3b3JrID0gdW5kZWZpbmVkO1xuXG52YXIgX3dvcmtlclJtaSA9IHJlcXVpcmUoJ3dvcmtlci1ybWknKTtcblxudmFyIF9jb25zdGFudHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cy5qcycpO1xuXG52YXIgX3V0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xuXG5jbGFzcyBOZXVyYWxOZXR3b3JrIGV4dGVuZHMgX3dvcmtlclJtaS5Xb3JrZXJSTUkge1xuICAgIGFzeW5jIGV2YWx1YXRlKC4uLmlucHV0cykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmludm9rZVJNKCdldmFsdWF0ZScsIGlucHV0cyk7XG4gICAgICAgIGlmIChfY29uc3RhbnRzLkxFRUxBX1pFUk8pIHtcbiAgICAgICAgICAgIHJlc3VsdFswXSA9ICgwLCBfdXRpbHMuc29mdG1heCkocmVzdWx0WzBdKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbn1cbmV4cG9ydHMuTmV1cmFsTmV0d29yayA9IE5ldXJhbE5ldHdvcms7IC8qIGdsb2JhbCAqLyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5UcmVlID0gdW5kZWZpbmVkO1xuXG52YXIgX3V0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xuXG52YXIgX2NvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzLmpzJyk7XG5cbnZhciBfY29vcmRfY29udmVydCA9IHJlcXVpcmUoJy4vY29vcmRfY29udmVydC5qcycpO1xuXG52YXIgX2JvYXJkID0gcmVxdWlyZSgnLi9ib2FyZC5qcycpO1xuXG5jb25zdCBNQVhfTk9ERV9DTlQgPSAxNjM4NDtcbmNvbnN0IEVYUEFORF9DTlQgPSA4O1xuXG5sZXQgVFJFRV9DUCA9IDIuMDtcblxuY2xhc3MgVHJlZSB7XG4gICAgY29uc3RydWN0b3Iobm4pIHtcbiAgICAgICAgdGhpcy5tYWluVGltZSA9IDAuMDtcbiAgICAgICAgdGhpcy5ieW95b21pID0gMS4wO1xuICAgICAgICB0aGlzLmxlZnRUaW1lID0gMC4wO1xuICAgICAgICB0aGlzLm5vZGUgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBNQVhfTk9ERV9DTlQ7IGkrKykge1xuICAgICAgICAgICAgdGhpcy5ub2RlLnB1c2gobmV3IE5vZGUoKSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5ub2RlQ250ID0gMDtcbiAgICAgICAgdGhpcy5yb290SWQgPSAwO1xuICAgICAgICB0aGlzLnJvb3RNb3ZlQ250ID0gMDtcbiAgICAgICAgdGhpcy5ub2RlSGFzaHMgPSBuZXcgTWFwKCk7XG4gICAgICAgIHRoaXMuZXZhbENudCA9IDA7XG4gICAgICAgIHRoaXMubm4gPSBubjtcbiAgICB9XG5cbiAgICBzZXRUaW1lKG1haW5UaW1lLCBieW95b21pKSB7XG4gICAgICAgIHRoaXMubWFpblRpbWUgPSBtYWluVGltZTtcbiAgICAgICAgdGhpcy5sZWZ0VGltZSA9IG1haW5UaW1lO1xuICAgICAgICB0aGlzLmJ5b3lvbWkgPSBieW95b21pO1xuICAgIH1cblxuICAgIHNldExlZnRUaW1lKGxlZnRUaW1lKSB7XG4gICAgICAgIHRoaXMubGVmdFRpbWUgPSBsZWZ0VGltZTtcbiAgICB9XG5cbiAgICBjbGVhcigpIHtcbiAgICAgICAgdGhpcy5sZWZ0VGltZSA9IHRoaXMubWFpblRpbWU7XG4gICAgICAgIGZvciAoY29uc3QgbmQgb2YgdGhpcy5ub2RlKSB7XG4gICAgICAgICAgICBuZC5jbGVhcigpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMubm9kZUNudCA9IDA7XG4gICAgICAgIHRoaXMucm9vdElkID0gMDtcbiAgICAgICAgdGhpcy5yb290TW92ZUNudCA9IDA7XG4gICAgICAgIHRoaXMubm9kZUhhc2hzLmNsZWFyKCk7XG4gICAgICAgIHRoaXMuZXZhbENudCA9IDA7XG4gICAgfVxuXG4gICAgZGVsZXRlTm9kZSgpIHtcbiAgICAgICAgaWYgKHRoaXMubm9kZUNudCA8IE1BWF9OT0RFX0NOVCAvIDIpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IE1BWF9OT0RFX0NOVDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBtYyA9IHRoaXMubm9kZVtpXS5tb3ZlQ250O1xuICAgICAgICAgICAgaWYgKG1jICE9IG51bGwgJiYgbWMgPCB0aGlzLnJvb3RNb3ZlQ250KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5ub2RlSGFzaHMuZGVsZXRlKHRoaXMubm9kZVtpXS5oYXNoKTtcbiAgICAgICAgICAgICAgICB0aGlzLm5vZGVbaV0uY2xlYXIoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNyZWF0ZU5vZGUoYiwgcHJvYikge1xuICAgICAgICBjb25zdCBjYW5kaWRhdGVzID0gYi5jYW5kaWRhdGVzKCk7XG4gICAgICAgIGNvbnN0IGhzID0gY2FuZGlkYXRlcy5oYXNoO1xuICAgICAgICBpZiAodGhpcy5ub2RlSGFzaHMuaGFzKGhzKSAmJiB0aGlzLm5vZGVbdGhpcy5ub2RlSGFzaHNbaHNdXS5oYXNoID09PSBocyAmJiB0aGlzLm5vZGVbdGhpcy5ub2RlSGFzaHNbaHNdXS5tb3ZlQ250ID09PSBjYW5kaWRhdGVzLm1vdmVDbnQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm5vZGVIYXNoc1toc107XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgbm9kZUlkID0gaHMgJSBNQVhfTk9ERV9DTlQ7XG5cbiAgICAgICAgd2hpbGUgKHRoaXMubm9kZVtub2RlSWRdLm1vdmVDbnQgIT0gLTEpIHtcbiAgICAgICAgICAgIG5vZGVJZCA9IG5vZGVJZCArIDEgPCBNQVhfTk9ERV9DTlQgPyBub2RlSWQgKyAxIDogMDtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMubm9kZUhhc2hzW2hzXSA9IG5vZGVJZDtcbiAgICAgICAgdGhpcy5ub2RlQ250ICs9IDE7XG5cbiAgICAgICAgY29uc3QgbmQgPSB0aGlzLm5vZGVbbm9kZUlkXTtcbiAgICAgICAgbmQuY2xlYXIoKTtcbiAgICAgICAgbmQubW92ZUNudCA9IGNhbmRpZGF0ZXMubW92ZUNudDtcbiAgICAgICAgbmQuaGFzaCA9IGhzO1xuICAgICAgICBuZC5pbml0QnJhbmNoKCk7XG5cbiAgICAgICAgZm9yIChjb25zdCBydiBvZiAoMCwgX3V0aWxzLmFyZ3NvcnQpKHByb2IsIHRydWUpKSB7XG4gICAgICAgICAgICBpZiAoY2FuZGlkYXRlcy5saXN0LmluY2x1ZGVzKHJ2KSkge1xuICAgICAgICAgICAgICAgIG5kLm1vdmVbbmQuYnJhbmNoQ250XSA9ICgwLCBfY29vcmRfY29udmVydC5ydjJldikocnYpO1xuICAgICAgICAgICAgICAgIG5kLnByb2JbbmQuYnJhbmNoQ250XSA9IHByb2JbcnZdO1xuICAgICAgICAgICAgICAgIG5kLmJyYW5jaENudCArPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBub2RlSWQ7XG4gICAgfVxuXG4gICAgYmVzdEJ5VUNCKGIsIG5vZGVJZCkge1xuICAgICAgICBjb25zdCBuZCA9IHRoaXMubm9kZVtub2RlSWRdO1xuICAgICAgICBjb25zdCBuZFJhdGUgPSBuZC50b3RhbENudCA9PT0gMCA/IDAuMCA6IG5kLnRvdGFsVmFsdWUgLyBuZC50b3RhbENudDtcbiAgICAgICAgY29uc3QgY3BzdiA9IFRSRUVfQ1AgKiBNYXRoLnNxcnQobmQudG90YWxDbnQpO1xuICAgICAgICBjb25zdCBhY3Rpb25WYWx1ZSA9IG5ldyBGbG9hdDMyQXJyYXkoX2NvbnN0YW50cy5CVkNOVCArIDEpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFjdGlvblZhbHVlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhY3Rpb25WYWx1ZVtpXSA9IG5kLnZpc2l0Q250W2ldID09PSAwID8gbmRSYXRlIDogbmQudmFsdWVXaW5baV0gLyBuZC52aXNpdENudFtpXTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB1Y2IgPSBuZXcgRmxvYXQzMkFycmF5KG5kLmJyYW5jaENudCk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdWNiLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB1Y2JbaV0gPSBhY3Rpb25WYWx1ZVtpXSArIGNwc3YgKiBuZC5wcm9iW2ldIC8gKG5kLnZpc2l0Q250W2ldICsgMSk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgYmVzdCA9ICgwLCBfdXRpbHMuYXJnbWF4KSh1Y2IpO1xuICAgICAgICBjb25zdCBuZXh0SWQgPSBuZC5uZXh0SWRbYmVzdF07XG4gICAgICAgIGNvbnN0IG5leHRNb3ZlID0gbmQubW92ZVtiZXN0XTtcbiAgICAgICAgY29uc3QgaXNIZWFkTm9kZSA9ICF0aGlzLmhhc05leHQobm9kZUlkLCBiZXN0LCBiLmdldE1vdmVDbnQoKSArIDEpIHx8IG5kLnZpc2l0Q250W2Jlc3RdIDwgRVhQQU5EX0NOVCB8fCBiLmdldE1vdmVDbnQoKSA+IF9jb25zdGFudHMuQlZDTlQgKiAyIHx8IG5leHRNb3ZlID09PSBfY29uc3RhbnRzLlBBU1MgJiYgYi5nZXRQcmV2TW92ZSgpID09PSBfY29uc3RhbnRzLlBBU1M7XG4gICAgICAgIHJldHVybiBbYmVzdCwgbmV4dElkLCBuZXh0TW92ZSwgaXNIZWFkTm9kZV07XG4gICAgfVxuXG4gICAgc2hvdWxkU2VhcmNoKGJlc3QsIHNlY29uZCkge1xuICAgICAgICBjb25zdCBuZCA9IHRoaXMubm9kZVt0aGlzLnJvb3RJZF07XG4gICAgICAgIGNvbnN0IHdpblJhdGUgPSB0aGlzLmJyYW5jaFJhdGUobmQsIGJlc3QpO1xuXG4gICAgICAgIHJldHVybiBuZC50b3RhbENudCA8PSA1MDAwIHx8IG5kLnZpc2l0Q250W2Jlc3RdIDw9IG5kLnZpc2l0Q250W3NlY29uZF0gKiAxMDAgJiYgd2luUmF0ZSA+PSAwLjEgJiYgd2luUmF0ZSA8PSAwLjk7XG4gICAgfVxuXG4gICAgZ2V0U2VhcmNoVGltZSgpIHtcbiAgICAgICAgaWYgKHRoaXMubWFpblRpbWUgPT09IDAuMCB8fCB0aGlzLmxlZnRUaW1lIDwgc2VsZi5ieW95b21pICogMi4wKSB7XG4gICAgICAgICAgICByZXR1cm4gTWF0aC5tYXgodGhpcy5ieW95b21pLCAxLjApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubGVmdFRpbWUgLyAoNTUuMCArIE1hdGgubWF4KDUwIC0gdGhpcy5yb290TW92ZUNudCwgMCkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaGFzTmV4dChub2RlSWQsIGJySWQsIG1vdmVDbnQpIHtcbiAgICAgICAgY29uc3QgbmQgPSB0aGlzLm5vZGVbbm9kZUlkXTtcbiAgICAgICAgY29uc3QgbmV4dElkID0gbmQubmV4dElkW2JySWRdO1xuICAgICAgICByZXR1cm4gbmV4dElkID49IDAgJiYgbmQubmV4dEhhc2hbYnJJZF0gPT09IHRoaXMubm9kZVtuZXh0SWRdLmhhc2ggJiYgdGhpcy5ub2RlW25leHRJZF0ubW92ZUNudCA9PT0gbW92ZUNudDtcbiAgICB9XG5cbiAgICBicmFuY2hSYXRlKG5kLCBpZCkge1xuICAgICAgICByZXR1cm4gbmQudmFsdWVXaW5baWRdIC8gTWF0aC5tYXgobmQudmlzaXRDbnRbaWRdLCAxKSAvIDIuMCArIDAuNTtcbiAgICB9XG5cbiAgICBiZXN0U2VxdWVuY2Uobm9kZUlkLCBoZWFkTW92ZSkge1xuICAgICAgICBsZXQgc2VxU3RyID0gKCcgICAnICsgKDAsIF9jb29yZF9jb252ZXJ0LmV2MnN0cikoaGVhZE1vdmUpKS5zbGljZSgtNSk7XG4gICAgICAgIGxldCBuZXh0TW92ZSA9IGhlYWRNb3ZlO1xuXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgNzsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBuZCA9IHRoaXMubm9kZVtub2RlSWRdO1xuICAgICAgICAgICAgaWYgKG5leHRNb3ZlID09PSBfY29uc3RhbnRzLlBBU1MgfHwgbmQuYnJhbmNoQ250IDwgMSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBiZXN0ID0gKDAsIF91dGlscy5hcmdtYXgpKG5kLnZpc2l0Q250LnNsaWNlKDAsIG5kLmJyYW5jaENudCkpO1xuICAgICAgICAgICAgaWYgKG5kLnZpc2l0Q250W2Jlc3RdID09PSAwKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBuZXh0TW92ZSA9IG5kLm1vdmVbYmVzdF07XG4gICAgICAgICAgICBzZXFTdHIgKz0gJy0+JyArICgnICAgJyArICgwLCBfY29vcmRfY29udmVydC5ldjJzdHIpKG5leHRNb3ZlKSkuc2xpY2UoLTUpO1xuXG4gICAgICAgICAgICBpZiAoIXRoaXMuaGFzTmV4dChub2RlSWQsIGJlc3QsIG5kLm1vdmVDbnQgKyAxKSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbm9kZUlkID0gbmQubmV4dElkW2Jlc3RdO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHNlcVN0cjtcbiAgICB9XG5cbiAgICBwcmludEluZm8obm9kZUlkKSB7XG4gICAgICAgIGNvbnN0IG5kID0gdGhpcy5ub2RlW25vZGVJZF07XG4gICAgICAgIGNvbnN0IG9yZGVyID0gKDAsIF91dGlscy5hcmdzb3J0KShuZC52aXNpdENudC5zbGljZSgwLCBuZC5icmFuY2hDbnQpLCB0cnVlKTtcbiAgICAgICAgY29uc29sZS5sb2coJ3xtb3ZlfGNvdW50ICB8cmF0ZSB8dmFsdWV8cHJvYiB8IGJlc3Qgc2VxdWVuY2UnKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBNYXRoLm1pbihvcmRlci5sZW5ndGgsIDkpOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IG0gPSBvcmRlcltpXTtcbiAgICAgICAgICAgIGNvbnN0IHZpc2l0Q250ID0gbmQudmlzaXRDbnRbbV07XG4gICAgICAgICAgICBpZiAodmlzaXRDbnQgPT09IDApIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcmF0ZSA9IHZpc2l0Q250ID09PSAwID8gMC4wIDogdGhpcy5icmFuY2hSYXRlKG5kLCBtKSAqIDEwMC4wO1xuICAgICAgICAgICAgY29uc3QgdmFsdWUgPSAobmQudmFsdWVbbV0gLyAyLjAgKyAwLjUpICogMTAwLjA7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnfCVzfCVzfCVzfCVzfCVzfCAlcycsICgnICAgJyArICgwLCBfY29vcmRfY29udmVydC5ldjJzdHIpKG5kLm1vdmVbbV0pKS5zbGljZSgtNCksICh2aXNpdENudCArICcgICAgICAnKS5zbGljZSgwLCA3KSwgKCcgICcgKyByYXRlLnRvRml4ZWQoMSkpLnNsaWNlKC01KSwgKCcgICcgKyB2YWx1ZS50b0ZpeGVkKDEpKS5zbGljZSgtNSksICgnICAnICsgKG5kLnByb2JbbV0gKiAxMDAuMCkudG9GaXhlZCgxKSkuc2xpY2UoLTUpLCB0aGlzLmJlc3RTZXF1ZW5jZShuZC5uZXh0SWRbbV0sIG5kLm1vdmVbbV0pKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIHByZVNlYXJjaChiKSB7XG4gICAgICAgIGNvbnN0IFtwcm9iXSA9IGF3YWl0IHRoaXMubm4uZXZhbHVhdGUoYi5mZWF0dXJlKCkpO1xuICAgICAgICB0aGlzLnJvb3RJZCA9IHRoaXMuY3JlYXRlTm9kZShiLCBwcm9iKTtcbiAgICAgICAgdGhpcy5yb290TW92ZUNudCA9IGIuZ2V0TW92ZUNudCgpO1xuICAgICAgICBUUkVFX0NQID0gdGhpcy5yb290TW92ZUNudCA8IDggPyAwLjAxIDogMS41O1xuICAgIH1cblxuICAgIGFzeW5jIGV2YWx1YXRlQ2hpbGROb2RlKGIsIG5vZGVJZCwgY2hpbGQpIHtcbiAgICAgICAgbGV0IFtwcm9iLCB2YWx1ZV0gPSBhd2FpdCB0aGlzLm5uLmV2YWx1YXRlKGIuZmVhdHVyZSgpKTtcbiAgICAgICAgdGhpcy5ldmFsQ250ICs9IDE7XG4gICAgICAgIHZhbHVlID0gLXZhbHVlWzBdO1xuICAgICAgICBjb25zdCBuZCA9IHRoaXMubm9kZVtub2RlSWRdO1xuICAgICAgICBuZC52YWx1ZVtjaGlsZF0gPSB2YWx1ZTtcbiAgICAgICAgbmQuZXZhbHVhdGVkW2NoaWxkXSA9IHRydWU7XG4gICAgICAgIGlmICh0aGlzLm5vZGVDbnQgPiAwLjg1ICogTUFYX05PREVfQ05UKSB7XG4gICAgICAgICAgICB0aGlzLmRlbGV0ZU5vZGUoKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBuZXh0SWQgPSB0aGlzLmNyZWF0ZU5vZGUoYiwgcHJvYik7XG4gICAgICAgIG5kLm5leHRJZFtjaGlsZF0gPSBuZXh0SWQ7XG4gICAgICAgIG5kLm5leHRIYXNoW2NoaWxkXSA9IGIuaGFzaCgpO1xuICAgICAgICBuZC50b3RhbFZhbHVlIC09IG5kLnZhbHVlV2luW2NoaWxkXTtcbiAgICAgICAgbmQudG90YWxDbnQgKz0gbmQudmlzaXRDbnRbY2hpbGRdO1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuXG4gICAgYXN5bmMgc2VhcmNoQnJhbmNoKGIsIG5vZGVJZCwgcm91dGUpIHtcbiAgICAgICAgY29uc3QgW2Jlc3QsIG5leHRJZCwgbmV4dE1vdmUsIGlzSGVhZE5vZGVdID0gdGhpcy5iZXN0QnlVQ0IoYiwgbm9kZUlkKTtcbiAgICAgICAgcm91dGUucHVzaChbbm9kZUlkLCBiZXN0XSk7XG4gICAgICAgIGIucGxheShuZXh0TW92ZSwgZmFsc2UpO1xuICAgICAgICBjb25zdCBuZCA9IHRoaXMubm9kZVtub2RlSWRdO1xuICAgICAgICBjb25zdCB2YWx1ZSA9IGlzSGVhZE5vZGUgPyBuZC5ldmFsdWF0ZWRbYmVzdF0gPyBuZC52YWx1ZVtiZXN0XSA6IGF3YWl0IHRoaXMuZXZhbHVhdGVDaGlsZE5vZGUoYiwgbm9kZUlkLCBiZXN0KSA6IC0oYXdhaXQgdGhpcy5zZWFyY2hCcmFuY2goYiwgbmV4dElkLCByb3V0ZSkpO1xuICAgICAgICBuZC50b3RhbFZhbHVlICs9IHZhbHVlO1xuICAgICAgICBuZC50b3RhbENudCArPSAxO1xuICAgICAgICBuZC52YWx1ZVdpbltiZXN0XSArPSB2YWx1ZTtcbiAgICAgICAgbmQudmlzaXRDbnRbYmVzdF0gKz0gMTtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cblxuICAgIGFzeW5jIGtlZXBQbGF5b3V0KGIsIGV4aXRDb25kaXRpb24pIHtcbiAgICAgICAgdGhpcy5ldmFsQ250ID0gMDtcbiAgICAgICAgbGV0IGJDcHkgPSBuZXcgX2JvYXJkLkJvYXJkKCk7XG4gICAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgICAgICBiLmNvcHlUbyhiQ3B5KTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2VhcmNoQnJhbmNoKGJDcHksIHRoaXMucm9vdElkLCBbXSk7XG4gICAgICAgICAgICBpZiAoZXhpdENvbmRpdGlvbigpKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyBfc2VhcmNoKGIsIHBvbmRlciwgY2xlYW4sIGV4aXRDb25kaXRpb24pIHtcbiAgICAgICAgbGV0IFtiZXN0LCBzZWNvbmRdID0gdGhpcy5ub2RlW3RoaXMucm9vdElkXS5iZXN0MigpO1xuICAgICAgICBpZiAocG9uZGVyIHx8IHRoaXMuc2hvdWxkU2VhcmNoKGJlc3QsIHNlY29uZCkpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMua2VlcFBsYXlvdXQoYiwgZXhpdENvbmRpdGlvbik7XG4gICAgICAgICAgICBjb25zdCBiZXN0MiA9IHRoaXMubm9kZVt0aGlzLnJvb3RJZF0uYmVzdDIoKTtcbiAgICAgICAgICAgIGJlc3QgPSBiZXN0MlswXTtcbiAgICAgICAgICAgIHNlY29uZCA9IGJlc3QyWzFdO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbmQgPSB0aGlzLm5vZGVbdGhpcy5yb290SWRdO1xuICAgICAgICBsZXQgbmV4dE1vdmUgPSBuZC5tb3ZlW2Jlc3RdO1xuICAgICAgICBsZXQgd2luUmF0ZSA9IHRoaXMuYnJhbmNoUmF0ZShuZCwgYmVzdCk7XG5cbiAgICAgICAgaWYgKGNsZWFuICYmIG5leHRNb3ZlID09PSBfY29uc3RhbnRzLlBBU1MgJiYgbmQudmFsdWVXaW5bYmVzdF0gKiBuZC52YWx1ZVdpbltzZWNvbmRdID4gMC4wKSB7XG4gICAgICAgICAgICBuZXh0TW92ZSA9IG5kLm1vdmVbc2Vjb25kXTtcbiAgICAgICAgICAgIHdpblJhdGUgPSB0aGlzLmJyYW5jaFJhdGUobmQsIHNlY29uZCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFtuZXh0TW92ZSwgd2luUmF0ZV07XG4gICAgfVxuXG4gICAgYXN5bmMgc2VhcmNoKGIsIHRpbWUsIHBvbmRlciwgY2xlYW4pIHtcbiAgICAgICAgY29uc3Qgc3RhcnQgPSBEYXRlLm5vdygpO1xuICAgICAgICBhd2FpdCB0aGlzLnByZVNlYXJjaChiKTtcblxuICAgICAgICBpZiAodGhpcy5ub2RlW3RoaXMucm9vdElkXS5icmFuY2hDbnQgPD0gMSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1xcbm1vdmUgY291bnQ9JWQ6JywgdGhpcy5yb290TW92ZUNudCArIDEpO1xuICAgICAgICAgICAgdGhpcy5wcmludEluZm8odGhpcy5yb290SWQpO1xuICAgICAgICAgICAgcmV0dXJuIFtfY29uc3RhbnRzLlBBU1MsIDAuNV07XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmRlbGV0ZU5vZGUoKTtcblxuICAgICAgICBjb25zdCB0aW1lXyA9ICh0aW1lID09PSAwLjAgPyB0aGlzLmdldFNlYXJjaFRpbWUoKSA6IHRpbWUpICogMTAwMDtcbiAgICAgICAgaWYgKHBvbmRlcikge1xuICAgICAgICAgICAgc2VsZi5QT05ERVJfU1RPUCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IFtuZXh0TW92ZSwgd2luUmF0ZV0gPSBhd2FpdCB0aGlzLl9zZWFyY2goYiwgcG9uZGVyLCBjbGVhbiwgcG9uZGVyID8gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHNlbGYuUE9OREVSX1NUT1A7XG4gICAgICAgIH0gOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gRGF0ZS5ub3coKSAtIHN0YXJ0ID4gdGltZV87XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICghcG9uZGVyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnXFxubW92ZSBjb3VudD0lZDogbGVmdCB0aW1lPSVzW3NlY10gZXZhbHVhdGVkPSVkJywgdGhpcy5yb290TW92ZUNudCArIDEsIE1hdGgubWF4KHRoaXMubGVmdFRpbWUgLSB0aW1lLCAwLjApLnRvRml4ZWQoMSksIHRoaXMuZXZhbENudCk7XG4gICAgICAgICAgICB0aGlzLnByaW50SW5mbyh0aGlzLnJvb3RJZCk7XG4gICAgICAgICAgICB0aGlzLmxlZnRUaW1lID0gdGhpcy5sZWZ0VGltZSAtIChEYXRlLm5vdygpIC0gc3RhcnQpIC8gMTAwMDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBbbmV4dE1vdmUsIHdpblJhdGVdO1xuICAgIH1cbn1cblxuZXhwb3J0cy5UcmVlID0gVHJlZTtcbmNsYXNzIE5vZGUge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLm1vdmUgPSBuZXcgVWludDhBcnJheShfY29uc3RhbnRzLkJWQ05UICsgMSk7XG4gICAgICAgIHRoaXMucHJvYiA9IG5ldyBGbG9hdDMyQXJyYXkoX2NvbnN0YW50cy5CVkNOVCArIDEpO1xuICAgICAgICB0aGlzLnZhbHVlID0gbmV3IEZsb2F0MzJBcnJheShfY29uc3RhbnRzLkJWQ05UICsgMSk7XG4gICAgICAgIHRoaXMudmFsdWVXaW4gPSBuZXcgRmxvYXQzMkFycmF5KF9jb25zdGFudHMuQlZDTlQgKyAxKTtcbiAgICAgICAgdGhpcy52aXNpdENudCA9IG5ldyBVaW50MzJBcnJheShfY29uc3RhbnRzLkJWQ05UICsgMSk7XG4gICAgICAgIHRoaXMubmV4dElkID0gbmV3IEludDE2QXJyYXkoX2NvbnN0YW50cy5CVkNOVCArIDEpO1xuICAgICAgICB0aGlzLm5leHRIYXNoID0gbmV3IFVpbnQzMkFycmF5KF9jb25zdGFudHMuQlZDTlQgKyAxKTtcbiAgICAgICAgdGhpcy5ldmFsdWF0ZWQgPSBbXTtcbiAgICAgICAgdGhpcy5icmFuY2hDbnQgPSAwO1xuICAgICAgICB0aGlzLnRvdGFsVmFsdWUgPSAwLjA7XG4gICAgICAgIHRoaXMudG90YWxDbnQgPSAwO1xuICAgICAgICB0aGlzLmhhc2ggPSAwO1xuICAgICAgICB0aGlzLm1vdmVDbnQgPSAtMTtcbiAgICAgICAgdGhpcy5pbml0QnJhbmNoKCk7XG4gICAgICAgIHRoaXMuY2xlYXIoKTtcbiAgICB9XG5cbiAgICBpbml0QnJhbmNoKCkge1xuICAgICAgICB0aGlzLm1vdmUuZmlsbChfY29uc3RhbnRzLlZOVUxMKTtcbiAgICAgICAgdGhpcy5wcm9iLmZpbGwoMC4wKTtcbiAgICAgICAgdGhpcy52YWx1ZS5maWxsKDAuMCk7XG4gICAgICAgIHRoaXMudmFsdWVXaW4uZmlsbCgwLjApO1xuICAgICAgICB0aGlzLnZpc2l0Q250LmZpbGwoMCk7XG4gICAgICAgIHRoaXMubmV4dElkLmZpbGwoLTEpO1xuICAgICAgICB0aGlzLm5leHRIYXNoLmZpbGwoMCk7XG4gICAgICAgIHRoaXMuZXZhbHVhdGVkID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgX2NvbnN0YW50cy5CVkNOVCArIDE7IGkrKykge1xuICAgICAgICAgICAgdGhpcy5ldmFsdWF0ZWQucHVzaChmYWxzZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjbGVhcigpIHtcbiAgICAgICAgdGhpcy5icmFuY2hDbnQgPSAwO1xuICAgICAgICB0aGlzLnRvdGFsVmFsdWUgPSAwLjA7XG4gICAgICAgIHRoaXMudG90YWxDbnQgPSAwO1xuICAgICAgICB0aGlzLmhhc2ggPSAwO1xuICAgICAgICB0aGlzLm1vdmVDbnQgPSAtMTtcbiAgICB9XG5cbiAgICBiZXN0MigpIHtcbiAgICAgICAgY29uc3Qgb3JkZXIgPSAoMCwgX3V0aWxzLmFyZ3NvcnQpKHRoaXMudmlzaXRDbnQuc2xpY2UoMCwgdGhpcy5icmFuY2hDbnQpLCB0cnVlKTtcbiAgICAgICAgcmV0dXJuIG9yZGVyLnNsaWNlKDAsIDIpO1xuICAgIH1cbn0iLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuU3RvbmVHcm91cCA9IHVuZGVmaW5lZDtcblxudmFyIF9jb25zdGFudHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cy5qcycpO1xuXG5jbGFzcyBTdG9uZUdyb3VwIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpcy5saWJDbnQgPSBfY29uc3RhbnRzLlZOVUxMO1xuICAgICAgICB0aGlzLnNpemUgPSBfY29uc3RhbnRzLlZOVUxMO1xuICAgICAgICB0aGlzLnZBdHIgPSBfY29uc3RhbnRzLlZOVUxMO1xuICAgICAgICB0aGlzLmxpYnMgPSBuZXcgU2V0KCk7XG4gICAgfVxuXG4gICAgZ2V0U2l6ZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2l6ZTtcbiAgICB9XG5cbiAgICBnZXRMaWJDbnQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmxpYkNudDtcbiAgICB9XG5cbiAgICBnZXRWQXRyKCkge1xuICAgICAgICByZXR1cm4gdGhpcy52QXRyO1xuICAgIH1cblxuICAgIGNsZWFyKHN0b25lKSB7XG4gICAgICAgIHRoaXMubGliQ250ID0gc3RvbmUgPyAwIDogX2NvbnN0YW50cy5WTlVMTDtcbiAgICAgICAgdGhpcy5zaXplID0gc3RvbmUgPyAxIDogX2NvbnN0YW50cy5WTlVMTDtcbiAgICAgICAgdGhpcy52QXRyID0gX2NvbnN0YW50cy5WTlVMTDtcbiAgICAgICAgdGhpcy5saWJzLmNsZWFyKCk7XG4gICAgfVxuXG4gICAgYWRkKHYpIHtcbiAgICAgICAgaWYgKHRoaXMubGlicy5oYXModikpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmxpYnMuYWRkKHYpO1xuICAgICAgICB0aGlzLmxpYkNudCArPSAxO1xuICAgICAgICB0aGlzLnZBdHIgPSB2O1xuICAgIH1cblxuICAgIHN1Yih2KSB7XG4gICAgICAgIGlmICghdGhpcy5saWJzLmhhcyh2KSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMubGlicy5kZWxldGUodik7XG4gICAgICAgIHRoaXMubGliQ250IC09IDE7XG4gICAgfVxuXG4gICAgbWVyZ2Uob3RoZXIpIHtcbiAgICAgICAgdGhpcy5saWJzID0gbmV3IFNldChbLi4udGhpcy5saWJzLCAuLi5vdGhlci5saWJzXSk7XG4gICAgICAgIHRoaXMubGliQ250ID0gdGhpcy5saWJzLnNpemU7XG4gICAgICAgIHRoaXMuc2l6ZSArPSBvdGhlci5zaXplO1xuICAgICAgICBpZiAodGhpcy5saWJDbnQgPT09IDEpIHtcbiAgICAgICAgICAgIHNlbGYudkF0ciA9IHRoaXMubGlic1swXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNvcHlUbyhkZXN0KSB7XG4gICAgICAgIGRlc3QubGliQ250ID0gdGhpcy5saWJDbnQ7XG4gICAgICAgIGRlc3Quc2l6ZSA9IHRoaXMuc2l6ZTtcbiAgICAgICAgZGVzdC52QXRyID0gdGhpcy52QXRyO1xuICAgICAgICBkZXN0LmxpYnMgPSBuZXcgU2V0KHRoaXMubGlicyk7XG4gICAgfVxufVxuZXhwb3J0cy5TdG9uZUdyb3VwID0gU3RvbmVHcm91cDsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuc2h1ZmZsZSA9IHNodWZmbGU7XG5leHBvcnRzLm1vc3RDb21tb24gPSBtb3N0Q29tbW9uO1xuZXhwb3J0cy5hcmdzb3J0ID0gYXJnc29ydDtcbmV4cG9ydHMuYXJnbWF4ID0gYXJnbWF4O1xuZXhwb3J0cy5oYXNoID0gaGFzaDtcbmV4cG9ydHMuc29mdG1heCA9IHNvZnRtYXg7XG5leHBvcnRzLnByaW50UHJvYiA9IHByaW50UHJvYjtcblxudmFyIF9jb25zdGFudHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cy5qcycpO1xuXG5mdW5jdGlvbiBzaHVmZmxlKGFycmF5KSB7XG4gICAgbGV0IG4gPSBhcnJheS5sZW5ndGg7XG4gICAgbGV0IHQ7XG4gICAgbGV0IGk7XG5cbiAgICB3aGlsZSAobikge1xuICAgICAgICBpID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogbi0tKTtcbiAgICAgICAgdCA9IGFycmF5W25dO1xuICAgICAgICBhcnJheVtuXSA9IGFycmF5W2ldO1xuICAgICAgICBhcnJheVtpXSA9IHQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFycmF5O1xufVxuXG5mdW5jdGlvbiBtb3N0Q29tbW9uKGFycmF5KSB7XG4gICAgY29uc3QgbWFwID0gbmV3IE1hcCgpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgZSA9IGFycmF5W2ldO1xuICAgICAgICBpZiAobWFwLmhhcyhlKSkge1xuICAgICAgICAgICAgbWFwLnNldChlLCBtYXAuZ2V0KGUpICsgMSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBtYXAuc2V0KGUsIDEpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGxldCBtYXhLZXk7XG4gICAgbGV0IG1heFZhbHVlID0gLTE7XG4gICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgbWFwLmVudHJpZXMoKSkge1xuICAgICAgICBpZiAodmFsdWUgPiBtYXhWYWx1ZSkge1xuICAgICAgICAgICAgbWF4S2V5ID0ga2V5O1xuICAgICAgICAgICAgbWF4VmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbWF4S2V5O1xufVxuXG5mdW5jdGlvbiBhcmdzb3J0KGFycmF5LCByZXZlcnNlKSB7XG4gICAgY29uc3QgZW4gPSBBcnJheS5mcm9tKGFycmF5KS5tYXAoKGUsIGkpID0+IFtpLCBlXSk7XG4gICAgZW4uc29ydCgoYSwgYikgPT4gcmV2ZXJzZSA/IGJbMV0gLSBhWzFdIDogYVsxXSAtIGJbMV0pO1xuICAgIHJldHVybiBlbi5tYXAoZSA9PiBlWzBdKTtcbn1cblxuZnVuY3Rpb24gYXJnbWF4KGFycmF5KSB7XG4gICAgbGV0IG1heEluZGV4O1xuICAgIGxldCBtYXhWYWx1ZSA9IC1JbmZpbml0eTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IHYgPSBhcnJheVtpXTtcbiAgICAgICAgaWYgKHYgPiBtYXhWYWx1ZSkge1xuICAgICAgICAgICAgbWF4SW5kZXggPSBpO1xuICAgICAgICAgICAgbWF4VmFsdWUgPSB2O1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBtYXhJbmRleDtcbn1cblxuZnVuY3Rpb24gaGFzaChzdHIpIHtcbiAgICBsZXQgaGFzaCA9IDUzODE7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgY2hhciA9IHN0ci5jaGFyQ29kZUF0KGkpO1xuICAgICAgICBoYXNoID0gKGhhc2ggPDwgNSkgKyBoYXNoICsgY2hhcjsgLyogaGFzaCAqIDMzICsgYyAqL1xuICAgICAgICBoYXNoID0gaGFzaCAmIGhhc2g7IC8vIENvbnZlcnQgdG8gMzJiaXQgaW50ZWdlclxuICAgIH1cbiAgICByZXR1cm4gTWF0aC5hYnMoaGFzaCk7XG59XG5cbmZ1bmN0aW9uIHNvZnRtYXgoaW5wdXQsIHRlbXBlcmF0dXJlID0gMS4wKSB7XG4gICAgY29uc3Qgb3V0cHV0ID0gbmV3IEZsb2F0MzJBcnJheShpbnB1dC5sZW5ndGgpO1xuICAgIGNvbnN0IGFscGhhID0gTWF0aC5tYXguYXBwbHkobnVsbCwgaW5wdXQpO1xuICAgIGxldCBkZW5vbSA9IDAuMDtcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaW5wdXQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgdmFsID0gTWF0aC5leHAoKGlucHV0W2ldIC0gYWxwaGEpIC8gdGVtcGVyYXR1cmUpO1xuICAgICAgICBkZW5vbSArPSB2YWw7XG4gICAgICAgIG91dHB1dFtpXSA9IHZhbDtcbiAgICB9XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG91dHB1dC5sZW5ndGg7IGkrKykge1xuICAgICAgICBvdXRwdXRbaV0gLz0gZGVub207XG4gICAgfVxuXG4gICAgcmV0dXJuIG91dHB1dDtcbn1cblxuZnVuY3Rpb24gcHJpbnRQcm9iKHByb2IpIHtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IF9jb25zdGFudHMuQlNJWkU7IHkrKykge1xuICAgICAgICBsZXQgc3RyID0gYCR7eSArIDF9IGA7XG4gICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgX2NvbnN0YW50cy5CU0laRTsgeCsrKSB7XG4gICAgICAgICAgICBzdHIgKz0gKCcgICcgKyBwcm9iW3ggKyB5ICogX2NvbnN0YW50cy5CU0laRV0udG9GaXhlZCgxKSkuc2xpY2UoLTUpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKHN0cik7XG4gICAgfVxuICAgIGNvbnNvbGUubG9nKCdwYXNzPSVzJywgcHJvYltwcm9iLmxlbmd0aCAtIDFdLnRvRml4ZWQoMSkpO1xufSIsIid1c2Ugc3RyaWN0JztcblxudmFyIF93b3JrZXJSbWkgPSByZXF1aXJlKCd3b3JrZXItcm1pJyk7XG5cbnZhciBfbmV1cmFsX25ldHdvcmtfY2xpZW50ID0gcmVxdWlyZSgnLi9uZXVyYWxfbmV0d29ya19jbGllbnQuanMnKTtcblxudmFyIF9jb29yZF9jb252ZXJ0ID0gcmVxdWlyZSgnLi9jb29yZF9jb252ZXJ0LmpzJyk7XG5cbnZhciBfY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMuanMnKTtcblxudmFyIF9pbnRlcnNlY3Rpb24gPSByZXF1aXJlKCcuL2ludGVyc2VjdGlvbi5qcycpO1xuXG52YXIgX2JvYXJkID0gcmVxdWlyZSgnLi9ib2FyZC5qcycpO1xuXG52YXIgX3NlYXJjaCA9IHJlcXVpcmUoJy4vc2VhcmNoLmpzJyk7XG5cbmNsYXNzIEE5RW5naW5lIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpcy5iID0gbmV3IF9ib2FyZC5Cb2FyZCgpO1xuICAgICAgICB0aGlzLm5uID0gbmV3IF9uZXVyYWxfbmV0d29ya19jbGllbnQuTmV1cmFsTmV0d29yayhzZWxmKTtcbiAgICAgICAgdGhpcy50cmVlID0gbmV3IF9zZWFyY2guVHJlZSh0aGlzLm5uKTtcbiAgICB9XG5cbiAgICBhc3luYyBsb2FkTk4oKSB7XG4gICAgICAgIGF3YWl0IHRoaXMubm4uaW52b2tlUk0oJ2xvYWQnKTtcbiAgICB9XG5cbiAgICBjbGVhcigpIHtcbiAgICAgICAgdGhpcy5iLmNsZWFyKCk7XG4gICAgICAgIHRoaXMudHJlZS5jbGVhcigpO1xuICAgIH1cblxuICAgIHRpbWVTZXR0aW5ncyhtYWluVGltZSwgYnlveW9taSkge1xuICAgICAgICB0aGlzLnRyZWUuc2V0VGltZShtYWluVGltZSwgYnlveW9taSk7XG4gICAgfVxuXG4gICAgYXN5bmMgZ2VubW92ZSgpIHtcbiAgICAgICAgY29uc3QgW21vdmUsIHdpblJhdGVdID0gYXdhaXQgdGhpcy5iZXN0TW92ZSgpO1xuICAgICAgICBpZiAod2luUmF0ZSA8IDAuMSkge1xuICAgICAgICAgICAgcmV0dXJuICdyZXNpZ24nO1xuICAgICAgICB9IGVsc2UgaWYgKG1vdmUgPT09IF9jb25zdGFudHMuUEFTUyB8fCB0aGlzLmIuc3RhdGVbbW92ZV0gPT09IF9pbnRlcnNlY3Rpb24uRU1QVFkpIHtcbiAgICAgICAgICAgIHRoaXMuYi5wbGF5KG1vdmUsIHRydWUpO1xuICAgICAgICAgICAgcmV0dXJuICgwLCBfY29vcmRfY29udmVydC5ldjJzdHIpKG1vdmUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2Vycm9yJyk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnJWQoJXMpIGlzIG5vdCBlbXB0eScsIG1vdmUsICgwLCBfY29vcmRfY29udmVydC5ldjJzdHIpKG1vdmUpKTtcbiAgICAgICAgICAgIHRoaXMuYi5zaG93Ym9hcmQoKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHRoaXMuYi5jYW5kaWRhdGVzKCkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcGxheShldikge1xuICAgICAgICB0aGlzLmIucGxheShldiwgZmFsc2UpO1xuICAgIH1cblxuICAgIGFzeW5jIGJlc3RNb3ZlKCkge1xuICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy50cmVlLnNlYXJjaCh0aGlzLmIsIDAuMCwgZmFsc2UsIGZhbHNlKTtcbiAgICB9XG5cbiAgICBmaW5hbFNjb3JlKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5iLmZpbmFsU2NvcmUoKTtcbiAgICB9XG5cbiAgICBhc3luYyBwb25kZXIoKSB7XG4gICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnRyZWUuc2VhcmNoKHRoaXMuYiwgSW5maW5pdHksIHRydWUsIGZhbHNlKTtcbiAgICB9XG5cbiAgICBzdG9wUG9uZGVyKCkge1xuICAgICAgICBzZWxmLlBPTkRFUl9TVE9QID0gdHJ1ZTtcbiAgICB9XG59XG5cbigwLCBfd29ya2VyUm1pLnJlc2lndGVyV29ya2VyUk1JKShzZWxmLCBBOUVuZ2luZSk7Il19
