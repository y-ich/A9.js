(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
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
    constructor() {
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
        return stoneCnt[1] - stoneCnt[0] - _constants.KOMI;
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
        function index(p, f) {
            return p * _constants.FEATURE_CNT + f;
        }
        const array = new Float32Array(_constants.BVCNT * _constants.FEATURE_CNT);

        const my = this.turn;
        const opp = (0, _intersection.opponentOf)(this.turn);
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
        let bCpy = new Board();
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
},{"./constants.js":2,"./coord_convert.js":3,"./intersection.js":4,"./stone_group.js":7,"./utils.js":8}],2:[function(require,module,exports){
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
},{}],3:[function(require,module,exports){
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
},{"./constants.js":2}],4:[function(require,module,exports){
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
},{}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
/* global WorkerProcedureCall */

class NeuralNetwork {
    constructor() {
        this.receiver = new WorkerProcedureCall(self, this.constructor.name);
    }

    async evaluate(b) {
        const result = await this.receiver.call('evaluate', [b.feature()]);
        self.PONDER_STOP = result.pop();
        return result;
    }
}
exports.NeuralNetwork = NeuralNetwork;
},{}],6:[function(require,module,exports){
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

function printProb(prob) {
    for (let y = 0; y < _constants.BSIZE; y++) {
        let str = '';
        for (let x = 0; x < _constants.BSIZE; x++) {
            str += ('  ' + prob[x + y * _constants.BSIZE].toFixed(1)).slice(-5);
        }
        console.log(str);
    }
    console.log('pass=%s', prob[prob.length - 1].toFixed(1));
}

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

    bestByActionValue(b, nodeId) {
        const nd = this.node[nodeId];
        const ndRate = nd.totalCnt === 0 ? 0.0 : nd.totalValue / nd.totalCnt;
        const cpsv = TREE_CP * Math.sqrt(nd.totalCnt);
        const rate = new Float32Array(_constants.BVCNT + 1);
        for (let i = 0; i < rate.length; i++) {
            rate[i] = nd.visitCnt[i] === 0 ? ndRate : nd.valueWin[i] / nd.visitCnt[i];
        }
        const actionValue = new Float32Array(nd.branchCnt);
        for (let i = 0; i < actionValue.length; i++) {
            actionValue[i] = rate[i] + cpsv * nd.prob[i] / (nd.visitCnt[i] + 1);
        }
        const best = (0, _utils.argmax)(actionValue);
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
        const [prob] = await this.nn.evaluate(b);
        this.rootId = this.createNode(b, prob);
        this.rootMoveCnt = b.getMoveCnt();
        TREE_CP = this.rootMoveCnt < 8 ? 0.01 : 1.5;
    }

    async evaluateChildNode(b, nodeId, child) {
        let [prob, value] = await this.nn.evaluate(b);
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
        const [best, nextId, nextMove, isHeadNode] = this.bestByActionValue(b, nodeId);
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
        let searchIdx = 1;
        this.evalCnt = 0;
        let bCpy = new _board.Board();
        while (true) {
            b.copyTo(bCpy);
            await this.searchBranch(bCpy, this.rootId, []);
            searchIdx += 1;
            if (searchIdx % 64 === 0 && exitCondition(searchIdx)) {
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
            if (self.PONDER_STOP) {
                console.log('worker ponder stop');
            }
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
},{"./board.js":1,"./constants.js":2,"./coord_convert.js":3,"./utils.js":8}],7:[function(require,module,exports){
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
},{"./constants.js":2}],8:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.shuffle = shuffle;
exports.mostCommon = mostCommon;
exports.argsort = argsort;
exports.argmax = argmax;
exports.hash = hash;
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
},{}],9:[function(require,module,exports){
'use strict';

var _neural_network_client = require('./neural_network_client.js');

var _coord_convert = require('./coord_convert.js');

var _constants = require('./constants.js');

var _intersection = require('./intersection.js');

var _board = require('./board.js');

var _search = require('./search.js');

/* global $ JGO BoardController addProcedureListener */
self.importScripts('worker-procedure-call.js');

class A9Engine {
    constructor() {
        this.b = new _board.Board();
        this.tree = new _search.Tree(nn);
        addProcedureListener(self, this);
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
        console.log('worker ponder');
        return await this.tree.search(this.b, Infinity, true, false);
    }
}

const nn = new _neural_network_client.NeuralNetwork();
const engine = new A9Engine(nn);
},{"./board.js":1,"./constants.js":2,"./coord_convert.js":3,"./intersection.js":4,"./neural_network_client.js":5,"./search.js":6}]},{},[9])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYm9hcmQuanMiLCJzcmMvY29uc3RhbnRzLmpzIiwic3JjL2Nvb3JkX2NvbnZlcnQuanMiLCJzcmMvaW50ZXJzZWN0aW9uLmpzIiwic3JjL25ldXJhbF9uZXR3b3JrX2NsaWVudC5qcyIsInNyYy9zZWFyY2guanMiLCJzcmMvc3RvbmVfZ3JvdXAuanMiLCJzcmMvdXRpbHMuanMiLCJzcmMvd29ya2VyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDamFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25XQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9cmV0dXJuIGV9KSgpIiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLkJvYXJkID0gZXhwb3J0cy5DYW5kaWRhdGVzID0gdW5kZWZpbmVkO1xuZXhwb3J0cy5uZWlnaGJvcnMgPSBuZWlnaGJvcnM7XG5leHBvcnRzLmRpYWdvbmFscyA9IGRpYWdvbmFscztcblxudmFyIF91dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcblxudmFyIF9jb25zdGFudHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cy5qcycpO1xuXG52YXIgX2ludGVyc2VjdGlvbiA9IHJlcXVpcmUoJy4vaW50ZXJzZWN0aW9uLmpzJyk7XG5cbnZhciBfc3RvbmVfZ3JvdXAgPSByZXF1aXJlKCcuL3N0b25lX2dyb3VwLmpzJyk7XG5cbnZhciBfY29vcmRfY29udmVydCA9IHJlcXVpcmUoJy4vY29vcmRfY29udmVydC5qcycpO1xuXG5mdW5jdGlvbiBuZWlnaGJvcnModikge1xuICAgIHJldHVybiBbdiArIDEsIHYgKyBfY29uc3RhbnRzLkVCU0laRSwgdiAtIDEsIHYgLSBfY29uc3RhbnRzLkVCU0laRV07XG59XG5cbmZ1bmN0aW9uIGRpYWdvbmFscyh2KSB7XG4gICAgcmV0dXJuIFt2ICsgX2NvbnN0YW50cy5FQlNJWkUgKyAxLCB2ICsgX2NvbnN0YW50cy5FQlNJWkUgLSAxLCB2IC0gX2NvbnN0YW50cy5FQlNJWkUgLSAxLCB2IC0gX2NvbnN0YW50cy5FQlNJWkUgKyAxXTtcbn1cblxuY2xhc3MgQ2FuZGlkYXRlcyB7XG4gICAgY29uc3RydWN0b3IoaGFzaCwgbW92ZUNudCwgbGlzdCkge1xuICAgICAgICB0aGlzLmhhc2ggPSBoYXNoO1xuICAgICAgICB0aGlzLm1vdmVDbnQgPSBtb3ZlQ250O1xuICAgICAgICB0aGlzLmxpc3QgPSBsaXN0O1xuICAgIH1cbn1cblxuZXhwb3J0cy5DYW5kaWRhdGVzID0gQ2FuZGlkYXRlcztcbmNsYXNzIEJvYXJkIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpcy5zdGF0ZSA9IG5ldyBVaW50OEFycmF5KF9jb25zdGFudHMuRUJWQ05UKTtcbiAgICAgICAgdGhpcy5zdGF0ZS5maWxsKF9pbnRlcnNlY3Rpb24uRVhURVJJT1IpO1xuICAgICAgICB0aGlzLmlkID0gbmV3IFVpbnQ4QXJyYXkoX2NvbnN0YW50cy5FQlZDTlQpO1xuICAgICAgICB0aGlzLm5leHQgPSBuZXcgVWludDhBcnJheShfY29uc3RhbnRzLkVCVkNOVCk7XG4gICAgICAgIHRoaXMuc2cgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBfY29uc3RhbnRzLkVCVkNOVDsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLnNnLnB1c2gobmV3IF9zdG9uZV9ncm91cC5TdG9uZUdyb3VwKCkpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucHJldlN0YXRlID0gW107XG4gICAgICAgIHRoaXMua28gPSBfY29uc3RhbnRzLlZOVUxMO1xuICAgICAgICB0aGlzLnR1cm4gPSBfaW50ZXJzZWN0aW9uLkJMQUNLO1xuICAgICAgICB0aGlzLm1vdmVDbnQgPSAwO1xuICAgICAgICB0aGlzLnByZXZNb3ZlID0gX2NvbnN0YW50cy5WTlVMTDtcbiAgICAgICAgdGhpcy5yZW1vdmVDbnQgPSAwO1xuICAgICAgICB0aGlzLmhpc3RvcnkgPSBbXTtcbiAgICAgICAgdGhpcy5jbGVhcigpO1xuICAgIH1cblxuICAgIGdldE1vdmVDbnQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm1vdmVDbnQ7XG4gICAgfVxuXG4gICAgZ2V0UHJldk1vdmUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnByZXZNb3ZlO1xuICAgIH1cblxuICAgIGdldEhpc3RvcnkoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmhpc3Rvcnk7XG4gICAgfVxuXG4gICAgY2xlYXIoKSB7XG4gICAgICAgIGZvciAobGV0IHggPSAxOyB4IDw9IF9jb25zdGFudHMuQlNJWkU7IHgrKykge1xuICAgICAgICAgICAgZm9yIChsZXQgeSA9IDE7IHkgPD0gX2NvbnN0YW50cy5CU0laRTsgeSsrKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZVsoMCwgX2Nvb3JkX2NvbnZlcnQueHkyZXYpKHgsIHkpXSA9IF9pbnRlcnNlY3Rpb24uRU1QVFk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmlkLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLmlkW2ldID0gaTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubmV4dC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdGhpcy5uZXh0W2ldID0gaTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnNnLmZvckVhY2goZSA9PiB7XG4gICAgICAgICAgICBlLmNsZWFyKGZhbHNlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMucHJldlN0YXRlID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgX2NvbnN0YW50cy5LRUVQX1BSRVZfQ05UOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMucHJldlN0YXRlLnB1c2gobmV3IFVpbnQ4QXJyYXkodGhpcy5zdGF0ZSkpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMua28gPSBfY29uc3RhbnRzLlZOVUxMO1xuICAgICAgICB0aGlzLnR1cm4gPSBfaW50ZXJzZWN0aW9uLkJMQUNLO1xuICAgICAgICB0aGlzLm1vdmVDbnQgPSAwO1xuICAgICAgICB0aGlzLnByZXZNb3ZlID0gX2NvbnN0YW50cy5WTlVMTDtcbiAgICAgICAgdGhpcy5yZW1vdmVDbnQgPSAwO1xuICAgICAgICB0aGlzLmhpc3RvcnkgPSBbXTtcbiAgICB9XG5cbiAgICBjb3B5VG8oZGVzdCkge1xuICAgICAgICBkZXN0LnN0YXRlID0gbmV3IFVpbnQ4QXJyYXkodGhpcy5zdGF0ZSk7XG4gICAgICAgIGRlc3QuaWQgPSBuZXcgVWludDhBcnJheSh0aGlzLmlkKTtcbiAgICAgICAgZGVzdC5uZXh0ID0gbmV3IFVpbnQ4QXJyYXkodGhpcy5uZXh0KTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkZXN0LnNnLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLnNnW2ldLmNvcHlUbyhkZXN0LnNnW2ldKTtcbiAgICAgICAgfVxuICAgICAgICBkZXN0LnByZXZTdGF0ZSA9IFtdO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IF9jb25zdGFudHMuS0VFUF9QUkVWX0NOVDsgaSsrKSB7XG4gICAgICAgICAgICBkZXN0LnByZXZTdGF0ZS5wdXNoKG5ldyBVaW50OEFycmF5KHRoaXMucHJldlN0YXRlW2ldKSk7XG4gICAgICAgIH1cbiAgICAgICAgZGVzdC5rbyA9IHRoaXMua287XG4gICAgICAgIGRlc3QudHVybiA9IHRoaXMudHVybjtcbiAgICAgICAgZGVzdC5tb3ZlQ250ID0gdGhpcy5tb3ZlQ250O1xuICAgICAgICBkZXN0LnJlbW92ZUNudCA9IHRoaXMucmVtb3ZlQ250O1xuICAgICAgICBkZXN0Lmhpc3RvcnkgPSBBcnJheS5mcm9tKHRoaXMuaGlzdG9yeSk7XG4gICAgfVxuXG4gICAgcGxheVNlcXVlbmNlKHNlcXVlbmNlKSB7XG4gICAgICAgIGZvciAoY29uc3QgdiBvZiBzZXF1ZW5jZSkge1xuICAgICAgICAgICAgdGhpcy5wbGF5KHYsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJlbW92ZSh2KSB7XG4gICAgICAgIGxldCB2VG1wID0gdjtcbiAgICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlQ250ICs9IDE7XG4gICAgICAgICAgICB0aGlzLnN0YXRlW3ZUbXBdID0gX2ludGVyc2VjdGlvbi5FTVBUWTtcbiAgICAgICAgICAgIHRoaXMuaWRbdlRtcF0gPSB2VG1wO1xuICAgICAgICAgICAgZm9yIChjb25zdCBudiBvZiBuZWlnaGJvcnModlRtcCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNnW3RoaXMuaWRbbnZdXS5hZGQodlRtcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCB2TmV4dCA9IHRoaXMubmV4dFt2VG1wXTtcbiAgICAgICAgICAgIHRoaXMubmV4dFt2VG1wXSA9IHZUbXA7XG4gICAgICAgICAgICB2VG1wID0gdk5leHQ7XG4gICAgICAgICAgICBpZiAodlRtcCA9PT0gdikge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgbWVyZ2UodjEsIHYyKSB7XG4gICAgICAgIGxldCBpZEJhc2UgPSB0aGlzLmlkW3YxXTtcbiAgICAgICAgbGV0IGlkQWRkID0gdGhpcy5pZFt2Ml07XG4gICAgICAgIGlmICh0aGlzLnNnW2lkQmFzZV0uZ2V0U2l6ZSgpIDwgdGhpcy5zZ1tpZEFkZF0uZ2V0U2l6ZSgpKSB7XG4gICAgICAgICAgICBsZXQgdG1wID0gaWRCYXNlO1xuICAgICAgICAgICAgaWRCYXNlID0gaWRBZGQ7XG4gICAgICAgICAgICBpZEFkZCA9IHRtcDtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuc2dbaWRCYXNlXS5tZXJnZSh0aGlzLnNnW2lkQWRkXSk7XG5cbiAgICAgICAgbGV0IHZUbXAgPSBpZEFkZDtcbiAgICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgICAgIHRoaXMuaWRbdlRtcF0gPSBpZEJhc2U7XG4gICAgICAgICAgICB2VG1wID0gdGhpcy5uZXh0W3ZUbXBdO1xuICAgICAgICAgICAgaWYgKHZUbXAgPT09IGlkQWRkKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgdG1wID0gdGhpcy5uZXh0W3YxXTtcbiAgICAgICAgdGhpcy5uZXh0W3YxXSA9IHRoaXMubmV4dFt2Ml07XG4gICAgICAgIHRoaXMubmV4dFt2Ml0gPSB0bXA7XG4gICAgfVxuXG4gICAgcGxhY2VTdG9uZSh2KSB7XG4gICAgICAgIGNvbnN0IHN0b25lQ29sb3IgPSB0aGlzLnR1cm47XG4gICAgICAgIHRoaXMuc3RhdGVbdl0gPSBzdG9uZUNvbG9yO1xuICAgICAgICB0aGlzLmlkW3ZdID0gdjtcbiAgICAgICAgdGhpcy5zZ1t0aGlzLmlkW3ZdXS5jbGVhcih0cnVlKTtcbiAgICAgICAgZm9yIChjb25zdCBudiBvZiBuZWlnaGJvcnModikpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnN0YXRlW252XSA9PT0gX2ludGVyc2VjdGlvbi5FTVBUWSkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2dbdGhpcy5pZFt2XV0uYWRkKG52KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZ1t0aGlzLmlkW252XV0uc3ViKHYpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgbnYgb2YgbmVpZ2hib3JzKHYpKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5zdGF0ZVtudl0gPT09IHN0b25lQ29sb3IgJiYgdGhpcy5pZFtudl0gIT09IHRoaXMuaWRbdl0pIHtcbiAgICAgICAgICAgICAgICB0aGlzLm1lcmdlKHYsIG52KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJlbW92ZUNudCA9IDA7XG4gICAgICAgIGNvbnN0IG9wcG9uZW50U3RvbmUgPSAoMCwgX2ludGVyc2VjdGlvbi5vcHBvbmVudE9mKSh0aGlzLnR1cm4pO1xuICAgICAgICBmb3IgKGNvbnN0IG52IG9mIG5laWdoYm9ycyh2KSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuc3RhdGVbbnZdID09PSBvcHBvbmVudFN0b25lICYmIHRoaXMuc2dbdGhpcy5pZFtudl1dLmdldExpYkNudCgpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZW1vdmUobnYpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgbGVnYWwodikge1xuICAgICAgICBpZiAodiA9PT0gX2NvbnN0YW50cy5QQVNTKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmICh2ID09PSB0aGlzLmtvIHx8IHRoaXMuc3RhdGVbdl0gIT09IF9pbnRlcnNlY3Rpb24uRU1QVFkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHN0b25lQ250ID0gWzAsIDBdO1xuICAgICAgICBjb25zdCBhdHJDbnQgPSBbMCwgMF07XG4gICAgICAgIGZvciAoY29uc3QgbnYgb2YgbmVpZ2hib3JzKHYpKSB7XG4gICAgICAgICAgICBjb25zdCBjID0gdGhpcy5zdGF0ZVtudl07XG4gICAgICAgICAgICBzd2l0Y2ggKGMpIHtcbiAgICAgICAgICAgICAgICBjYXNlIF9pbnRlcnNlY3Rpb24uRU1QVFk6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIGNhc2UgX2ludGVyc2VjdGlvbi5CTEFDSzpcbiAgICAgICAgICAgICAgICBjYXNlIF9pbnRlcnNlY3Rpb24uV0hJVEU6XG4gICAgICAgICAgICAgICAgICAgIHN0b25lQ250W2NdICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnNnW3RoaXMuaWRbbnZdXS5nZXRMaWJDbnQoKSA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXRyQ250W2NdICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYXRyQ250WygwLCBfaW50ZXJzZWN0aW9uLm9wcG9uZW50T2YpKHRoaXMudHVybildICE9PSAwIHx8IGF0ckNudFt0aGlzLnR1cm5dIDwgc3RvbmVDbnRbdGhpcy50dXJuXTtcbiAgICB9XG5cbiAgICBleWVzaGFwZSh2LCBwbCkge1xuICAgICAgICBpZiAodiA9PT0gX2NvbnN0YW50cy5QQVNTKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBudiBvZiBuZWlnaGJvcnModikpIHtcbiAgICAgICAgICAgIGNvbnN0IGMgPSB0aGlzLnN0YXRlW252XTtcbiAgICAgICAgICAgIGlmIChjID09PSBfaW50ZXJzZWN0aW9uLkVNUFRZIHx8IGMgPT09ICgwLCBfaW50ZXJzZWN0aW9uLm9wcG9uZW50T2YpKHBsKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjb25zdCBkaWFnQ250ID0gWzAsIDAsIDAsIDBdO1xuICAgICAgICBmb3IgKGNvbnN0IG52IG9mIGRpYWdvbmFscyh2KSkge1xuICAgICAgICAgICAgZGlhZ0NudFt0aGlzLnN0YXRlW252XV0gKz0gMTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB3ZWRnZUNudCA9IGRpYWdDbnRbKDAsIF9pbnRlcnNlY3Rpb24ub3Bwb25lbnRPZikocGwpXSArIChkaWFnQ250WzNdID4gMCA/IDEgOiAwKTtcbiAgICAgICAgaWYgKHdlZGdlQ250ID09PSAyKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IG52IG9mIGRpYWdvbmFscyh2KSkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnN0YXRlW252XSA9PT0gKDAsIF9pbnRlcnNlY3Rpb24ub3Bwb25lbnRPZikocGwpICYmIHRoaXMuc2dbdGhpcy5pZFtudl1dLmdldExpYkNudCgpID09PSAxICYmIHRoaXMuc2dbdGhpcy5pZFtudl1dLmdldFZBdHIoKSAhPT0gdGhpcy5rbykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHdlZGdlQ250IDwgMjtcbiAgICB9XG5cbiAgICBwbGF5KHYsIG5vdEZpbGxFeWUpIHtcbiAgICAgICAgaWYgKCF0aGlzLmxlZ2FsKHYpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5vdEZpbGxFeWUgJiYgdGhpcy5leWVzaGFwZSh2LCB0aGlzLnR1cm4pKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChsZXQgaSA9IF9jb25zdGFudHMuS0VFUF9QUkVWX0NOVCAtIDI7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgICAgICB0aGlzLnByZXZTdGF0ZVtpICsgMV0gPSB0aGlzLnByZXZTdGF0ZVtpXTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnByZXZTdGF0ZVswXSA9IG5ldyBVaW50OEFycmF5KHRoaXMuc3RhdGUpO1xuICAgICAgICBpZiAodiA9PT0gX2NvbnN0YW50cy5QQVNTKSB7XG4gICAgICAgICAgICB0aGlzLmtvID0gX2NvbnN0YW50cy5WTlVMTDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMucGxhY2VTdG9uZSh2KTtcbiAgICAgICAgICAgIGNvbnN0IGlkID0gdGhpcy5pZFt2XTtcbiAgICAgICAgICAgIHRoaXMua28gPSBfY29uc3RhbnRzLlZOVUxMO1xuICAgICAgICAgICAgaWYgKHRoaXMucmVtb3ZlQ250ID09PSAxICYmIHRoaXMuc2dbaWRdLmdldExpYkNudCgpID09PSAxICYmIHRoaXMuc2dbaWRdLmdldFNpemUoKSA9PT0gMSkge1xuICAgICAgICAgICAgICAgIHRoaXMua28gPSB0aGlzLnNnW2lkXS5nZXRWQXRyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5wcmV2TW92ZSA9IHY7XG4gICAgICAgIHRoaXMuaGlzdG9yeS5wdXNoKHYpO1xuICAgICAgICB0aGlzLnR1cm4gPSAoMCwgX2ludGVyc2VjdGlvbi5vcHBvbmVudE9mKSh0aGlzLnR1cm4pO1xuICAgICAgICB0aGlzLm1vdmVDbnQgKz0gMTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcmFuZG9tUGxheSgpIHtcbiAgICAgICAgY29uc3QgZW1wdHlMaXN0ID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5zdGF0ZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuc3RhdGVbaV0gPT09IF9pbnRlcnNlY3Rpb24uRU1QVFkpIHtcbiAgICAgICAgICAgICAgICBlbXB0eUxpc3QucHVzaChpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAoMCwgX3V0aWxzLnNodWZmbGUpKGVtcHR5TGlzdCk7XG4gICAgICAgIGZvciAoY29uc3QgdiBvZiBlbXB0eUxpc3QpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnBsYXkodiwgdHJ1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLnBsYXkoX2NvbnN0YW50cy5QQVNTLCB0cnVlKTtcbiAgICAgICAgcmV0dXJuIF9jb25zdGFudHMuUEFTUztcbiAgICB9XG5cbiAgICBzY29yZSgpIHtcbiAgICAgICAgY29uc3Qgc3RvbmVDbnQgPSBbMCwgMF07XG4gICAgICAgIGZvciAobGV0IF92ID0gMDsgX3YgPCBfY29uc3RhbnRzLkJWQ05UOyBfdisrKSB7XG4gICAgICAgICAgICBjb25zdCB2ID0gKDAsIF9jb29yZF9jb252ZXJ0LnJ2MmV2KShfdik7XG4gICAgICAgICAgICBjb25zdCBzID0gdGhpcy5zdGF0ZVt2XTtcbiAgICAgICAgICAgIGlmIChzID09PSBfaW50ZXJzZWN0aW9uLkJMQUNLIHx8IHMgPT09IF9pbnRlcnNlY3Rpb24uV0hJVEUpIHtcbiAgICAgICAgICAgICAgICBzdG9uZUNudFtzXSArPSAxO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCBuYnJDbnQgPSBbMCwgMCwgMCwgMF07XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBudiBvZiBuZWlnaGJvcnModikpIHtcbiAgICAgICAgICAgICAgICAgICAgbmJyQ250W3RoaXMuc3RhdGVbbnZdXSArPSAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobmJyQ250W19pbnRlcnNlY3Rpb24uV0hJVEVdID4gMCAmJiBuYnJDbnRbX2ludGVyc2VjdGlvbi5CTEFDS10gPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgc3RvbmVDbnRbX2ludGVyc2VjdGlvbi5XSElURV0gKz0gMTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG5ickNudFtfaW50ZXJzZWN0aW9uLkJMQUNLXSA+IDAgJiYgbmJyQ250W19pbnRlcnNlY3Rpb24uV0hJVEVdID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0b25lQ250W19pbnRlcnNlY3Rpb24uQkxBQ0tdICs9IDE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdG9uZUNudFsxXSAtIHN0b25lQ250WzBdIC0gX2NvbnN0YW50cy5LT01JO1xuICAgIH1cblxuICAgIHJvbGxvdXQoc2hvd0JvYXJkKSB7XG4gICAgICAgIHdoaWxlICh0aGlzLm1vdmVDbnQgPCBfY29uc3RhbnRzLkVCVkNOVCAqIDIpIHtcbiAgICAgICAgICAgIGNvbnN0IHByZXZNb3ZlID0gdGhpcy5wcmV2TW92ZTtcbiAgICAgICAgICAgIGNvbnN0IG1vdmUgPSB0aGlzLnJhbmRvbVBsYXkoKTtcbiAgICAgICAgICAgIGlmIChzaG93Qm9hcmQgJiYgbW92ZSAhPT0gX2NvbnN0YW50cy5QQVNTKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1xcbm1vdmUgY291bnQ9JWQnLCB0aGlzLm1vdmVDbnQpO1xuICAgICAgICAgICAgICAgIHRoaXMuc2hvd2JvYXJkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocHJldk1vdmUgPT09IF9jb25zdGFudHMuUEFTUyAmJiBtb3ZlID09PSBfY29uc3RhbnRzLlBBU1MpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHNob3dib2FyZCgpIHtcbiAgICAgICAgZnVuY3Rpb24gcHJpbnRYbGFiZWwoKSB7XG4gICAgICAgICAgICBsZXQgbGluZVN0ciA9ICcgICc7XG4gICAgICAgICAgICBmb3IgKGxldCB4ID0gMTsgeCA8PSBfY29uc3RhbnRzLkJTSVpFOyB4KyspIHtcbiAgICAgICAgICAgICAgICBsaW5lU3RyICs9IGAgJHtfY29vcmRfY29udmVydC5YX0xBQkVMU1t4XX0gYDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGxpbmVTdHIpO1xuICAgICAgICB9XG4gICAgICAgIHByaW50WGxhYmVsKCk7XG4gICAgICAgIGZvciAobGV0IHkgPSBfY29uc3RhbnRzLkJTSVpFOyB5ID4gMDsgeS0tKSB7XG4gICAgICAgICAgICBsZXQgbGluZVN0ciA9ICgnICcgKyB5LnRvU3RyaW5nKCkpLnNsaWNlKC0yKTtcbiAgICAgICAgICAgIGZvciAobGV0IHggPSAxOyB4IDw9IF9jb25zdGFudHMuQlNJWkU7IHgrKykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHYgPSAoMCwgX2Nvb3JkX2NvbnZlcnQueHkyZXYpKHgsIHkpO1xuICAgICAgICAgICAgICAgIGxldCB4U3RyO1xuICAgICAgICAgICAgICAgIHN3aXRjaCAodGhpcy5zdGF0ZVt2XSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIF9pbnRlcnNlY3Rpb24uQkxBQ0s6XG4gICAgICAgICAgICAgICAgICAgICAgICB4U3RyID0gdiA9PT0gdGhpcy5wcmV2TW92ZSA/ICdbWF0nIDogJyBYICc7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBfaW50ZXJzZWN0aW9uLldISVRFOlxuICAgICAgICAgICAgICAgICAgICAgICAgeFN0ciA9IHYgPT09IHRoaXMucHJldk1vdmUgPyAnW09dJyA6ICcgTyAnO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgX2ludGVyc2VjdGlvbi5FTVBUWTpcbiAgICAgICAgICAgICAgICAgICAgICAgIHhTdHIgPSAnIC4gJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgeFN0ciA9ICcgPyAnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBsaW5lU3RyICs9IHhTdHI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsaW5lU3RyICs9ICgnICcgKyB5LnRvU3RyaW5nKCkpLnNsaWNlKC0yKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGxpbmVTdHIpO1xuICAgICAgICB9XG4gICAgICAgIHByaW50WGxhYmVsKCk7XG4gICAgICAgIGNvbnNvbGUubG9nKCcnKTtcbiAgICB9XG5cbiAgICBmZWF0dXJlKCkge1xuICAgICAgICBmdW5jdGlvbiBpbmRleChwLCBmKSB7XG4gICAgICAgICAgICByZXR1cm4gcCAqIF9jb25zdGFudHMuRkVBVFVSRV9DTlQgKyBmO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGFycmF5ID0gbmV3IEZsb2F0MzJBcnJheShfY29uc3RhbnRzLkJWQ05UICogX2NvbnN0YW50cy5GRUFUVVJFX0NOVCk7XG5cbiAgICAgICAgY29uc3QgbXkgPSB0aGlzLnR1cm47XG4gICAgICAgIGNvbnN0IG9wcCA9ICgwLCBfaW50ZXJzZWN0aW9uLm9wcG9uZW50T2YpKHRoaXMudHVybik7XG4gICAgICAgIGZvciAobGV0IHAgPSAwOyBwIDwgX2NvbnN0YW50cy5CVkNOVDsgcCsrKSB7XG4gICAgICAgICAgICBhcnJheVtpbmRleChwLCAwKV0gPSB0aGlzLnN0YXRlWygwLCBfY29vcmRfY29udmVydC5ydjJldikocCldID09PSBteSA/IDEuMCA6IDAuMDtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCBwID0gMDsgcCA8IF9jb25zdGFudHMuQlZDTlQ7IHArKykge1xuICAgICAgICAgICAgYXJyYXlbaW5kZXgocCwgMSldID0gdGhpcy5zdGF0ZVsoMCwgX2Nvb3JkX2NvbnZlcnQucnYyZXYpKHApXSA9PT0gb3BwID8gMS4wIDogMC4wO1xuICAgICAgICB9XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgX2NvbnN0YW50cy5LRUVQX1BSRVZfQ05UOyBpKyspIHtcbiAgICAgICAgICAgIGZvciAobGV0IHAgPSAwOyBwIDwgX2NvbnN0YW50cy5CVkNOVDsgcCsrKSB7XG4gICAgICAgICAgICAgICAgYXJyYXlbaW5kZXgocCwgKGkgKyAxKSAqIDIpXSA9IHRoaXMucHJldlN0YXRlW2ldWygwLCBfY29vcmRfY29udmVydC5ydjJldikocCldID09PSBteSA/IDEuMCA6IDAuMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAobGV0IHAgPSAwOyBwIDwgX2NvbnN0YW50cy5CVkNOVDsgcCsrKSB7XG4gICAgICAgICAgICAgICAgYXJyYXlbaW5kZXgocCwgKGkgKyAxKSAqIDIgKyAxKV0gPSB0aGlzLnByZXZTdGF0ZVtpXVsoMCwgX2Nvb3JkX2NvbnZlcnQucnYyZXYpKHApXSA9PT0gb3BwID8gMS4wIDogMC4wO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZvciAobGV0IHAgPSAwOyBwIDwgX2NvbnN0YW50cy5CVkNOVDsgcCsrKSB7XG4gICAgICAgICAgICBhcnJheVtpbmRleChwLCBfY29uc3RhbnRzLkZFQVRVUkVfQ05UIC0gMSldID0gbXk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gYXJyYXk7XG4gICAgfVxuXG4gICAgaGFzaCgpIHtcbiAgICAgICAgcmV0dXJuICgwLCBfdXRpbHMuaGFzaCkoKHRoaXMuc3RhdGUudG9TdHJpbmcoKSArIHRoaXMucHJldlN0YXRlWzBdLnRvU3RyaW5nKCkgKyB0aGlzLnR1cm4udG9TdHJpbmcoKSkucmVwbGFjZSgnLCcsICcnKSk7XG4gICAgfVxuXG4gICAgY2FuZGlkYXRlcygpIHtcbiAgICAgICAgY29uc3QgY2FuZExpc3QgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgdiA9IDA7IHYgPCB0aGlzLnN0YXRlLmxlbmd0aDsgdisrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5zdGF0ZVt2XSA9PT0gX2ludGVyc2VjdGlvbi5FTVBUWSAmJiB0aGlzLmxlZ2FsKHYpICYmICF0aGlzLmV5ZXNoYXBlKHYsIHRoaXMudHVybikpIHtcbiAgICAgICAgICAgICAgICBjYW5kTGlzdC5wdXNoKCgwLCBfY29vcmRfY29udmVydC5ldjJydikodikpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNhbmRMaXN0LnB1c2goKDAsIF9jb29yZF9jb252ZXJ0LmV2MnJ2KShfY29uc3RhbnRzLlBBU1MpKTtcbiAgICAgICAgcmV0dXJuIG5ldyBDYW5kaWRhdGVzKHRoaXMuaGFzaCgpLCB0aGlzLm1vdmVDbnQsIGNhbmRMaXN0KTtcbiAgICB9XG5cbiAgICBmaW5hbFNjb3JlKCkge1xuICAgICAgICBjb25zdCBST0xMX09VVF9OVU0gPSAyNTY7XG4gICAgICAgIGNvbnN0IGRvdWJsZVNjb3JlTGlzdCA9IFtdO1xuICAgICAgICBsZXQgYkNweSA9IG5ldyBCb2FyZCgpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IFJPTExfT1VUX05VTTsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLmNvcHlUbyhiQ3B5KTtcbiAgICAgICAgICAgIGJDcHkucm9sbG91dChmYWxzZSk7XG4gICAgICAgICAgICBkb3VibGVTY29yZUxpc3QucHVzaChiQ3B5LnNjb3JlKCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAoMCwgX3V0aWxzLm1vc3RDb21tb24pKGRvdWJsZVNjb3JlTGlzdCk7XG4gICAgfVxufVxuZXhwb3J0cy5Cb2FyZCA9IEJvYXJkOyAvKlxuICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiB0ZXN0Qm9hcmQoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBiID0gbmV3IEJvYXJkKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBiLnBsYXlTZXF1ZW5jZShbJ0ExJywgJ0EyJywgJ0E5JywgJ0IxJ10ubWFwKHN0cjJldikpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgYi5zaG93Ym9hcmQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICB0ZXN0Qm9hcmQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgKi8iLCJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbi8vLyDjgrPjg5/jgafjgZnjgIJcbmNvbnN0IEtPTUkgPSBleHBvcnRzLktPTUkgPSA3LjA7XG5cbi8vLyDnooHnm6Tjga7jgrXjgqTjgrrjgafjgZnjgIJcbmNvbnN0IEJTSVpFID0gZXhwb3J0cy5CU0laRSA9IDk7XG5cbi8vLyDlpJbmnqDjgpLmjIHjgaTmi6HlvLXnooHnm6Tjga7jgrXjgqTjgrrjgafjgZnjgIJcbmNvbnN0IEVCU0laRSA9IGV4cG9ydHMuRUJTSVpFID0gQlNJWkUgKyAyO1xuXG4vLy8g56KB55uk44Gu5Lqk54K544Gu5pWw44Gn44GZ44CCXG5jb25zdCBCVkNOVCA9IGV4cG9ydHMuQlZDTlQgPSBCU0laRSAqIEJTSVpFO1xuXG4vLy8g5ouh5by156KB55uk44Gu5Lqk54K544Gu5pWw44Gn44GZ44CCXG5jb25zdCBFQlZDTlQgPSBleHBvcnRzLkVCVkNOVCA9IEVCU0laRSAqIEVCU0laRTtcblxuLy8vIOODkeOCueOCkuihqOOBmee3muW9ouW6p+aomeOBp+OBmeOAgumAmuW4uOOBruedgOaJi+OBr+aLoeW8teeigeebpOOBrue3muW9ouW6p+aomeOBp+ihqOOBl+OBvuOBmeOAglxuLy8gVE9ETyAtIOedgOaJi+OBruOBn+OCgeOBq+WIl+aMmeWei+OCkuS9nOOBo+OBn+OBu+OBhuOBjOmWouaVsOOBruOCt+OCsOODi+ODgeODo+OBr+iqreOBv+OChOOBmeOBhOOAglxuY29uc3QgUEFTUyA9IGV4cG9ydHMuUEFTUyA9IEVCVkNOVDtcblxuLy8vIOe3muW9ouW6p+aomeOBruODl+ODrOODvOOCueODm+ODq+ODgOODvOOBruacquS9v+eUqOOCkuekuuOBmeWApOOBp+OBmeOAglxuLy8gVE9ETyAtIOipsuW9k+OBmeOCi+WgtOaJgOOBq09wdGlvbjx1c2l6ZT7jgpLkvb/jgaPjgZ/jgbvjgYbjgYzplqLmlbDjga7jgrfjgrDjg4vjg4Hjg6Pjga/oqq3jgb/jgoTjgZnjgYTjgIJcbmNvbnN0IFZOVUxMID0gZXhwb3J0cy5WTlVMTCA9IEVCVkNOVCArIDE7XG5cbi8vLyBOTuOBuOOBruWFpeWKm+OBq+mWouOBmeOCi+WxpeattOOBrua3seOBleOBp+OBmeOAglxuY29uc3QgS0VFUF9QUkVWX0NOVCA9IGV4cG9ydHMuS0VFUF9QUkVWX0NOVCA9IDI7XG5cbi8vLyBOTuOBuOOBruWFpeWKm+ODleOCo+ODvOODgeODo+ODvOOBruaVsOOBp+OBmeOAglxuY29uc3QgRkVBVFVSRV9DTlQgPSBleHBvcnRzLkZFQVRVUkVfQ05UID0gS0VFUF9QUkVWX0NOVCAqIDIgKyAzOyAvLyA3IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLlhfTEFCRUxTID0gdW5kZWZpbmVkO1xuZXhwb3J0cy5tb3ZlMnh5ID0gbW92ZTJ4eTtcbmV4cG9ydHMuZXYyeHkgPSBldjJ4eTtcbmV4cG9ydHMueHkyZXYgPSB4eTJldjtcbmV4cG9ydHMucnYyZXYgPSBydjJldjtcbmV4cG9ydHMuZXYycnYgPSBldjJydjtcbmV4cG9ydHMuZXYyc3RyID0gZXYyc3RyO1xuZXhwb3J0cy5zdHIyZXYgPSBzdHIyZXY7XG5cbnZhciBfY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMuanMnKTtcblxuY29uc3QgWF9MQUJFTFMgPSBleHBvcnRzLlhfTEFCRUxTID0gJ0BBQkNERUZHSEpLTE1OT1BRUlNUJztcblxuZnVuY3Rpb24gbW92ZTJ4eShzKSB7XG4gICAgY29uc3QgT0ZGU0VUID0gJ2EnLmNoYXJDb2RlQXQoMCkgLSAxO1xuICAgIHJldHVybiBbcy5jaGFyQ29kZUF0KDApIC0gT0ZGU0VULCBfY29uc3RhbnRzLkJTSVpFICsgMSAtIChzLmNoYXJDb2RlQXQoMSkgLSBPRkZTRVQpXTtcbn1cblxuZnVuY3Rpb24gZXYyeHkoZXYpIHtcbiAgICByZXR1cm4gW2V2ICUgX2NvbnN0YW50cy5FQlNJWkUsIE1hdGguZmxvb3IoZXYgLyBfY29uc3RhbnRzLkVCU0laRSldO1xufVxuXG5mdW5jdGlvbiB4eTJldih4LCB5KSB7XG4gICAgcmV0dXJuIHkgKiBfY29uc3RhbnRzLkVCU0laRSArIHg7XG59XG5cbmZ1bmN0aW9uIHJ2MmV2KHJ2KSB7XG4gICAgcmV0dXJuIHJ2ID09PSBfY29uc3RhbnRzLkJWQ05UID8gX2NvbnN0YW50cy5QQVNTIDogcnYgJSBfY29uc3RhbnRzLkJTSVpFICsgMSArIE1hdGguZmxvb3IocnYgLyBfY29uc3RhbnRzLkJTSVpFICsgMSkgKiBfY29uc3RhbnRzLkVCU0laRTtcbn1cblxuZnVuY3Rpb24gZXYycnYoZXYpIHtcbiAgICByZXR1cm4gZXYgPT09IF9jb25zdGFudHMuUEFTUyA/IF9jb25zdGFudHMuQlZDTlQgOiBldiAlIF9jb25zdGFudHMuRUJTSVpFIC0gMSArIE1hdGguZmxvb3IoZXYgLyBfY29uc3RhbnRzLkVCU0laRSAtIDEpICogX2NvbnN0YW50cy5CU0laRTtcbn1cblxuZnVuY3Rpb24gZXYyc3RyKGV2KSB7XG4gICAgaWYgKGV2ID49IF9jb25zdGFudHMuUEFTUykge1xuICAgICAgICByZXR1cm4gJ3Bhc3MnO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IFt4LCB5XSA9IGV2Mnh5KGV2KTtcbiAgICAgICAgcmV0dXJuIFhfTEFCRUxTLmNoYXJBdCh4KSArIHkudG9TdHJpbmcoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHN0cjJldih2KSB7XG4gICAgY29uc3QgdlN0ciA9IHYudG9VcHBlckNhc2UoKTtcbiAgICBpZiAodlN0ciA9PT0gJ1BBU1MnIHx8IHZTdHIgPT09ICdSRVNJR04nKSB7XG4gICAgICAgIHJldHVybiBfY29uc3RhbnRzLlBBU1M7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgeCA9IFhfTEFCRUxTLmluZGV4T2YodlN0ci5jaGFyQXQoMCkpO1xuICAgICAgICBjb25zdCB5ID0gcGFyc2VJbnQodlN0ci5zbGljZSgxKSk7XG4gICAgICAgIHJldHVybiB4eTJldih4LCB5KTtcbiAgICB9XG59IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMub3Bwb25lbnRPZiA9IG9wcG9uZW50T2Y7XG5jb25zdCBXSElURSA9IGV4cG9ydHMuV0hJVEUgPSAwO1xuY29uc3QgQkxBQ0sgPSBleHBvcnRzLkJMQUNLID0gMTtcblxuZnVuY3Rpb24gb3Bwb25lbnRPZihjb2xvcikge1xuICAgIHN3aXRjaCAoY29sb3IpIHtcbiAgICAgICAgY2FzZSBXSElURTpcbiAgICAgICAgICAgIHJldHVybiBCTEFDSztcbiAgICAgICAgY2FzZSBCTEFDSzpcbiAgICAgICAgICAgIHJldHVybiBXSElURTtcbiAgICB9XG59XG5cbmNvbnN0IEVNUFRZID0gZXhwb3J0cy5FTVBUWSA9IDI7XG5jb25zdCBFWFRFUklPUiA9IGV4cG9ydHMuRVhURVJJT1IgPSAzOyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuLyogZ2xvYmFsIFdvcmtlclByb2NlZHVyZUNhbGwgKi9cblxuY2xhc3MgTmV1cmFsTmV0d29yayB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMucmVjZWl2ZXIgPSBuZXcgV29ya2VyUHJvY2VkdXJlQ2FsbChzZWxmLCB0aGlzLmNvbnN0cnVjdG9yLm5hbWUpO1xuICAgIH1cblxuICAgIGFzeW5jIGV2YWx1YXRlKGIpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5yZWNlaXZlci5jYWxsKCdldmFsdWF0ZScsIFtiLmZlYXR1cmUoKV0pO1xuICAgICAgICBzZWxmLlBPTkRFUl9TVE9QID0gcmVzdWx0LnBvcCgpO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbn1cbmV4cG9ydHMuTmV1cmFsTmV0d29yayA9IE5ldXJhbE5ldHdvcms7IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLlRyZWUgPSB1bmRlZmluZWQ7XG5cbnZhciBfdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG5cbnZhciBfY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMuanMnKTtcblxudmFyIF9jb29yZF9jb252ZXJ0ID0gcmVxdWlyZSgnLi9jb29yZF9jb252ZXJ0LmpzJyk7XG5cbnZhciBfYm9hcmQgPSByZXF1aXJlKCcuL2JvYXJkLmpzJyk7XG5cbmNvbnN0IE1BWF9OT0RFX0NOVCA9IDE2Mzg0O1xuY29uc3QgRVhQQU5EX0NOVCA9IDg7XG5cbmxldCBUUkVFX0NQID0gMi4wO1xuXG5mdW5jdGlvbiBwcmludFByb2IocHJvYikge1xuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgX2NvbnN0YW50cy5CU0laRTsgeSsrKSB7XG4gICAgICAgIGxldCBzdHIgPSAnJztcbiAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCBfY29uc3RhbnRzLkJTSVpFOyB4KyspIHtcbiAgICAgICAgICAgIHN0ciArPSAoJyAgJyArIHByb2JbeCArIHkgKiBfY29uc3RhbnRzLkJTSVpFXS50b0ZpeGVkKDEpKS5zbGljZSgtNSk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS5sb2coc3RyKTtcbiAgICB9XG4gICAgY29uc29sZS5sb2coJ3Bhc3M9JXMnLCBwcm9iW3Byb2IubGVuZ3RoIC0gMV0udG9GaXhlZCgxKSk7XG59XG5cbmNsYXNzIFRyZWUge1xuICAgIGNvbnN0cnVjdG9yKG5uKSB7XG4gICAgICAgIHRoaXMubWFpblRpbWUgPSAwLjA7XG4gICAgICAgIHRoaXMuYnlveW9taSA9IDEuMDtcbiAgICAgICAgdGhpcy5sZWZ0VGltZSA9IDAuMDtcbiAgICAgICAgdGhpcy5ub2RlID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgTUFYX05PREVfQ05UOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMubm9kZS5wdXNoKG5ldyBOb2RlKCkpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMubm9kZUNudCA9IDA7XG4gICAgICAgIHRoaXMucm9vdElkID0gMDtcbiAgICAgICAgdGhpcy5yb290TW92ZUNudCA9IDA7XG4gICAgICAgIHRoaXMubm9kZUhhc2hzID0gbmV3IE1hcCgpO1xuICAgICAgICB0aGlzLmV2YWxDbnQgPSAwO1xuICAgICAgICB0aGlzLm5uID0gbm47XG4gICAgfVxuXG4gICAgc2V0VGltZShtYWluVGltZSwgYnlveW9taSkge1xuICAgICAgICB0aGlzLm1haW5UaW1lID0gbWFpblRpbWU7XG4gICAgICAgIHRoaXMubGVmdFRpbWUgPSBtYWluVGltZTtcbiAgICAgICAgdGhpcy5ieW95b21pID0gYnlveW9taTtcbiAgICB9XG5cbiAgICBzZXRMZWZ0VGltZShsZWZ0VGltZSkge1xuICAgICAgICB0aGlzLmxlZnRUaW1lID0gbGVmdFRpbWU7XG4gICAgfVxuXG4gICAgY2xlYXIoKSB7XG4gICAgICAgIHRoaXMubGVmdFRpbWUgPSB0aGlzLm1haW5UaW1lO1xuICAgICAgICBmb3IgKGNvbnN0IG5kIG9mIHRoaXMubm9kZSkge1xuICAgICAgICAgICAgbmQuY2xlYXIoKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLm5vZGVDbnQgPSAwO1xuICAgICAgICB0aGlzLnJvb3RJZCA9IDA7XG4gICAgICAgIHRoaXMucm9vdE1vdmVDbnQgPSAwO1xuICAgICAgICB0aGlzLm5vZGVIYXNocy5jbGVhcigpO1xuICAgICAgICB0aGlzLmV2YWxDbnQgPSAwO1xuICAgIH1cblxuICAgIGRlbGV0ZU5vZGUoKSB7XG4gICAgICAgIGlmICh0aGlzLm5vZGVDbnQgPCBNQVhfTk9ERV9DTlQgLyAyKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBNQVhfTk9ERV9DTlQ7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgbWMgPSB0aGlzLm5vZGVbaV0ubW92ZUNudDtcbiAgICAgICAgICAgIGlmIChtYyAhPSBudWxsICYmIG1jIDwgdGhpcy5yb290TW92ZUNudCkge1xuICAgICAgICAgICAgICAgIHRoaXMubm9kZUhhc2hzLmRlbGV0ZSh0aGlzLm5vZGVbaV0uaGFzaCk7XG4gICAgICAgICAgICAgICAgdGhpcy5ub2RlW2ldLmNsZWFyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjcmVhdGVOb2RlKGIsIHByb2IpIHtcbiAgICAgICAgY29uc3QgY2FuZGlkYXRlcyA9IGIuY2FuZGlkYXRlcygpO1xuICAgICAgICBjb25zdCBocyA9IGNhbmRpZGF0ZXMuaGFzaDtcbiAgICAgICAgaWYgKHRoaXMubm9kZUhhc2hzLmhhcyhocykgJiYgdGhpcy5ub2RlW3RoaXMubm9kZUhhc2hzW2hzXV0uaGFzaCA9PT0gaHMgJiYgdGhpcy5ub2RlW3RoaXMubm9kZUhhc2hzW2hzXV0ubW92ZUNudCA9PT0gY2FuZGlkYXRlcy5tb3ZlQ250KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5ub2RlSGFzaHNbaHNdO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IG5vZGVJZCA9IGhzICUgTUFYX05PREVfQ05UO1xuXG4gICAgICAgIHdoaWxlICh0aGlzLm5vZGVbbm9kZUlkXS5tb3ZlQ250ICE9IC0xKSB7XG4gICAgICAgICAgICBub2RlSWQgPSBub2RlSWQgKyAxIDwgTUFYX05PREVfQ05UID8gbm9kZUlkICsgMSA6IDA7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLm5vZGVIYXNoc1toc10gPSBub2RlSWQ7XG4gICAgICAgIHRoaXMubm9kZUNudCArPSAxO1xuXG4gICAgICAgIGNvbnN0IG5kID0gdGhpcy5ub2RlW25vZGVJZF07XG4gICAgICAgIG5kLmNsZWFyKCk7XG4gICAgICAgIG5kLm1vdmVDbnQgPSBjYW5kaWRhdGVzLm1vdmVDbnQ7XG4gICAgICAgIG5kLmhhc2ggPSBocztcbiAgICAgICAgbmQuaW5pdEJyYW5jaCgpO1xuXG4gICAgICAgIGZvciAoY29uc3QgcnYgb2YgKDAsIF91dGlscy5hcmdzb3J0KShwcm9iLCB0cnVlKSkge1xuICAgICAgICAgICAgaWYgKGNhbmRpZGF0ZXMubGlzdC5pbmNsdWRlcyhydikpIHtcbiAgICAgICAgICAgICAgICBuZC5tb3ZlW25kLmJyYW5jaENudF0gPSAoMCwgX2Nvb3JkX2NvbnZlcnQucnYyZXYpKHJ2KTtcbiAgICAgICAgICAgICAgICBuZC5wcm9iW25kLmJyYW5jaENudF0gPSBwcm9iW3J2XTtcbiAgICAgICAgICAgICAgICBuZC5icmFuY2hDbnQgKz0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbm9kZUlkO1xuICAgIH1cblxuICAgIGJlc3RCeUFjdGlvblZhbHVlKGIsIG5vZGVJZCkge1xuICAgICAgICBjb25zdCBuZCA9IHRoaXMubm9kZVtub2RlSWRdO1xuICAgICAgICBjb25zdCBuZFJhdGUgPSBuZC50b3RhbENudCA9PT0gMCA/IDAuMCA6IG5kLnRvdGFsVmFsdWUgLyBuZC50b3RhbENudDtcbiAgICAgICAgY29uc3QgY3BzdiA9IFRSRUVfQ1AgKiBNYXRoLnNxcnQobmQudG90YWxDbnQpO1xuICAgICAgICBjb25zdCByYXRlID0gbmV3IEZsb2F0MzJBcnJheShfY29uc3RhbnRzLkJWQ05UICsgMSk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcmF0ZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgcmF0ZVtpXSA9IG5kLnZpc2l0Q250W2ldID09PSAwID8gbmRSYXRlIDogbmQudmFsdWVXaW5baV0gLyBuZC52aXNpdENudFtpXTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBhY3Rpb25WYWx1ZSA9IG5ldyBGbG9hdDMyQXJyYXkobmQuYnJhbmNoQ250KTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhY3Rpb25WYWx1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYWN0aW9uVmFsdWVbaV0gPSByYXRlW2ldICsgY3BzdiAqIG5kLnByb2JbaV0gLyAobmQudmlzaXRDbnRbaV0gKyAxKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBiZXN0ID0gKDAsIF91dGlscy5hcmdtYXgpKGFjdGlvblZhbHVlKTtcbiAgICAgICAgY29uc3QgbmV4dElkID0gbmQubmV4dElkW2Jlc3RdO1xuICAgICAgICBjb25zdCBuZXh0TW92ZSA9IG5kLm1vdmVbYmVzdF07XG4gICAgICAgIGNvbnN0IGlzSGVhZE5vZGUgPSAhdGhpcy5oYXNOZXh0KG5vZGVJZCwgYmVzdCwgYi5nZXRNb3ZlQ250KCkgKyAxKSB8fCBuZC52aXNpdENudFtiZXN0XSA8IEVYUEFORF9DTlQgfHwgYi5nZXRNb3ZlQ250KCkgPiBfY29uc3RhbnRzLkJWQ05UICogMiB8fCBuZXh0TW92ZSA9PT0gX2NvbnN0YW50cy5QQVNTICYmIGIuZ2V0UHJldk1vdmUoKSA9PT0gX2NvbnN0YW50cy5QQVNTO1xuICAgICAgICByZXR1cm4gW2Jlc3QsIG5leHRJZCwgbmV4dE1vdmUsIGlzSGVhZE5vZGVdO1xuICAgIH1cblxuICAgIHNob3VsZFNlYXJjaChiZXN0LCBzZWNvbmQpIHtcbiAgICAgICAgY29uc3QgbmQgPSB0aGlzLm5vZGVbdGhpcy5yb290SWRdO1xuICAgICAgICBjb25zdCB3aW5SYXRlID0gdGhpcy5icmFuY2hSYXRlKG5kLCBiZXN0KTtcblxuICAgICAgICByZXR1cm4gbmQudG90YWxDbnQgPD0gNTAwMCB8fCBuZC52aXNpdENudFtiZXN0XSA8PSBuZC52aXNpdENudFtzZWNvbmRdICogMTAwICYmIHdpblJhdGUgPj0gMC4xICYmIHdpblJhdGUgPD0gMC45O1xuICAgIH1cblxuICAgIGdldFNlYXJjaFRpbWUoKSB7XG4gICAgICAgIGlmICh0aGlzLm1haW5UaW1lID09PSAwLjAgfHwgdGhpcy5sZWZ0VGltZSA8IHNlbGYuYnlveW9taSAqIDIuMCkge1xuICAgICAgICAgICAgcmV0dXJuIE1hdGgubWF4KHRoaXMuYnlveW9taSwgMS4wKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxlZnRUaW1lIC8gKDU1LjAgKyBNYXRoLm1heCg1MCAtIHRoaXMucm9vdE1vdmVDbnQsIDApKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGhhc05leHQobm9kZUlkLCBicklkLCBtb3ZlQ250KSB7XG4gICAgICAgIGNvbnN0IG5kID0gdGhpcy5ub2RlW25vZGVJZF07XG4gICAgICAgIGNvbnN0IG5leHRJZCA9IG5kLm5leHRJZFticklkXTtcbiAgICAgICAgcmV0dXJuIG5leHRJZCA+PSAwICYmIG5kLm5leHRIYXNoW2JySWRdID09PSB0aGlzLm5vZGVbbmV4dElkXS5oYXNoICYmIHRoaXMubm9kZVtuZXh0SWRdLm1vdmVDbnQgPT09IG1vdmVDbnQ7XG4gICAgfVxuXG4gICAgYnJhbmNoUmF0ZShuZCwgaWQpIHtcbiAgICAgICAgcmV0dXJuIG5kLnZhbHVlV2luW2lkXSAvIE1hdGgubWF4KG5kLnZpc2l0Q250W2lkXSwgMSkgLyAyLjAgKyAwLjU7XG4gICAgfVxuXG4gICAgYmVzdFNlcXVlbmNlKG5vZGVJZCwgaGVhZE1vdmUpIHtcbiAgICAgICAgbGV0IHNlcVN0ciA9ICgnICAgJyArICgwLCBfY29vcmRfY29udmVydC5ldjJzdHIpKGhlYWRNb3ZlKSkuc2xpY2UoLTUpO1xuICAgICAgICBsZXQgbmV4dE1vdmUgPSBoZWFkTW92ZTtcblxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDc7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgbmQgPSB0aGlzLm5vZGVbbm9kZUlkXTtcbiAgICAgICAgICAgIGlmIChuZXh0TW92ZSA9PT0gX2NvbnN0YW50cy5QQVNTIHx8IG5kLmJyYW5jaENudCA8IDEpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgYmVzdCA9ICgwLCBfdXRpbHMuYXJnbWF4KShuZC52aXNpdENudC5zbGljZSgwLCBuZC5icmFuY2hDbnQpKTtcbiAgICAgICAgICAgIGlmIChuZC52aXNpdENudFtiZXN0XSA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbmV4dE1vdmUgPSBuZC5tb3ZlW2Jlc3RdO1xuICAgICAgICAgICAgc2VxU3RyICs9ICctPicgKyAoJyAgICcgKyAoMCwgX2Nvb3JkX2NvbnZlcnQuZXYyc3RyKShuZXh0TW92ZSkpLnNsaWNlKC01KTtcblxuICAgICAgICAgICAgaWYgKCF0aGlzLmhhc05leHQobm9kZUlkLCBiZXN0LCBuZC5tb3ZlQ250ICsgMSkpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5vZGVJZCA9IG5kLm5leHRJZFtiZXN0XTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBzZXFTdHI7XG4gICAgfVxuXG4gICAgcHJpbnRJbmZvKG5vZGVJZCkge1xuICAgICAgICBjb25zdCBuZCA9IHRoaXMubm9kZVtub2RlSWRdO1xuICAgICAgICBjb25zdCBvcmRlciA9ICgwLCBfdXRpbHMuYXJnc29ydCkobmQudmlzaXRDbnQuc2xpY2UoMCwgbmQuYnJhbmNoQ250KSwgdHJ1ZSk7XG4gICAgICAgIGNvbnNvbGUubG9nKCd8bW92ZXxjb3VudCAgfHJhdGUgfHZhbHVlfHByb2IgfCBiZXN0IHNlcXVlbmNlJyk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgTWF0aC5taW4ob3JkZXIubGVuZ3RoLCA5KTsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBtID0gb3JkZXJbaV07XG4gICAgICAgICAgICBjb25zdCB2aXNpdENudCA9IG5kLnZpc2l0Q250W21dO1xuICAgICAgICAgICAgaWYgKHZpc2l0Q250ID09PSAwKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHJhdGUgPSB2aXNpdENudCA9PT0gMCA/IDAuMCA6IHRoaXMuYnJhbmNoUmF0ZShuZCwgbSkgKiAxMDAuMDtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gKG5kLnZhbHVlW21dIC8gMi4wICsgMC41KSAqIDEwMC4wO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3wlc3wlc3wlc3wlc3wlc3wgJXMnLCAoJyAgICcgKyAoMCwgX2Nvb3JkX2NvbnZlcnQuZXYyc3RyKShuZC5tb3ZlW21dKSkuc2xpY2UoLTQpLCAodmlzaXRDbnQgKyAnICAgICAgJykuc2xpY2UoMCwgNyksICgnICAnICsgcmF0ZS50b0ZpeGVkKDEpKS5zbGljZSgtNSksICgnICAnICsgdmFsdWUudG9GaXhlZCgxKSkuc2xpY2UoLTUpLCAoJyAgJyArIChuZC5wcm9iW21dICogMTAwLjApLnRvRml4ZWQoMSkpLnNsaWNlKC01KSwgdGhpcy5iZXN0U2VxdWVuY2UobmQubmV4dElkW21dLCBuZC5tb3ZlW21dKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyBwcmVTZWFyY2goYikge1xuICAgICAgICBjb25zdCBbcHJvYl0gPSBhd2FpdCB0aGlzLm5uLmV2YWx1YXRlKGIpO1xuICAgICAgICB0aGlzLnJvb3RJZCA9IHRoaXMuY3JlYXRlTm9kZShiLCBwcm9iKTtcbiAgICAgICAgdGhpcy5yb290TW92ZUNudCA9IGIuZ2V0TW92ZUNudCgpO1xuICAgICAgICBUUkVFX0NQID0gdGhpcy5yb290TW92ZUNudCA8IDggPyAwLjAxIDogMS41O1xuICAgIH1cblxuICAgIGFzeW5jIGV2YWx1YXRlQ2hpbGROb2RlKGIsIG5vZGVJZCwgY2hpbGQpIHtcbiAgICAgICAgbGV0IFtwcm9iLCB2YWx1ZV0gPSBhd2FpdCB0aGlzLm5uLmV2YWx1YXRlKGIpO1xuICAgICAgICB0aGlzLmV2YWxDbnQgKz0gMTtcbiAgICAgICAgdmFsdWUgPSAtdmFsdWVbMF07XG4gICAgICAgIGNvbnN0IG5kID0gdGhpcy5ub2RlW25vZGVJZF07XG4gICAgICAgIG5kLnZhbHVlW2NoaWxkXSA9IHZhbHVlO1xuICAgICAgICBuZC5ldmFsdWF0ZWRbY2hpbGRdID0gdHJ1ZTtcbiAgICAgICAgaWYgKHRoaXMubm9kZUNudCA+IDAuODUgKiBNQVhfTk9ERV9DTlQpIHtcbiAgICAgICAgICAgIHRoaXMuZGVsZXRlTm9kZSgpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG5leHRJZCA9IHRoaXMuY3JlYXRlTm9kZShiLCBwcm9iKTtcbiAgICAgICAgbmQubmV4dElkW2NoaWxkXSA9IG5leHRJZDtcbiAgICAgICAgbmQubmV4dEhhc2hbY2hpbGRdID0gYi5oYXNoKCk7XG4gICAgICAgIG5kLnRvdGFsVmFsdWUgLT0gbmQudmFsdWVXaW5bY2hpbGRdO1xuICAgICAgICBuZC50b3RhbENudCArPSBuZC52aXNpdENudFtjaGlsZF07XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG5cbiAgICBhc3luYyBzZWFyY2hCcmFuY2goYiwgbm9kZUlkLCByb3V0ZSkge1xuICAgICAgICBjb25zdCBbYmVzdCwgbmV4dElkLCBuZXh0TW92ZSwgaXNIZWFkTm9kZV0gPSB0aGlzLmJlc3RCeUFjdGlvblZhbHVlKGIsIG5vZGVJZCk7XG4gICAgICAgIHJvdXRlLnB1c2goW25vZGVJZCwgYmVzdF0pO1xuICAgICAgICBiLnBsYXkobmV4dE1vdmUsIGZhbHNlKTtcbiAgICAgICAgY29uc3QgbmQgPSB0aGlzLm5vZGVbbm9kZUlkXTtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBpc0hlYWROb2RlID8gbmQuZXZhbHVhdGVkW2Jlc3RdID8gbmQudmFsdWVbYmVzdF0gOiBhd2FpdCB0aGlzLmV2YWx1YXRlQ2hpbGROb2RlKGIsIG5vZGVJZCwgYmVzdCkgOiAtKGF3YWl0IHRoaXMuc2VhcmNoQnJhbmNoKGIsIG5leHRJZCwgcm91dGUpKTtcbiAgICAgICAgbmQudG90YWxWYWx1ZSArPSB2YWx1ZTtcbiAgICAgICAgbmQudG90YWxDbnQgKz0gMTtcbiAgICAgICAgbmQudmFsdWVXaW5bYmVzdF0gKz0gdmFsdWU7XG4gICAgICAgIG5kLnZpc2l0Q250W2Jlc3RdICs9IDE7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG5cbiAgICBhc3luYyBrZWVwUGxheW91dChiLCBleGl0Q29uZGl0aW9uKSB7XG4gICAgICAgIGxldCBzZWFyY2hJZHggPSAxO1xuICAgICAgICB0aGlzLmV2YWxDbnQgPSAwO1xuICAgICAgICBsZXQgYkNweSA9IG5ldyBfYm9hcmQuQm9hcmQoKTtcbiAgICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgICAgIGIuY29weVRvKGJDcHkpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zZWFyY2hCcmFuY2goYkNweSwgdGhpcy5yb290SWQsIFtdKTtcbiAgICAgICAgICAgIHNlYXJjaElkeCArPSAxO1xuICAgICAgICAgICAgaWYgKHNlYXJjaElkeCAlIDY0ID09PSAwICYmIGV4aXRDb25kaXRpb24oc2VhcmNoSWR4KSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgYXN5bmMgX3NlYXJjaChiLCBwb25kZXIsIGNsZWFuLCBleGl0Q29uZGl0aW9uKSB7XG4gICAgICAgIGxldCBbYmVzdCwgc2Vjb25kXSA9IHRoaXMubm9kZVt0aGlzLnJvb3RJZF0uYmVzdDIoKTtcbiAgICAgICAgaWYgKHBvbmRlciB8fCB0aGlzLnNob3VsZFNlYXJjaChiZXN0LCBzZWNvbmQpKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmtlZXBQbGF5b3V0KGIsIGV4aXRDb25kaXRpb24pO1xuICAgICAgICAgICAgY29uc3QgYmVzdDIgPSB0aGlzLm5vZGVbdGhpcy5yb290SWRdLmJlc3QyKCk7XG4gICAgICAgICAgICBiZXN0ID0gYmVzdDJbMF07XG4gICAgICAgICAgICBzZWNvbmQgPSBiZXN0MlsxXTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG5kID0gdGhpcy5ub2RlW3RoaXMucm9vdElkXTtcbiAgICAgICAgbGV0IG5leHRNb3ZlID0gbmQubW92ZVtiZXN0XTtcbiAgICAgICAgbGV0IHdpblJhdGUgPSB0aGlzLmJyYW5jaFJhdGUobmQsIGJlc3QpO1xuXG4gICAgICAgIGlmIChjbGVhbiAmJiBuZXh0TW92ZSA9PT0gX2NvbnN0YW50cy5QQVNTICYmIG5kLnZhbHVlV2luW2Jlc3RdICogbmQudmFsdWVXaW5bc2Vjb25kXSA+IDAuMCkge1xuICAgICAgICAgICAgbmV4dE1vdmUgPSBuZC5tb3ZlW3NlY29uZF07XG4gICAgICAgICAgICB3aW5SYXRlID0gdGhpcy5icmFuY2hSYXRlKG5kLCBzZWNvbmQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBbbmV4dE1vdmUsIHdpblJhdGVdO1xuICAgIH1cblxuICAgIGFzeW5jIHNlYXJjaChiLCB0aW1lLCBwb25kZXIsIGNsZWFuKSB7XG4gICAgICAgIGNvbnN0IHN0YXJ0ID0gRGF0ZS5ub3coKTtcbiAgICAgICAgYXdhaXQgdGhpcy5wcmVTZWFyY2goYik7XG5cbiAgICAgICAgaWYgKHRoaXMubm9kZVt0aGlzLnJvb3RJZF0uYnJhbmNoQ250IDw9IDEpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdcXG5tb3ZlIGNvdW50PSVkOicsIHRoaXMucm9vdE1vdmVDbnQgKyAxKTtcbiAgICAgICAgICAgIHRoaXMucHJpbnRJbmZvKHRoaXMucm9vdElkKTtcbiAgICAgICAgICAgIHJldHVybiBbX2NvbnN0YW50cy5QQVNTLCAwLjVdO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5kZWxldGVOb2RlKCk7XG5cbiAgICAgICAgY29uc3QgdGltZV8gPSAodGltZSA9PT0gMC4wID8gdGhpcy5nZXRTZWFyY2hUaW1lKCkgOiB0aW1lKSAqIDEwMDA7XG4gICAgICAgIGlmIChwb25kZXIpIHtcbiAgICAgICAgICAgIHNlbGYuUE9OREVSX1NUT1AgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBbbmV4dE1vdmUsIHdpblJhdGVdID0gYXdhaXQgdGhpcy5fc2VhcmNoKGIsIHBvbmRlciwgY2xlYW4sIHBvbmRlciA/IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChzZWxmLlBPTkRFUl9TVE9QKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3dvcmtlciBwb25kZXIgc3RvcCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHNlbGYuUE9OREVSX1NUT1A7XG4gICAgICAgIH0gOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gRGF0ZS5ub3coKSAtIHN0YXJ0ID4gdGltZV87XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICghcG9uZGVyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnXFxubW92ZSBjb3VudD0lZDogbGVmdCB0aW1lPSVzW3NlY10gZXZhbHVhdGVkPSVkJywgdGhpcy5yb290TW92ZUNudCArIDEsIE1hdGgubWF4KHRoaXMubGVmdFRpbWUgLSB0aW1lLCAwLjApLnRvRml4ZWQoMSksIHRoaXMuZXZhbENudCk7XG4gICAgICAgICAgICB0aGlzLnByaW50SW5mbyh0aGlzLnJvb3RJZCk7XG4gICAgICAgICAgICB0aGlzLmxlZnRUaW1lID0gdGhpcy5sZWZ0VGltZSAtIChEYXRlLm5vdygpIC0gc3RhcnQpIC8gMTAwMDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBbbmV4dE1vdmUsIHdpblJhdGVdO1xuICAgIH1cbn1cblxuZXhwb3J0cy5UcmVlID0gVHJlZTtcbmNsYXNzIE5vZGUge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLm1vdmUgPSBuZXcgVWludDhBcnJheShfY29uc3RhbnRzLkJWQ05UICsgMSk7XG4gICAgICAgIHRoaXMucHJvYiA9IG5ldyBGbG9hdDMyQXJyYXkoX2NvbnN0YW50cy5CVkNOVCArIDEpO1xuICAgICAgICB0aGlzLnZhbHVlID0gbmV3IEZsb2F0MzJBcnJheShfY29uc3RhbnRzLkJWQ05UICsgMSk7XG4gICAgICAgIHRoaXMudmFsdWVXaW4gPSBuZXcgRmxvYXQzMkFycmF5KF9jb25zdGFudHMuQlZDTlQgKyAxKTtcbiAgICAgICAgdGhpcy52aXNpdENudCA9IG5ldyBVaW50MzJBcnJheShfY29uc3RhbnRzLkJWQ05UICsgMSk7XG4gICAgICAgIHRoaXMubmV4dElkID0gbmV3IEludDE2QXJyYXkoX2NvbnN0YW50cy5CVkNOVCArIDEpO1xuICAgICAgICB0aGlzLm5leHRIYXNoID0gbmV3IFVpbnQzMkFycmF5KF9jb25zdGFudHMuQlZDTlQgKyAxKTtcbiAgICAgICAgdGhpcy5ldmFsdWF0ZWQgPSBbXTtcbiAgICAgICAgdGhpcy5icmFuY2hDbnQgPSAwO1xuICAgICAgICB0aGlzLnRvdGFsVmFsdWUgPSAwLjA7XG4gICAgICAgIHRoaXMudG90YWxDbnQgPSAwO1xuICAgICAgICB0aGlzLmhhc2ggPSAwO1xuICAgICAgICB0aGlzLm1vdmVDbnQgPSAtMTtcbiAgICAgICAgdGhpcy5pbml0QnJhbmNoKCk7XG4gICAgICAgIHRoaXMuY2xlYXIoKTtcbiAgICB9XG5cbiAgICBpbml0QnJhbmNoKCkge1xuICAgICAgICB0aGlzLm1vdmUuZmlsbChfY29uc3RhbnRzLlZOVUxMKTtcbiAgICAgICAgdGhpcy5wcm9iLmZpbGwoMC4wKTtcbiAgICAgICAgdGhpcy52YWx1ZS5maWxsKDAuMCk7XG4gICAgICAgIHRoaXMudmFsdWVXaW4uZmlsbCgwLjApO1xuICAgICAgICB0aGlzLnZpc2l0Q250LmZpbGwoMCk7XG4gICAgICAgIHRoaXMubmV4dElkLmZpbGwoLTEpO1xuICAgICAgICB0aGlzLm5leHRIYXNoLmZpbGwoMCk7XG4gICAgICAgIHRoaXMuZXZhbHVhdGVkID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgX2NvbnN0YW50cy5CVkNOVCArIDE7IGkrKykge1xuICAgICAgICAgICAgdGhpcy5ldmFsdWF0ZWQucHVzaChmYWxzZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjbGVhcigpIHtcbiAgICAgICAgdGhpcy5icmFuY2hDbnQgPSAwO1xuICAgICAgICB0aGlzLnRvdGFsVmFsdWUgPSAwLjA7XG4gICAgICAgIHRoaXMudG90YWxDbnQgPSAwO1xuICAgICAgICB0aGlzLmhhc2ggPSAwO1xuICAgICAgICB0aGlzLm1vdmVDbnQgPSAtMTtcbiAgICB9XG5cbiAgICBiZXN0MigpIHtcbiAgICAgICAgY29uc3Qgb3JkZXIgPSAoMCwgX3V0aWxzLmFyZ3NvcnQpKHRoaXMudmlzaXRDbnQuc2xpY2UoMCwgdGhpcy5icmFuY2hDbnQpLCB0cnVlKTtcbiAgICAgICAgcmV0dXJuIG9yZGVyLnNsaWNlKDAsIDIpO1xuICAgIH1cbn0iLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuU3RvbmVHcm91cCA9IHVuZGVmaW5lZDtcblxudmFyIF9jb25zdGFudHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cy5qcycpO1xuXG5jbGFzcyBTdG9uZUdyb3VwIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpcy5saWJDbnQgPSBfY29uc3RhbnRzLlZOVUxMO1xuICAgICAgICB0aGlzLnNpemUgPSBfY29uc3RhbnRzLlZOVUxMO1xuICAgICAgICB0aGlzLnZBdHIgPSBfY29uc3RhbnRzLlZOVUxMO1xuICAgICAgICB0aGlzLmxpYnMgPSBuZXcgU2V0KCk7XG4gICAgfVxuXG4gICAgZ2V0U2l6ZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2l6ZTtcbiAgICB9XG5cbiAgICBnZXRMaWJDbnQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmxpYkNudDtcbiAgICB9XG5cbiAgICBnZXRWQXRyKCkge1xuICAgICAgICByZXR1cm4gdGhpcy52QXRyO1xuICAgIH1cblxuICAgIGNsZWFyKHN0b25lKSB7XG4gICAgICAgIHRoaXMubGliQ250ID0gc3RvbmUgPyAwIDogX2NvbnN0YW50cy5WTlVMTDtcbiAgICAgICAgdGhpcy5zaXplID0gc3RvbmUgPyAxIDogX2NvbnN0YW50cy5WTlVMTDtcbiAgICAgICAgdGhpcy52QXRyID0gX2NvbnN0YW50cy5WTlVMTDtcbiAgICAgICAgdGhpcy5saWJzLmNsZWFyKCk7XG4gICAgfVxuXG4gICAgYWRkKHYpIHtcbiAgICAgICAgaWYgKHRoaXMubGlicy5oYXModikpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmxpYnMuYWRkKHYpO1xuICAgICAgICB0aGlzLmxpYkNudCArPSAxO1xuICAgICAgICB0aGlzLnZBdHIgPSB2O1xuICAgIH1cblxuICAgIHN1Yih2KSB7XG4gICAgICAgIGlmICghdGhpcy5saWJzLmhhcyh2KSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMubGlicy5kZWxldGUodik7XG4gICAgICAgIHRoaXMubGliQ250IC09IDE7XG4gICAgfVxuXG4gICAgbWVyZ2Uob3RoZXIpIHtcbiAgICAgICAgdGhpcy5saWJzID0gbmV3IFNldChbLi4udGhpcy5saWJzLCAuLi5vdGhlci5saWJzXSk7XG4gICAgICAgIHRoaXMubGliQ250ID0gdGhpcy5saWJzLnNpemU7XG4gICAgICAgIHRoaXMuc2l6ZSArPSBvdGhlci5zaXplO1xuICAgICAgICBpZiAodGhpcy5saWJDbnQgPT09IDEpIHtcbiAgICAgICAgICAgIHNlbGYudkF0ciA9IHRoaXMubGlic1swXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNvcHlUbyhkZXN0KSB7XG4gICAgICAgIGRlc3QubGliQ250ID0gdGhpcy5saWJDbnQ7XG4gICAgICAgIGRlc3Quc2l6ZSA9IHRoaXMuc2l6ZTtcbiAgICAgICAgZGVzdC52QXRyID0gdGhpcy52QXRyO1xuICAgICAgICBkZXN0LmxpYnMgPSBuZXcgU2V0KHRoaXMubGlicyk7XG4gICAgfVxufVxuZXhwb3J0cy5TdG9uZUdyb3VwID0gU3RvbmVHcm91cDsiLCJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5zaHVmZmxlID0gc2h1ZmZsZTtcbmV4cG9ydHMubW9zdENvbW1vbiA9IG1vc3RDb21tb247XG5leHBvcnRzLmFyZ3NvcnQgPSBhcmdzb3J0O1xuZXhwb3J0cy5hcmdtYXggPSBhcmdtYXg7XG5leHBvcnRzLmhhc2ggPSBoYXNoO1xuZnVuY3Rpb24gc2h1ZmZsZShhcnJheSkge1xuICAgIGxldCBuID0gYXJyYXkubGVuZ3RoO1xuICAgIGxldCB0O1xuICAgIGxldCBpO1xuXG4gICAgd2hpbGUgKG4pIHtcbiAgICAgICAgaSA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIG4tLSk7XG4gICAgICAgIHQgPSBhcnJheVtuXTtcbiAgICAgICAgYXJyYXlbbl0gPSBhcnJheVtpXTtcbiAgICAgICAgYXJyYXlbaV0gPSB0O1xuICAgIH1cblxuICAgIHJldHVybiBhcnJheTtcbn1cblxuZnVuY3Rpb24gbW9zdENvbW1vbihhcnJheSkge1xuICAgIGNvbnN0IG1hcCA9IG5ldyBNYXAoKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGUgPSBhcnJheVtpXTtcbiAgICAgICAgaWYgKG1hcC5oYXMoZSkpIHtcbiAgICAgICAgICAgIG1hcC5zZXQoZSwgbWFwLmdldChlKSArIDEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbWFwLnNldChlLCAxKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBsZXQgbWF4S2V5O1xuICAgIGxldCBtYXhWYWx1ZSA9IC0xO1xuICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIG1hcC5lbnRyaWVzKCkpIHtcbiAgICAgICAgaWYgKHZhbHVlID4gbWF4VmFsdWUpIHtcbiAgICAgICAgICAgIG1heEtleSA9IGtleTtcbiAgICAgICAgICAgIG1heFZhbHVlID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG1heEtleTtcbn1cblxuZnVuY3Rpb24gYXJnc29ydChhcnJheSwgcmV2ZXJzZSkge1xuICAgIGNvbnN0IGVuID0gQXJyYXkuZnJvbShhcnJheSkubWFwKChlLCBpKSA9PiBbaSwgZV0pO1xuICAgIGVuLnNvcnQoKGEsIGIpID0+IHJldmVyc2UgPyBiWzFdIC0gYVsxXSA6IGFbMV0gLSBiWzFdKTtcbiAgICByZXR1cm4gZW4ubWFwKGUgPT4gZVswXSk7XG59XG5cbmZ1bmN0aW9uIGFyZ21heChhcnJheSkge1xuICAgIGxldCBtYXhJbmRleDtcbiAgICBsZXQgbWF4VmFsdWUgPSAtSW5maW5pdHk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCB2ID0gYXJyYXlbaV07XG4gICAgICAgIGlmICh2ID4gbWF4VmFsdWUpIHtcbiAgICAgICAgICAgIG1heEluZGV4ID0gaTtcbiAgICAgICAgICAgIG1heFZhbHVlID0gdjtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbWF4SW5kZXg7XG59XG5cbmZ1bmN0aW9uIGhhc2goc3RyKSB7XG4gICAgbGV0IGhhc2ggPSA1MzgxO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGNoYXIgPSBzdHIuY2hhckNvZGVBdChpKTtcbiAgICAgICAgaGFzaCA9IChoYXNoIDw8IDUpICsgaGFzaCArIGNoYXI7IC8qIGhhc2ggKiAzMyArIGMgKi9cbiAgICAgICAgaGFzaCA9IGhhc2ggJiBoYXNoOyAvLyBDb252ZXJ0IHRvIDMyYml0IGludGVnZXJcbiAgICB9XG4gICAgcmV0dXJuIE1hdGguYWJzKGhhc2gpO1xufSIsIid1c2Ugc3RyaWN0JztcblxudmFyIF9uZXVyYWxfbmV0d29ya19jbGllbnQgPSByZXF1aXJlKCcuL25ldXJhbF9uZXR3b3JrX2NsaWVudC5qcycpO1xuXG52YXIgX2Nvb3JkX2NvbnZlcnQgPSByZXF1aXJlKCcuL2Nvb3JkX2NvbnZlcnQuanMnKTtcblxudmFyIF9jb25zdGFudHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cy5qcycpO1xuXG52YXIgX2ludGVyc2VjdGlvbiA9IHJlcXVpcmUoJy4vaW50ZXJzZWN0aW9uLmpzJyk7XG5cbnZhciBfYm9hcmQgPSByZXF1aXJlKCcuL2JvYXJkLmpzJyk7XG5cbnZhciBfc2VhcmNoID0gcmVxdWlyZSgnLi9zZWFyY2guanMnKTtcblxuLyogZ2xvYmFsICQgSkdPIEJvYXJkQ29udHJvbGxlciBhZGRQcm9jZWR1cmVMaXN0ZW5lciAqL1xuc2VsZi5pbXBvcnRTY3JpcHRzKCd3b3JrZXItcHJvY2VkdXJlLWNhbGwuanMnKTtcblxuY2xhc3MgQTlFbmdpbmUge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLmIgPSBuZXcgX2JvYXJkLkJvYXJkKCk7XG4gICAgICAgIHRoaXMudHJlZSA9IG5ldyBfc2VhcmNoLlRyZWUobm4pO1xuICAgICAgICBhZGRQcm9jZWR1cmVMaXN0ZW5lcihzZWxmLCB0aGlzKTtcbiAgICB9XG5cbiAgICBjbGVhcigpIHtcbiAgICAgICAgdGhpcy5iLmNsZWFyKCk7XG4gICAgICAgIHRoaXMudHJlZS5jbGVhcigpO1xuICAgIH1cblxuICAgIHRpbWVTZXR0aW5ncyhtYWluVGltZSwgYnlveW9taSkge1xuICAgICAgICB0aGlzLnRyZWUuc2V0VGltZShtYWluVGltZSwgYnlveW9taSk7XG4gICAgfVxuXG4gICAgYXN5bmMgZ2VubW92ZSgpIHtcbiAgICAgICAgY29uc3QgW21vdmUsIHdpblJhdGVdID0gYXdhaXQgdGhpcy5iZXN0TW92ZSgpO1xuICAgICAgICBpZiAod2luUmF0ZSA8IDAuMSkge1xuICAgICAgICAgICAgcmV0dXJuICdyZXNpZ24nO1xuICAgICAgICB9IGVsc2UgaWYgKG1vdmUgPT09IF9jb25zdGFudHMuUEFTUyB8fCB0aGlzLmIuc3RhdGVbbW92ZV0gPT09IF9pbnRlcnNlY3Rpb24uRU1QVFkpIHtcbiAgICAgICAgICAgIHRoaXMuYi5wbGF5KG1vdmUsIHRydWUpO1xuICAgICAgICAgICAgcmV0dXJuICgwLCBfY29vcmRfY29udmVydC5ldjJzdHIpKG1vdmUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2Vycm9yJyk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnJWQoJXMpIGlzIG5vdCBlbXB0eScsIG1vdmUsICgwLCBfY29vcmRfY29udmVydC5ldjJzdHIpKG1vdmUpKTtcbiAgICAgICAgICAgIHRoaXMuYi5zaG93Ym9hcmQoKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHRoaXMuYi5jYW5kaWRhdGVzKCkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcGxheShldikge1xuICAgICAgICB0aGlzLmIucGxheShldiwgZmFsc2UpO1xuICAgIH1cblxuICAgIGFzeW5jIGJlc3RNb3ZlKCkge1xuICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy50cmVlLnNlYXJjaCh0aGlzLmIsIDAuMCwgZmFsc2UsIGZhbHNlKTtcbiAgICB9XG5cbiAgICBmaW5hbFNjb3JlKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5iLmZpbmFsU2NvcmUoKTtcbiAgICB9XG5cbiAgICBhc3luYyBwb25kZXIoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCd3b3JrZXIgcG9uZGVyJyk7XG4gICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnRyZWUuc2VhcmNoKHRoaXMuYiwgSW5maW5pdHksIHRydWUsIGZhbHNlKTtcbiAgICB9XG59XG5cbmNvbnN0IG5uID0gbmV3IF9uZXVyYWxfbmV0d29ya19jbGllbnQuTmV1cmFsTmV0d29yaygpO1xuY29uc3QgZW5naW5lID0gbmV3IEE5RW5naW5lKG5uKTsiXX0=
