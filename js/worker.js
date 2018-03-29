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
        return await this.tree.search(this.b, Infinity, true, false);
    }
}

const nn = new _neural_network_client.NeuralNetwork();
const engine = new A9Engine(nn);
},{"./board.js":1,"./constants.js":2,"./coord_convert.js":3,"./intersection.js":4,"./neural_network_client.js":5,"./search.js":6}]},{},[9])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYm9hcmQuanMiLCJzcmMvY29uc3RhbnRzLmpzIiwic3JjL2Nvb3JkX2NvbnZlcnQuanMiLCJzcmMvaW50ZXJzZWN0aW9uLmpzIiwic3JjL25ldXJhbF9uZXR3b3JrX2NsaWVudC5qcyIsInNyYy9zZWFyY2guanMiLCJzcmMvc3RvbmVfZ3JvdXAuanMiLCJzcmMvdXRpbHMuanMiLCJzcmMvd29ya2VyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDamFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfXJldHVybiBlfSkoKSIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5Cb2FyZCA9IGV4cG9ydHMuQ2FuZGlkYXRlcyA9IHVuZGVmaW5lZDtcbmV4cG9ydHMubmVpZ2hib3JzID0gbmVpZ2hib3JzO1xuZXhwb3J0cy5kaWFnb25hbHMgPSBkaWFnb25hbHM7XG5cbnZhciBfdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG5cbnZhciBfY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMuanMnKTtcblxudmFyIF9pbnRlcnNlY3Rpb24gPSByZXF1aXJlKCcuL2ludGVyc2VjdGlvbi5qcycpO1xuXG52YXIgX3N0b25lX2dyb3VwID0gcmVxdWlyZSgnLi9zdG9uZV9ncm91cC5qcycpO1xuXG52YXIgX2Nvb3JkX2NvbnZlcnQgPSByZXF1aXJlKCcuL2Nvb3JkX2NvbnZlcnQuanMnKTtcblxuZnVuY3Rpb24gbmVpZ2hib3JzKHYpIHtcbiAgICByZXR1cm4gW3YgKyAxLCB2ICsgX2NvbnN0YW50cy5FQlNJWkUsIHYgLSAxLCB2IC0gX2NvbnN0YW50cy5FQlNJWkVdO1xufVxuXG5mdW5jdGlvbiBkaWFnb25hbHModikge1xuICAgIHJldHVybiBbdiArIF9jb25zdGFudHMuRUJTSVpFICsgMSwgdiArIF9jb25zdGFudHMuRUJTSVpFIC0gMSwgdiAtIF9jb25zdGFudHMuRUJTSVpFIC0gMSwgdiAtIF9jb25zdGFudHMuRUJTSVpFICsgMV07XG59XG5cbmNsYXNzIENhbmRpZGF0ZXMge1xuICAgIGNvbnN0cnVjdG9yKGhhc2gsIG1vdmVDbnQsIGxpc3QpIHtcbiAgICAgICAgdGhpcy5oYXNoID0gaGFzaDtcbiAgICAgICAgdGhpcy5tb3ZlQ250ID0gbW92ZUNudDtcbiAgICAgICAgdGhpcy5saXN0ID0gbGlzdDtcbiAgICB9XG59XG5cbmV4cG9ydHMuQ2FuZGlkYXRlcyA9IENhbmRpZGF0ZXM7XG5jbGFzcyBCb2FyZCB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMuc3RhdGUgPSBuZXcgVWludDhBcnJheShfY29uc3RhbnRzLkVCVkNOVCk7XG4gICAgICAgIHRoaXMuc3RhdGUuZmlsbChfaW50ZXJzZWN0aW9uLkVYVEVSSU9SKTtcbiAgICAgICAgdGhpcy5pZCA9IG5ldyBVaW50OEFycmF5KF9jb25zdGFudHMuRUJWQ05UKTtcbiAgICAgICAgdGhpcy5uZXh0ID0gbmV3IFVpbnQ4QXJyYXkoX2NvbnN0YW50cy5FQlZDTlQpO1xuICAgICAgICB0aGlzLnNnID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgX2NvbnN0YW50cy5FQlZDTlQ7IGkrKykge1xuICAgICAgICAgICAgdGhpcy5zZy5wdXNoKG5ldyBfc3RvbmVfZ3JvdXAuU3RvbmVHcm91cCgpKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnByZXZTdGF0ZSA9IFtdO1xuICAgICAgICB0aGlzLmtvID0gX2NvbnN0YW50cy5WTlVMTDtcbiAgICAgICAgdGhpcy50dXJuID0gX2ludGVyc2VjdGlvbi5CTEFDSztcbiAgICAgICAgdGhpcy5tb3ZlQ250ID0gMDtcbiAgICAgICAgdGhpcy5wcmV2TW92ZSA9IF9jb25zdGFudHMuVk5VTEw7XG4gICAgICAgIHRoaXMucmVtb3ZlQ250ID0gMDtcbiAgICAgICAgdGhpcy5oaXN0b3J5ID0gW107XG4gICAgICAgIHRoaXMuY2xlYXIoKTtcbiAgICB9XG5cbiAgICBnZXRNb3ZlQ250KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5tb3ZlQ250O1xuICAgIH1cblxuICAgIGdldFByZXZNb3ZlKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5wcmV2TW92ZTtcbiAgICB9XG5cbiAgICBnZXRIaXN0b3J5KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5oaXN0b3J5O1xuICAgIH1cblxuICAgIGNsZWFyKCkge1xuICAgICAgICBmb3IgKGxldCB4ID0gMTsgeCA8PSBfY29uc3RhbnRzLkJTSVpFOyB4KyspIHtcbiAgICAgICAgICAgIGZvciAobGV0IHkgPSAxOyB5IDw9IF9jb25zdGFudHMuQlNJWkU7IHkrKykge1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGVbKDAsIF9jb29yZF9jb252ZXJ0Lnh5MmV2KSh4LCB5KV0gPSBfaW50ZXJzZWN0aW9uLkVNUFRZO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5pZC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdGhpcy5pZFtpXSA9IGk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm5leHQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMubmV4dFtpXSA9IGk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zZy5mb3JFYWNoKGUgPT4ge1xuICAgICAgICAgICAgZS5jbGVhcihmYWxzZSk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLnByZXZTdGF0ZSA9IFtdO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IF9jb25zdGFudHMuS0VFUF9QUkVWX0NOVDsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLnByZXZTdGF0ZS5wdXNoKG5ldyBVaW50OEFycmF5KHRoaXMuc3RhdGUpKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmtvID0gX2NvbnN0YW50cy5WTlVMTDtcbiAgICAgICAgdGhpcy50dXJuID0gX2ludGVyc2VjdGlvbi5CTEFDSztcbiAgICAgICAgdGhpcy5tb3ZlQ250ID0gMDtcbiAgICAgICAgdGhpcy5wcmV2TW92ZSA9IF9jb25zdGFudHMuVk5VTEw7XG4gICAgICAgIHRoaXMucmVtb3ZlQ250ID0gMDtcbiAgICAgICAgdGhpcy5oaXN0b3J5ID0gW107XG4gICAgfVxuXG4gICAgY29weVRvKGRlc3QpIHtcbiAgICAgICAgZGVzdC5zdGF0ZSA9IG5ldyBVaW50OEFycmF5KHRoaXMuc3RhdGUpO1xuICAgICAgICBkZXN0LmlkID0gbmV3IFVpbnQ4QXJyYXkodGhpcy5pZCk7XG4gICAgICAgIGRlc3QubmV4dCA9IG5ldyBVaW50OEFycmF5KHRoaXMubmV4dCk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZGVzdC5zZy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdGhpcy5zZ1tpXS5jb3B5VG8oZGVzdC5zZ1tpXSk7XG4gICAgICAgIH1cbiAgICAgICAgZGVzdC5wcmV2U3RhdGUgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBfY29uc3RhbnRzLktFRVBfUFJFVl9DTlQ7IGkrKykge1xuICAgICAgICAgICAgZGVzdC5wcmV2U3RhdGUucHVzaChuZXcgVWludDhBcnJheSh0aGlzLnByZXZTdGF0ZVtpXSkpO1xuICAgICAgICB9XG4gICAgICAgIGRlc3Qua28gPSB0aGlzLmtvO1xuICAgICAgICBkZXN0LnR1cm4gPSB0aGlzLnR1cm47XG4gICAgICAgIGRlc3QubW92ZUNudCA9IHRoaXMubW92ZUNudDtcbiAgICAgICAgZGVzdC5yZW1vdmVDbnQgPSB0aGlzLnJlbW92ZUNudDtcbiAgICAgICAgZGVzdC5oaXN0b3J5ID0gQXJyYXkuZnJvbSh0aGlzLmhpc3RvcnkpO1xuICAgIH1cblxuICAgIHBsYXlTZXF1ZW5jZShzZXF1ZW5jZSkge1xuICAgICAgICBmb3IgKGNvbnN0IHYgb2Ygc2VxdWVuY2UpIHtcbiAgICAgICAgICAgIHRoaXMucGxheSh2LCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZW1vdmUodikge1xuICAgICAgICBsZXQgdlRtcCA9IHY7XG4gICAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgICAgICB0aGlzLnJlbW92ZUNudCArPSAxO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZVt2VG1wXSA9IF9pbnRlcnNlY3Rpb24uRU1QVFk7XG4gICAgICAgICAgICB0aGlzLmlkW3ZUbXBdID0gdlRtcDtcbiAgICAgICAgICAgIGZvciAoY29uc3QgbnYgb2YgbmVpZ2hib3JzKHZUbXApKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZ1t0aGlzLmlkW252XV0uYWRkKHZUbXApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3Qgdk5leHQgPSB0aGlzLm5leHRbdlRtcF07XG4gICAgICAgICAgICB0aGlzLm5leHRbdlRtcF0gPSB2VG1wO1xuICAgICAgICAgICAgdlRtcCA9IHZOZXh0O1xuICAgICAgICAgICAgaWYgKHZUbXAgPT09IHYpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIG1lcmdlKHYxLCB2Mikge1xuICAgICAgICBsZXQgaWRCYXNlID0gdGhpcy5pZFt2MV07XG4gICAgICAgIGxldCBpZEFkZCA9IHRoaXMuaWRbdjJdO1xuICAgICAgICBpZiAodGhpcy5zZ1tpZEJhc2VdLmdldFNpemUoKSA8IHRoaXMuc2dbaWRBZGRdLmdldFNpemUoKSkge1xuICAgICAgICAgICAgbGV0IHRtcCA9IGlkQmFzZTtcbiAgICAgICAgICAgIGlkQmFzZSA9IGlkQWRkO1xuICAgICAgICAgICAgaWRBZGQgPSB0bXA7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnNnW2lkQmFzZV0ubWVyZ2UodGhpcy5zZ1tpZEFkZF0pO1xuXG4gICAgICAgIGxldCB2VG1wID0gaWRBZGQ7XG4gICAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgICAgICB0aGlzLmlkW3ZUbXBdID0gaWRCYXNlO1xuICAgICAgICAgICAgdlRtcCA9IHRoaXMubmV4dFt2VG1wXTtcbiAgICAgICAgICAgIGlmICh2VG1wID09PSBpZEFkZCkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHRtcCA9IHRoaXMubmV4dFt2MV07XG4gICAgICAgIHRoaXMubmV4dFt2MV0gPSB0aGlzLm5leHRbdjJdO1xuICAgICAgICB0aGlzLm5leHRbdjJdID0gdG1wO1xuICAgIH1cblxuICAgIHBsYWNlU3RvbmUodikge1xuICAgICAgICBjb25zdCBzdG9uZUNvbG9yID0gdGhpcy50dXJuO1xuICAgICAgICB0aGlzLnN0YXRlW3ZdID0gc3RvbmVDb2xvcjtcbiAgICAgICAgdGhpcy5pZFt2XSA9IHY7XG4gICAgICAgIHRoaXMuc2dbdGhpcy5pZFt2XV0uY2xlYXIodHJ1ZSk7XG4gICAgICAgIGZvciAoY29uc3QgbnYgb2YgbmVpZ2hib3JzKHYpKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5zdGF0ZVtudl0gPT09IF9pbnRlcnNlY3Rpb24uRU1QVFkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNnW3RoaXMuaWRbdl1dLmFkZChudik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuc2dbdGhpcy5pZFtudl1dLnN1Yih2KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IG52IG9mIG5laWdoYm9ycyh2KSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuc3RhdGVbbnZdID09PSBzdG9uZUNvbG9yICYmIHRoaXMuaWRbbnZdICE9PSB0aGlzLmlkW3ZdKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5tZXJnZSh2LCBudik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5yZW1vdmVDbnQgPSAwO1xuICAgICAgICBjb25zdCBvcHBvbmVudFN0b25lID0gKDAsIF9pbnRlcnNlY3Rpb24ub3Bwb25lbnRPZikodGhpcy50dXJuKTtcbiAgICAgICAgZm9yIChjb25zdCBudiBvZiBuZWlnaGJvcnModikpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnN0YXRlW252XSA9PT0gb3Bwb25lbnRTdG9uZSAmJiB0aGlzLnNnW3RoaXMuaWRbbnZdXS5nZXRMaWJDbnQoKSA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMucmVtb3ZlKG52KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGxlZ2FsKHYpIHtcbiAgICAgICAgaWYgKHYgPT09IF9jb25zdGFudHMuUEFTUykge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAodiA9PT0gdGhpcy5rbyB8fCB0aGlzLnN0YXRlW3ZdICE9PSBfaW50ZXJzZWN0aW9uLkVNUFRZKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzdG9uZUNudCA9IFswLCAwXTtcbiAgICAgICAgY29uc3QgYXRyQ250ID0gWzAsIDBdO1xuICAgICAgICBmb3IgKGNvbnN0IG52IG9mIG5laWdoYm9ycyh2KSkge1xuICAgICAgICAgICAgY29uc3QgYyA9IHRoaXMuc3RhdGVbbnZdO1xuICAgICAgICAgICAgc3dpdGNoIChjKSB7XG4gICAgICAgICAgICAgICAgY2FzZSBfaW50ZXJzZWN0aW9uLkVNUFRZOlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICBjYXNlIF9pbnRlcnNlY3Rpb24uQkxBQ0s6XG4gICAgICAgICAgICAgICAgY2FzZSBfaW50ZXJzZWN0aW9uLldISVRFOlxuICAgICAgICAgICAgICAgICAgICBzdG9uZUNudFtjXSArPSAxO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5zZ1t0aGlzLmlkW252XV0uZ2V0TGliQ250KCkgPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF0ckNudFtjXSArPSAxO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGF0ckNudFsoMCwgX2ludGVyc2VjdGlvbi5vcHBvbmVudE9mKSh0aGlzLnR1cm4pXSAhPT0gMCB8fCBhdHJDbnRbdGhpcy50dXJuXSA8IHN0b25lQ250W3RoaXMudHVybl07XG4gICAgfVxuXG4gICAgZXllc2hhcGUodiwgcGwpIHtcbiAgICAgICAgaWYgKHYgPT09IF9jb25zdGFudHMuUEFTUykge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgbnYgb2YgbmVpZ2hib3JzKHYpKSB7XG4gICAgICAgICAgICBjb25zdCBjID0gdGhpcy5zdGF0ZVtudl07XG4gICAgICAgICAgICBpZiAoYyA9PT0gX2ludGVyc2VjdGlvbi5FTVBUWSB8fCBjID09PSAoMCwgX2ludGVyc2VjdGlvbi5vcHBvbmVudE9mKShwbCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZGlhZ0NudCA9IFswLCAwLCAwLCAwXTtcbiAgICAgICAgZm9yIChjb25zdCBudiBvZiBkaWFnb25hbHModikpIHtcbiAgICAgICAgICAgIGRpYWdDbnRbdGhpcy5zdGF0ZVtudl1dICs9IDE7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgd2VkZ2VDbnQgPSBkaWFnQ250WygwLCBfaW50ZXJzZWN0aW9uLm9wcG9uZW50T2YpKHBsKV0gKyAoZGlhZ0NudFszXSA+IDAgPyAxIDogMCk7XG4gICAgICAgIGlmICh3ZWRnZUNudCA9PT0gMikge1xuICAgICAgICAgICAgZm9yIChjb25zdCBudiBvZiBkaWFnb25hbHModikpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5zdGF0ZVtudl0gPT09ICgwLCBfaW50ZXJzZWN0aW9uLm9wcG9uZW50T2YpKHBsKSAmJiB0aGlzLnNnW3RoaXMuaWRbbnZdXS5nZXRMaWJDbnQoKSA9PT0gMSAmJiB0aGlzLnNnW3RoaXMuaWRbbnZdXS5nZXRWQXRyKCkgIT09IHRoaXMua28pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB3ZWRnZUNudCA8IDI7XG4gICAgfVxuXG4gICAgcGxheSh2LCBub3RGaWxsRXllKSB7XG4gICAgICAgIGlmICghdGhpcy5sZWdhbCh2KSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChub3RGaWxsRXllICYmIHRoaXMuZXllc2hhcGUodiwgdGhpcy50dXJuKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGZvciAobGV0IGkgPSBfY29uc3RhbnRzLktFRVBfUFJFVl9DTlQgLSAyOyBpID49IDA7IGktLSkge1xuICAgICAgICAgICAgdGhpcy5wcmV2U3RhdGVbaSArIDFdID0gdGhpcy5wcmV2U3RhdGVbaV07XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5wcmV2U3RhdGVbMF0gPSBuZXcgVWludDhBcnJheSh0aGlzLnN0YXRlKTtcbiAgICAgICAgaWYgKHYgPT09IF9jb25zdGFudHMuUEFTUykge1xuICAgICAgICAgICAgdGhpcy5rbyA9IF9jb25zdGFudHMuVk5VTEw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnBsYWNlU3RvbmUodik7XG4gICAgICAgICAgICBjb25zdCBpZCA9IHRoaXMuaWRbdl07XG4gICAgICAgICAgICB0aGlzLmtvID0gX2NvbnN0YW50cy5WTlVMTDtcbiAgICAgICAgICAgIGlmICh0aGlzLnJlbW92ZUNudCA9PT0gMSAmJiB0aGlzLnNnW2lkXS5nZXRMaWJDbnQoKSA9PT0gMSAmJiB0aGlzLnNnW2lkXS5nZXRTaXplKCkgPT09IDEpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmtvID0gdGhpcy5zZ1tpZF0uZ2V0VkF0cigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMucHJldk1vdmUgPSB2O1xuICAgICAgICB0aGlzLmhpc3RvcnkucHVzaCh2KTtcbiAgICAgICAgdGhpcy50dXJuID0gKDAsIF9pbnRlcnNlY3Rpb24ub3Bwb25lbnRPZikodGhpcy50dXJuKTtcbiAgICAgICAgdGhpcy5tb3ZlQ250ICs9IDE7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHJhbmRvbVBsYXkoKSB7XG4gICAgICAgIGNvbnN0IGVtcHR5TGlzdCA9IFtdO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuc3RhdGUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnN0YXRlW2ldID09PSBfaW50ZXJzZWN0aW9uLkVNUFRZKSB7XG4gICAgICAgICAgICAgICAgZW1wdHlMaXN0LnB1c2goaSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgKDAsIF91dGlscy5zaHVmZmxlKShlbXB0eUxpc3QpO1xuICAgICAgICBmb3IgKGNvbnN0IHYgb2YgZW1wdHlMaXN0KSB7XG4gICAgICAgICAgICBpZiAodGhpcy5wbGF5KHYsIHRydWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHY7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5wbGF5KF9jb25zdGFudHMuUEFTUywgdHJ1ZSk7XG4gICAgICAgIHJldHVybiBfY29uc3RhbnRzLlBBU1M7XG4gICAgfVxuXG4gICAgc2NvcmUoKSB7XG4gICAgICAgIGNvbnN0IHN0b25lQ250ID0gWzAsIDBdO1xuICAgICAgICBmb3IgKGxldCBfdiA9IDA7IF92IDwgX2NvbnN0YW50cy5CVkNOVDsgX3YrKykge1xuICAgICAgICAgICAgY29uc3QgdiA9ICgwLCBfY29vcmRfY29udmVydC5ydjJldikoX3YpO1xuICAgICAgICAgICAgY29uc3QgcyA9IHRoaXMuc3RhdGVbdl07XG4gICAgICAgICAgICBpZiAocyA9PT0gX2ludGVyc2VjdGlvbi5CTEFDSyB8fCBzID09PSBfaW50ZXJzZWN0aW9uLldISVRFKSB7XG4gICAgICAgICAgICAgICAgc3RvbmVDbnRbc10gKz0gMTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbmJyQ250ID0gWzAsIDAsIDAsIDBdO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgbnYgb2YgbmVpZ2hib3JzKHYpKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ickNudFt0aGlzLnN0YXRlW252XV0gKz0gMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG5ickNudFtfaW50ZXJzZWN0aW9uLldISVRFXSA+IDAgJiYgbmJyQ250W19pbnRlcnNlY3Rpb24uQkxBQ0tdID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0b25lQ250W19pbnRlcnNlY3Rpb24uV0hJVEVdICs9IDE7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChuYnJDbnRbX2ludGVyc2VjdGlvbi5CTEFDS10gPiAwICYmIG5ickNudFtfaW50ZXJzZWN0aW9uLldISVRFXSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBzdG9uZUNudFtfaW50ZXJzZWN0aW9uLkJMQUNLXSArPSAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3RvbmVDbnRbMV0gLSBzdG9uZUNudFswXSAtIF9jb25zdGFudHMuS09NSTtcbiAgICB9XG5cbiAgICByb2xsb3V0KHNob3dCb2FyZCkge1xuICAgICAgICB3aGlsZSAodGhpcy5tb3ZlQ250IDwgX2NvbnN0YW50cy5FQlZDTlQgKiAyKSB7XG4gICAgICAgICAgICBjb25zdCBwcmV2TW92ZSA9IHRoaXMucHJldk1vdmU7XG4gICAgICAgICAgICBjb25zdCBtb3ZlID0gdGhpcy5yYW5kb21QbGF5KCk7XG4gICAgICAgICAgICBpZiAoc2hvd0JvYXJkICYmIG1vdmUgIT09IF9jb25zdGFudHMuUEFTUykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdcXG5tb3ZlIGNvdW50PSVkJywgdGhpcy5tb3ZlQ250KTtcbiAgICAgICAgICAgICAgICB0aGlzLnNob3dib2FyZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHByZXZNb3ZlID09PSBfY29uc3RhbnRzLlBBU1MgJiYgbW92ZSA9PT0gX2NvbnN0YW50cy5QQVNTKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzaG93Ym9hcmQoKSB7XG4gICAgICAgIGZ1bmN0aW9uIHByaW50WGxhYmVsKCkge1xuICAgICAgICAgICAgbGV0IGxpbmVTdHIgPSAnICAnO1xuICAgICAgICAgICAgZm9yIChsZXQgeCA9IDE7IHggPD0gX2NvbnN0YW50cy5CU0laRTsgeCsrKSB7XG4gICAgICAgICAgICAgICAgbGluZVN0ciArPSBgICR7X2Nvb3JkX2NvbnZlcnQuWF9MQUJFTFNbeF19IGA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhsaW5lU3RyKTtcbiAgICAgICAgfVxuICAgICAgICBwcmludFhsYWJlbCgpO1xuICAgICAgICBmb3IgKGxldCB5ID0gX2NvbnN0YW50cy5CU0laRTsgeSA+IDA7IHktLSkge1xuICAgICAgICAgICAgbGV0IGxpbmVTdHIgPSAoJyAnICsgeS50b1N0cmluZygpKS5zbGljZSgtMik7XG4gICAgICAgICAgICBmb3IgKGxldCB4ID0gMTsgeCA8PSBfY29uc3RhbnRzLkJTSVpFOyB4KyspIHtcbiAgICAgICAgICAgICAgICBjb25zdCB2ID0gKDAsIF9jb29yZF9jb252ZXJ0Lnh5MmV2KSh4LCB5KTtcbiAgICAgICAgICAgICAgICBsZXQgeFN0cjtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHRoaXMuc3RhdGVbdl0pIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBfaW50ZXJzZWN0aW9uLkJMQUNLOlxuICAgICAgICAgICAgICAgICAgICAgICAgeFN0ciA9IHYgPT09IHRoaXMucHJldk1vdmUgPyAnW1hdJyA6ICcgWCAnO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgX2ludGVyc2VjdGlvbi5XSElURTpcbiAgICAgICAgICAgICAgICAgICAgICAgIHhTdHIgPSB2ID09PSB0aGlzLnByZXZNb3ZlID8gJ1tPXScgOiAnIE8gJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIF9pbnRlcnNlY3Rpb24uRU1QVFk6XG4gICAgICAgICAgICAgICAgICAgICAgICB4U3RyID0gJyAuICc7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHhTdHIgPSAnID8gJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbGluZVN0ciArPSB4U3RyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGluZVN0ciArPSAoJyAnICsgeS50b1N0cmluZygpKS5zbGljZSgtMik7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhsaW5lU3RyKTtcbiAgICAgICAgfVxuICAgICAgICBwcmludFhsYWJlbCgpO1xuICAgICAgICBjb25zb2xlLmxvZygnJyk7XG4gICAgfVxuXG4gICAgZmVhdHVyZSgpIHtcbiAgICAgICAgZnVuY3Rpb24gaW5kZXgocCwgZikge1xuICAgICAgICAgICAgcmV0dXJuIHAgKiBfY29uc3RhbnRzLkZFQVRVUkVfQ05UICsgZjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBhcnJheSA9IG5ldyBGbG9hdDMyQXJyYXkoX2NvbnN0YW50cy5CVkNOVCAqIF9jb25zdGFudHMuRkVBVFVSRV9DTlQpO1xuXG4gICAgICAgIGNvbnN0IG15ID0gdGhpcy50dXJuO1xuICAgICAgICBjb25zdCBvcHAgPSAoMCwgX2ludGVyc2VjdGlvbi5vcHBvbmVudE9mKSh0aGlzLnR1cm4pO1xuICAgICAgICBmb3IgKGxldCBwID0gMDsgcCA8IF9jb25zdGFudHMuQlZDTlQ7IHArKykge1xuICAgICAgICAgICAgYXJyYXlbaW5kZXgocCwgMCldID0gdGhpcy5zdGF0ZVsoMCwgX2Nvb3JkX2NvbnZlcnQucnYyZXYpKHApXSA9PT0gbXkgPyAxLjAgOiAwLjA7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChsZXQgcCA9IDA7IHAgPCBfY29uc3RhbnRzLkJWQ05UOyBwKyspIHtcbiAgICAgICAgICAgIGFycmF5W2luZGV4KHAsIDEpXSA9IHRoaXMuc3RhdGVbKDAsIF9jb29yZF9jb252ZXJ0LnJ2MmV2KShwKV0gPT09IG9wcCA/IDEuMCA6IDAuMDtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IF9jb25zdGFudHMuS0VFUF9QUkVWX0NOVDsgaSsrKSB7XG4gICAgICAgICAgICBmb3IgKGxldCBwID0gMDsgcCA8IF9jb25zdGFudHMuQlZDTlQ7IHArKykge1xuICAgICAgICAgICAgICAgIGFycmF5W2luZGV4KHAsIChpICsgMSkgKiAyKV0gPSB0aGlzLnByZXZTdGF0ZVtpXVsoMCwgX2Nvb3JkX2NvbnZlcnQucnYyZXYpKHApXSA9PT0gbXkgPyAxLjAgOiAwLjA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGxldCBwID0gMDsgcCA8IF9jb25zdGFudHMuQlZDTlQ7IHArKykge1xuICAgICAgICAgICAgICAgIGFycmF5W2luZGV4KHAsIChpICsgMSkgKiAyICsgMSldID0gdGhpcy5wcmV2U3RhdGVbaV1bKDAsIF9jb29yZF9jb252ZXJ0LnJ2MmV2KShwKV0gPT09IG9wcCA/IDEuMCA6IDAuMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCBwID0gMDsgcCA8IF9jb25zdGFudHMuQlZDTlQ7IHArKykge1xuICAgICAgICAgICAgYXJyYXlbaW5kZXgocCwgX2NvbnN0YW50cy5GRUFUVVJFX0NOVCAtIDEpXSA9IG15O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGFycmF5O1xuICAgIH1cblxuICAgIGhhc2goKSB7XG4gICAgICAgIHJldHVybiAoMCwgX3V0aWxzLmhhc2gpKCh0aGlzLnN0YXRlLnRvU3RyaW5nKCkgKyB0aGlzLnByZXZTdGF0ZVswXS50b1N0cmluZygpICsgdGhpcy50dXJuLnRvU3RyaW5nKCkpLnJlcGxhY2UoJywnLCAnJykpO1xuICAgIH1cblxuICAgIGNhbmRpZGF0ZXMoKSB7XG4gICAgICAgIGNvbnN0IGNhbmRMaXN0ID0gW107XG4gICAgICAgIGZvciAobGV0IHYgPSAwOyB2IDwgdGhpcy5zdGF0ZS5sZW5ndGg7IHYrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuc3RhdGVbdl0gPT09IF9pbnRlcnNlY3Rpb24uRU1QVFkgJiYgdGhpcy5sZWdhbCh2KSAmJiAhdGhpcy5leWVzaGFwZSh2LCB0aGlzLnR1cm4pKSB7XG4gICAgICAgICAgICAgICAgY2FuZExpc3QucHVzaCgoMCwgX2Nvb3JkX2NvbnZlcnQuZXYycnYpKHYpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjYW5kTGlzdC5wdXNoKCgwLCBfY29vcmRfY29udmVydC5ldjJydikoX2NvbnN0YW50cy5QQVNTKSk7XG4gICAgICAgIHJldHVybiBuZXcgQ2FuZGlkYXRlcyh0aGlzLmhhc2goKSwgdGhpcy5tb3ZlQ250LCBjYW5kTGlzdCk7XG4gICAgfVxuXG4gICAgZmluYWxTY29yZSgpIHtcbiAgICAgICAgY29uc3QgUk9MTF9PVVRfTlVNID0gMjU2O1xuICAgICAgICBjb25zdCBkb3VibGVTY29yZUxpc3QgPSBbXTtcbiAgICAgICAgbGV0IGJDcHkgPSBuZXcgQm9hcmQoKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBST0xMX09VVF9OVU07IGkrKykge1xuICAgICAgICAgICAgdGhpcy5jb3B5VG8oYkNweSk7XG4gICAgICAgICAgICBiQ3B5LnJvbGxvdXQoZmFsc2UpO1xuICAgICAgICAgICAgZG91YmxlU2NvcmVMaXN0LnB1c2goYkNweS5zY29yZSgpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKDAsIF91dGlscy5tb3N0Q29tbW9uKShkb3VibGVTY29yZUxpc3QpO1xuICAgIH1cbn1cbmV4cG9ydHMuQm9hcmQgPSBCb2FyZDsgLypcbiAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gdGVzdEJvYXJkKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYiA9IG5ldyBCb2FyZCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgYi5wbGF5U2VxdWVuY2UoWydBMScsICdBMicsICdBOScsICdCMSddLm1hcChzdHIyZXYpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGIuc2hvd2JvYXJkKCk7XG4gICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgdGVzdEJvYXJkKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICovIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG4vLy8g44Kz44Of44Gn44GZ44CCXG5jb25zdCBLT01JID0gZXhwb3J0cy5LT01JID0gNy4wO1xuXG4vLy8g56KB55uk44Gu44K144Kk44K644Gn44GZ44CCXG5jb25zdCBCU0laRSA9IGV4cG9ydHMuQlNJWkUgPSA5O1xuXG4vLy8g5aSW5p6g44KS5oyB44Gk5ouh5by156KB55uk44Gu44K144Kk44K644Gn44GZ44CCXG5jb25zdCBFQlNJWkUgPSBleHBvcnRzLkVCU0laRSA9IEJTSVpFICsgMjtcblxuLy8vIOeigeebpOOBruS6pOeCueOBruaVsOOBp+OBmeOAglxuY29uc3QgQlZDTlQgPSBleHBvcnRzLkJWQ05UID0gQlNJWkUgKiBCU0laRTtcblxuLy8vIOaLoeW8teeigeebpOOBruS6pOeCueOBruaVsOOBp+OBmeOAglxuY29uc3QgRUJWQ05UID0gZXhwb3J0cy5FQlZDTlQgPSBFQlNJWkUgKiBFQlNJWkU7XG5cbi8vLyDjg5HjgrnjgpLooajjgZnnt5rlvaLluqfmqJnjgafjgZnjgILpgJrluLjjga7nnYDmiYvjga/mi6HlvLXnooHnm6Tjga7nt5rlvaLluqfmqJnjgafooajjgZfjgb7jgZnjgIJcbi8vIFRPRE8gLSDnnYDmiYvjga7jgZ/jgoHjgavliJfmjJnlnovjgpLkvZzjgaPjgZ/jgbvjgYbjgYzplqLmlbDjga7jgrfjgrDjg4vjg4Hjg6Pjga/oqq3jgb/jgoTjgZnjgYTjgIJcbmNvbnN0IFBBU1MgPSBleHBvcnRzLlBBU1MgPSBFQlZDTlQ7XG5cbi8vLyDnt5rlvaLluqfmqJnjga7jg5fjg6zjg7zjgrnjg5vjg6vjg4Djg7zjga7mnKrkvb/nlKjjgpLnpLrjgZnlgKTjgafjgZnjgIJcbi8vIFRPRE8gLSDoqbLlvZPjgZnjgovloLTmiYDjgatPcHRpb248dXNpemU+44KS5L2/44Gj44Gf44G744GG44GM6Zai5pWw44Gu44K344Kw44OL44OB44Oj44Gv6Kqt44G/44KE44GZ44GE44CCXG5jb25zdCBWTlVMTCA9IGV4cG9ydHMuVk5VTEwgPSBFQlZDTlQgKyAxO1xuXG4vLy8gTk7jgbjjga7lhaXlipvjgavplqLjgZnjgovlsaXmrbTjga7mt7HjgZXjgafjgZnjgIJcbmNvbnN0IEtFRVBfUFJFVl9DTlQgPSBleHBvcnRzLktFRVBfUFJFVl9DTlQgPSAyO1xuXG4vLy8gTk7jgbjjga7lhaXlipvjg5XjgqPjg7zjg4Hjg6Pjg7zjga7mlbDjgafjgZnjgIJcbmNvbnN0IEZFQVRVUkVfQ05UID0gZXhwb3J0cy5GRUFUVVJFX0NOVCA9IEtFRVBfUFJFVl9DTlQgKiAyICsgMzsgLy8gNyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5YX0xBQkVMUyA9IHVuZGVmaW5lZDtcbmV4cG9ydHMubW92ZTJ4eSA9IG1vdmUyeHk7XG5leHBvcnRzLmV2Mnh5ID0gZXYyeHk7XG5leHBvcnRzLnh5MmV2ID0geHkyZXY7XG5leHBvcnRzLnJ2MmV2ID0gcnYyZXY7XG5leHBvcnRzLmV2MnJ2ID0gZXYycnY7XG5leHBvcnRzLmV2MnN0ciA9IGV2MnN0cjtcbmV4cG9ydHMuc3RyMmV2ID0gc3RyMmV2O1xuXG52YXIgX2NvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzLmpzJyk7XG5cbmNvbnN0IFhfTEFCRUxTID0gZXhwb3J0cy5YX0xBQkVMUyA9ICdAQUJDREVGR0hKS0xNTk9QUVJTVCc7XG5cbmZ1bmN0aW9uIG1vdmUyeHkocykge1xuICAgIGNvbnN0IE9GRlNFVCA9ICdhJy5jaGFyQ29kZUF0KDApIC0gMTtcbiAgICByZXR1cm4gW3MuY2hhckNvZGVBdCgwKSAtIE9GRlNFVCwgX2NvbnN0YW50cy5CU0laRSArIDEgLSAocy5jaGFyQ29kZUF0KDEpIC0gT0ZGU0VUKV07XG59XG5cbmZ1bmN0aW9uIGV2Mnh5KGV2KSB7XG4gICAgcmV0dXJuIFtldiAlIF9jb25zdGFudHMuRUJTSVpFLCBNYXRoLmZsb29yKGV2IC8gX2NvbnN0YW50cy5FQlNJWkUpXTtcbn1cblxuZnVuY3Rpb24geHkyZXYoeCwgeSkge1xuICAgIHJldHVybiB5ICogX2NvbnN0YW50cy5FQlNJWkUgKyB4O1xufVxuXG5mdW5jdGlvbiBydjJldihydikge1xuICAgIHJldHVybiBydiA9PT0gX2NvbnN0YW50cy5CVkNOVCA/IF9jb25zdGFudHMuUEFTUyA6IHJ2ICUgX2NvbnN0YW50cy5CU0laRSArIDEgKyBNYXRoLmZsb29yKHJ2IC8gX2NvbnN0YW50cy5CU0laRSArIDEpICogX2NvbnN0YW50cy5FQlNJWkU7XG59XG5cbmZ1bmN0aW9uIGV2MnJ2KGV2KSB7XG4gICAgcmV0dXJuIGV2ID09PSBfY29uc3RhbnRzLlBBU1MgPyBfY29uc3RhbnRzLkJWQ05UIDogZXYgJSBfY29uc3RhbnRzLkVCU0laRSAtIDEgKyBNYXRoLmZsb29yKGV2IC8gX2NvbnN0YW50cy5FQlNJWkUgLSAxKSAqIF9jb25zdGFudHMuQlNJWkU7XG59XG5cbmZ1bmN0aW9uIGV2MnN0cihldikge1xuICAgIGlmIChldiA+PSBfY29uc3RhbnRzLlBBU1MpIHtcbiAgICAgICAgcmV0dXJuICdwYXNzJztcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBbeCwgeV0gPSBldjJ4eShldik7XG4gICAgICAgIHJldHVybiBYX0xBQkVMUy5jaGFyQXQoeCkgKyB5LnRvU3RyaW5nKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBzdHIyZXYodikge1xuICAgIGNvbnN0IHZTdHIgPSB2LnRvVXBwZXJDYXNlKCk7XG4gICAgaWYgKHZTdHIgPT09ICdQQVNTJyB8fCB2U3RyID09PSAnUkVTSUdOJykge1xuICAgICAgICByZXR1cm4gX2NvbnN0YW50cy5QQVNTO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHggPSBYX0xBQkVMUy5pbmRleE9mKHZTdHIuY2hhckF0KDApKTtcbiAgICAgICAgY29uc3QgeSA9IHBhcnNlSW50KHZTdHIuc2xpY2UoMSkpO1xuICAgICAgICByZXR1cm4geHkyZXYoeCwgeSk7XG4gICAgfVxufSIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLm9wcG9uZW50T2YgPSBvcHBvbmVudE9mO1xuY29uc3QgV0hJVEUgPSBleHBvcnRzLldISVRFID0gMDtcbmNvbnN0IEJMQUNLID0gZXhwb3J0cy5CTEFDSyA9IDE7XG5cbmZ1bmN0aW9uIG9wcG9uZW50T2YoY29sb3IpIHtcbiAgICBzd2l0Y2ggKGNvbG9yKSB7XG4gICAgICAgIGNhc2UgV0hJVEU6XG4gICAgICAgICAgICByZXR1cm4gQkxBQ0s7XG4gICAgICAgIGNhc2UgQkxBQ0s6XG4gICAgICAgICAgICByZXR1cm4gV0hJVEU7XG4gICAgfVxufVxuXG5jb25zdCBFTVBUWSA9IGV4cG9ydHMuRU1QVFkgPSAyO1xuY29uc3QgRVhURVJJT1IgPSBleHBvcnRzLkVYVEVSSU9SID0gMzsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcbi8qIGdsb2JhbCBXb3JrZXJQcm9jZWR1cmVDYWxsICovXG5cbmNsYXNzIE5ldXJhbE5ldHdvcmsge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLnJlY2VpdmVyID0gbmV3IFdvcmtlclByb2NlZHVyZUNhbGwoc2VsZiwgdGhpcy5jb25zdHJ1Y3Rvci5uYW1lKTtcbiAgICB9XG5cbiAgICBhc3luYyBldmFsdWF0ZShiKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMucmVjZWl2ZXIuY2FsbCgnZXZhbHVhdGUnLCBbYi5mZWF0dXJlKCldKTtcbiAgICAgICAgc2VsZi5QT05ERVJfU1RPUCA9IHJlc3VsdC5wb3AoKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG59XG5leHBvcnRzLk5ldXJhbE5ldHdvcmsgPSBOZXVyYWxOZXR3b3JrOyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5UcmVlID0gdW5kZWZpbmVkO1xuXG52YXIgX3V0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xuXG52YXIgX2NvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzLmpzJyk7XG5cbnZhciBfY29vcmRfY29udmVydCA9IHJlcXVpcmUoJy4vY29vcmRfY29udmVydC5qcycpO1xuXG52YXIgX2JvYXJkID0gcmVxdWlyZSgnLi9ib2FyZC5qcycpO1xuXG5jb25zdCBNQVhfTk9ERV9DTlQgPSAxNjM4NDtcbmNvbnN0IEVYUEFORF9DTlQgPSA4O1xuXG5sZXQgVFJFRV9DUCA9IDIuMDtcblxuZnVuY3Rpb24gcHJpbnRQcm9iKHByb2IpIHtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IF9jb25zdGFudHMuQlNJWkU7IHkrKykge1xuICAgICAgICBsZXQgc3RyID0gJyc7XG4gICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgX2NvbnN0YW50cy5CU0laRTsgeCsrKSB7XG4gICAgICAgICAgICBzdHIgKz0gKCcgICcgKyBwcm9iW3ggKyB5ICogX2NvbnN0YW50cy5CU0laRV0udG9GaXhlZCgxKSkuc2xpY2UoLTUpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKHN0cik7XG4gICAgfVxuICAgIGNvbnNvbGUubG9nKCdwYXNzPSVzJywgcHJvYltwcm9iLmxlbmd0aCAtIDFdLnRvRml4ZWQoMSkpO1xufVxuXG5jbGFzcyBUcmVlIHtcbiAgICBjb25zdHJ1Y3Rvcihubikge1xuICAgICAgICB0aGlzLm1haW5UaW1lID0gMC4wO1xuICAgICAgICB0aGlzLmJ5b3lvbWkgPSAxLjA7XG4gICAgICAgIHRoaXMubGVmdFRpbWUgPSAwLjA7XG4gICAgICAgIHRoaXMubm9kZSA9IFtdO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IE1BWF9OT0RFX0NOVDsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLm5vZGUucHVzaChuZXcgTm9kZSgpKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLm5vZGVDbnQgPSAwO1xuICAgICAgICB0aGlzLnJvb3RJZCA9IDA7XG4gICAgICAgIHRoaXMucm9vdE1vdmVDbnQgPSAwO1xuICAgICAgICB0aGlzLm5vZGVIYXNocyA9IG5ldyBNYXAoKTtcbiAgICAgICAgdGhpcy5ldmFsQ250ID0gMDtcbiAgICAgICAgdGhpcy5ubiA9IG5uO1xuICAgIH1cblxuICAgIHNldFRpbWUobWFpblRpbWUsIGJ5b3lvbWkpIHtcbiAgICAgICAgdGhpcy5tYWluVGltZSA9IG1haW5UaW1lO1xuICAgICAgICB0aGlzLmxlZnRUaW1lID0gbWFpblRpbWU7XG4gICAgICAgIHRoaXMuYnlveW9taSA9IGJ5b3lvbWk7XG4gICAgfVxuXG4gICAgc2V0TGVmdFRpbWUobGVmdFRpbWUpIHtcbiAgICAgICAgdGhpcy5sZWZ0VGltZSA9IGxlZnRUaW1lO1xuICAgIH1cblxuICAgIGNsZWFyKCkge1xuICAgICAgICB0aGlzLmxlZnRUaW1lID0gdGhpcy5tYWluVGltZTtcbiAgICAgICAgZm9yIChjb25zdCBuZCBvZiB0aGlzLm5vZGUpIHtcbiAgICAgICAgICAgIG5kLmNsZWFyKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5ub2RlQ250ID0gMDtcbiAgICAgICAgdGhpcy5yb290SWQgPSAwO1xuICAgICAgICB0aGlzLnJvb3RNb3ZlQ250ID0gMDtcbiAgICAgICAgdGhpcy5ub2RlSGFzaHMuY2xlYXIoKTtcbiAgICAgICAgdGhpcy5ldmFsQ250ID0gMDtcbiAgICB9XG5cbiAgICBkZWxldGVOb2RlKCkge1xuICAgICAgICBpZiAodGhpcy5ub2RlQ250IDwgTUFYX05PREVfQ05UIC8gMikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgTUFYX05PREVfQ05UOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IG1jID0gdGhpcy5ub2RlW2ldLm1vdmVDbnQ7XG4gICAgICAgICAgICBpZiAobWMgIT0gbnVsbCAmJiBtYyA8IHRoaXMucm9vdE1vdmVDbnQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm5vZGVIYXNocy5kZWxldGUodGhpcy5ub2RlW2ldLmhhc2gpO1xuICAgICAgICAgICAgICAgIHRoaXMubm9kZVtpXS5jbGVhcigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgY3JlYXRlTm9kZShiLCBwcm9iKSB7XG4gICAgICAgIGNvbnN0IGNhbmRpZGF0ZXMgPSBiLmNhbmRpZGF0ZXMoKTtcbiAgICAgICAgY29uc3QgaHMgPSBjYW5kaWRhdGVzLmhhc2g7XG4gICAgICAgIGlmICh0aGlzLm5vZGVIYXNocy5oYXMoaHMpICYmIHRoaXMubm9kZVt0aGlzLm5vZGVIYXNoc1toc11dLmhhc2ggPT09IGhzICYmIHRoaXMubm9kZVt0aGlzLm5vZGVIYXNoc1toc11dLm1vdmVDbnQgPT09IGNhbmRpZGF0ZXMubW92ZUNudCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubm9kZUhhc2hzW2hzXTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBub2RlSWQgPSBocyAlIE1BWF9OT0RFX0NOVDtcblxuICAgICAgICB3aGlsZSAodGhpcy5ub2RlW25vZGVJZF0ubW92ZUNudCAhPSAtMSkge1xuICAgICAgICAgICAgbm9kZUlkID0gbm9kZUlkICsgMSA8IE1BWF9OT0RFX0NOVCA/IG5vZGVJZCArIDEgOiAwO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5ub2RlSGFzaHNbaHNdID0gbm9kZUlkO1xuICAgICAgICB0aGlzLm5vZGVDbnQgKz0gMTtcblxuICAgICAgICBjb25zdCBuZCA9IHRoaXMubm9kZVtub2RlSWRdO1xuICAgICAgICBuZC5jbGVhcigpO1xuICAgICAgICBuZC5tb3ZlQ250ID0gY2FuZGlkYXRlcy5tb3ZlQ250O1xuICAgICAgICBuZC5oYXNoID0gaHM7XG4gICAgICAgIG5kLmluaXRCcmFuY2goKTtcblxuICAgICAgICBmb3IgKGNvbnN0IHJ2IG9mICgwLCBfdXRpbHMuYXJnc29ydCkocHJvYiwgdHJ1ZSkpIHtcbiAgICAgICAgICAgIGlmIChjYW5kaWRhdGVzLmxpc3QuaW5jbHVkZXMocnYpKSB7XG4gICAgICAgICAgICAgICAgbmQubW92ZVtuZC5icmFuY2hDbnRdID0gKDAsIF9jb29yZF9jb252ZXJ0LnJ2MmV2KShydik7XG4gICAgICAgICAgICAgICAgbmQucHJvYltuZC5icmFuY2hDbnRdID0gcHJvYltydl07XG4gICAgICAgICAgICAgICAgbmQuYnJhbmNoQ250ICs9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5vZGVJZDtcbiAgICB9XG5cbiAgICBiZXN0QnlBY3Rpb25WYWx1ZShiLCBub2RlSWQpIHtcbiAgICAgICAgY29uc3QgbmQgPSB0aGlzLm5vZGVbbm9kZUlkXTtcbiAgICAgICAgY29uc3QgbmRSYXRlID0gbmQudG90YWxDbnQgPT09IDAgPyAwLjAgOiBuZC50b3RhbFZhbHVlIC8gbmQudG90YWxDbnQ7XG4gICAgICAgIGNvbnN0IGNwc3YgPSBUUkVFX0NQICogTWF0aC5zcXJ0KG5kLnRvdGFsQ250KTtcbiAgICAgICAgY29uc3QgcmF0ZSA9IG5ldyBGbG9hdDMyQXJyYXkoX2NvbnN0YW50cy5CVkNOVCArIDEpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJhdGUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHJhdGVbaV0gPSBuZC52aXNpdENudFtpXSA9PT0gMCA/IG5kUmF0ZSA6IG5kLnZhbHVlV2luW2ldIC8gbmQudmlzaXRDbnRbaV07XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgYWN0aW9uVmFsdWUgPSBuZXcgRmxvYXQzMkFycmF5KG5kLmJyYW5jaENudCk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYWN0aW9uVmFsdWUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFjdGlvblZhbHVlW2ldID0gcmF0ZVtpXSArIGNwc3YgKiBuZC5wcm9iW2ldIC8gKG5kLnZpc2l0Q250W2ldICsgMSk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgYmVzdCA9ICgwLCBfdXRpbHMuYXJnbWF4KShhY3Rpb25WYWx1ZSk7XG4gICAgICAgIGNvbnN0IG5leHRJZCA9IG5kLm5leHRJZFtiZXN0XTtcbiAgICAgICAgY29uc3QgbmV4dE1vdmUgPSBuZC5tb3ZlW2Jlc3RdO1xuICAgICAgICBjb25zdCBpc0hlYWROb2RlID0gIXRoaXMuaGFzTmV4dChub2RlSWQsIGJlc3QsIGIuZ2V0TW92ZUNudCgpICsgMSkgfHwgbmQudmlzaXRDbnRbYmVzdF0gPCBFWFBBTkRfQ05UIHx8IGIuZ2V0TW92ZUNudCgpID4gX2NvbnN0YW50cy5CVkNOVCAqIDIgfHwgbmV4dE1vdmUgPT09IF9jb25zdGFudHMuUEFTUyAmJiBiLmdldFByZXZNb3ZlKCkgPT09IF9jb25zdGFudHMuUEFTUztcbiAgICAgICAgcmV0dXJuIFtiZXN0LCBuZXh0SWQsIG5leHRNb3ZlLCBpc0hlYWROb2RlXTtcbiAgICB9XG5cbiAgICBzaG91bGRTZWFyY2goYmVzdCwgc2Vjb25kKSB7XG4gICAgICAgIGNvbnN0IG5kID0gdGhpcy5ub2RlW3RoaXMucm9vdElkXTtcbiAgICAgICAgY29uc3Qgd2luUmF0ZSA9IHRoaXMuYnJhbmNoUmF0ZShuZCwgYmVzdCk7XG5cbiAgICAgICAgcmV0dXJuIG5kLnRvdGFsQ250IDw9IDUwMDAgfHwgbmQudmlzaXRDbnRbYmVzdF0gPD0gbmQudmlzaXRDbnRbc2Vjb25kXSAqIDEwMCAmJiB3aW5SYXRlID49IDAuMSAmJiB3aW5SYXRlIDw9IDAuOTtcbiAgICB9XG5cbiAgICBnZXRTZWFyY2hUaW1lKCkge1xuICAgICAgICBpZiAodGhpcy5tYWluVGltZSA9PT0gMC4wIHx8IHRoaXMubGVmdFRpbWUgPCBzZWxmLmJ5b3lvbWkgKiAyLjApIHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLm1heCh0aGlzLmJ5b3lvbWksIDEuMCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5sZWZ0VGltZSAvICg1NS4wICsgTWF0aC5tYXgoNTAgLSB0aGlzLnJvb3RNb3ZlQ250LCAwKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBoYXNOZXh0KG5vZGVJZCwgYnJJZCwgbW92ZUNudCkge1xuICAgICAgICBjb25zdCBuZCA9IHRoaXMubm9kZVtub2RlSWRdO1xuICAgICAgICBjb25zdCBuZXh0SWQgPSBuZC5uZXh0SWRbYnJJZF07XG4gICAgICAgIHJldHVybiBuZXh0SWQgPj0gMCAmJiBuZC5uZXh0SGFzaFticklkXSA9PT0gdGhpcy5ub2RlW25leHRJZF0uaGFzaCAmJiB0aGlzLm5vZGVbbmV4dElkXS5tb3ZlQ250ID09PSBtb3ZlQ250O1xuICAgIH1cblxuICAgIGJyYW5jaFJhdGUobmQsIGlkKSB7XG4gICAgICAgIHJldHVybiBuZC52YWx1ZVdpbltpZF0gLyBNYXRoLm1heChuZC52aXNpdENudFtpZF0sIDEpIC8gMi4wICsgMC41O1xuICAgIH1cblxuICAgIGJlc3RTZXF1ZW5jZShub2RlSWQsIGhlYWRNb3ZlKSB7XG4gICAgICAgIGxldCBzZXFTdHIgPSAoJyAgICcgKyAoMCwgX2Nvb3JkX2NvbnZlcnQuZXYyc3RyKShoZWFkTW92ZSkpLnNsaWNlKC01KTtcbiAgICAgICAgbGV0IG5leHRNb3ZlID0gaGVhZE1vdmU7XG5cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCA3OyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IG5kID0gdGhpcy5ub2RlW25vZGVJZF07XG4gICAgICAgICAgICBpZiAobmV4dE1vdmUgPT09IF9jb25zdGFudHMuUEFTUyB8fCBuZC5icmFuY2hDbnQgPCAxKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGJlc3QgPSAoMCwgX3V0aWxzLmFyZ21heCkobmQudmlzaXRDbnQuc2xpY2UoMCwgbmQuYnJhbmNoQ250KSk7XG4gICAgICAgICAgICBpZiAobmQudmlzaXRDbnRbYmVzdF0gPT09IDApIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5leHRNb3ZlID0gbmQubW92ZVtiZXN0XTtcbiAgICAgICAgICAgIHNlcVN0ciArPSAnLT4nICsgKCcgICAnICsgKDAsIF9jb29yZF9jb252ZXJ0LmV2MnN0cikobmV4dE1vdmUpKS5zbGljZSgtNSk7XG5cbiAgICAgICAgICAgIGlmICghdGhpcy5oYXNOZXh0KG5vZGVJZCwgYmVzdCwgbmQubW92ZUNudCArIDEpKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBub2RlSWQgPSBuZC5uZXh0SWRbYmVzdF07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gc2VxU3RyO1xuICAgIH1cblxuICAgIHByaW50SW5mbyhub2RlSWQpIHtcbiAgICAgICAgY29uc3QgbmQgPSB0aGlzLm5vZGVbbm9kZUlkXTtcbiAgICAgICAgY29uc3Qgb3JkZXIgPSAoMCwgX3V0aWxzLmFyZ3NvcnQpKG5kLnZpc2l0Q250LnNsaWNlKDAsIG5kLmJyYW5jaENudCksIHRydWUpO1xuICAgICAgICBjb25zb2xlLmxvZygnfG1vdmV8Y291bnQgIHxyYXRlIHx2YWx1ZXxwcm9iIHwgYmVzdCBzZXF1ZW5jZScpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IE1hdGgubWluKG9yZGVyLmxlbmd0aCwgOSk7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgbSA9IG9yZGVyW2ldO1xuICAgICAgICAgICAgY29uc3QgdmlzaXRDbnQgPSBuZC52aXNpdENudFttXTtcbiAgICAgICAgICAgIGlmICh2aXNpdENudCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCByYXRlID0gdmlzaXRDbnQgPT09IDAgPyAwLjAgOiB0aGlzLmJyYW5jaFJhdGUobmQsIG0pICogMTAwLjA7XG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9IChuZC52YWx1ZVttXSAvIDIuMCArIDAuNSkgKiAxMDAuMDtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCd8JXN8JXN8JXN8JXN8JXN8ICVzJywgKCcgICAnICsgKDAsIF9jb29yZF9jb252ZXJ0LmV2MnN0cikobmQubW92ZVttXSkpLnNsaWNlKC00KSwgKHZpc2l0Q250ICsgJyAgICAgICcpLnNsaWNlKDAsIDcpLCAoJyAgJyArIHJhdGUudG9GaXhlZCgxKSkuc2xpY2UoLTUpLCAoJyAgJyArIHZhbHVlLnRvRml4ZWQoMSkpLnNsaWNlKC01KSwgKCcgICcgKyAobmQucHJvYlttXSAqIDEwMC4wKS50b0ZpeGVkKDEpKS5zbGljZSgtNSksIHRoaXMuYmVzdFNlcXVlbmNlKG5kLm5leHRJZFttXSwgbmQubW92ZVttXSkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYXN5bmMgcHJlU2VhcmNoKGIpIHtcbiAgICAgICAgY29uc3QgW3Byb2JdID0gYXdhaXQgdGhpcy5ubi5ldmFsdWF0ZShiKTtcbiAgICAgICAgdGhpcy5yb290SWQgPSB0aGlzLmNyZWF0ZU5vZGUoYiwgcHJvYik7XG4gICAgICAgIHRoaXMucm9vdE1vdmVDbnQgPSBiLmdldE1vdmVDbnQoKTtcbiAgICAgICAgVFJFRV9DUCA9IHRoaXMucm9vdE1vdmVDbnQgPCA4ID8gMC4wMSA6IDEuNTtcbiAgICB9XG5cbiAgICBhc3luYyBldmFsdWF0ZUNoaWxkTm9kZShiLCBub2RlSWQsIGNoaWxkKSB7XG4gICAgICAgIGxldCBbcHJvYiwgdmFsdWVdID0gYXdhaXQgdGhpcy5ubi5ldmFsdWF0ZShiKTtcbiAgICAgICAgdGhpcy5ldmFsQ250ICs9IDE7XG4gICAgICAgIHZhbHVlID0gLXZhbHVlWzBdO1xuICAgICAgICBjb25zdCBuZCA9IHRoaXMubm9kZVtub2RlSWRdO1xuICAgICAgICBuZC52YWx1ZVtjaGlsZF0gPSB2YWx1ZTtcbiAgICAgICAgbmQuZXZhbHVhdGVkW2NoaWxkXSA9IHRydWU7XG4gICAgICAgIGlmICh0aGlzLm5vZGVDbnQgPiAwLjg1ICogTUFYX05PREVfQ05UKSB7XG4gICAgICAgICAgICB0aGlzLmRlbGV0ZU5vZGUoKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBuZXh0SWQgPSB0aGlzLmNyZWF0ZU5vZGUoYiwgcHJvYik7XG4gICAgICAgIG5kLm5leHRJZFtjaGlsZF0gPSBuZXh0SWQ7XG4gICAgICAgIG5kLm5leHRIYXNoW2NoaWxkXSA9IGIuaGFzaCgpO1xuICAgICAgICBuZC50b3RhbFZhbHVlIC09IG5kLnZhbHVlV2luW2NoaWxkXTtcbiAgICAgICAgbmQudG90YWxDbnQgKz0gbmQudmlzaXRDbnRbY2hpbGRdO1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuXG4gICAgYXN5bmMgc2VhcmNoQnJhbmNoKGIsIG5vZGVJZCwgcm91dGUpIHtcbiAgICAgICAgY29uc3QgW2Jlc3QsIG5leHRJZCwgbmV4dE1vdmUsIGlzSGVhZE5vZGVdID0gdGhpcy5iZXN0QnlBY3Rpb25WYWx1ZShiLCBub2RlSWQpO1xuICAgICAgICByb3V0ZS5wdXNoKFtub2RlSWQsIGJlc3RdKTtcbiAgICAgICAgYi5wbGF5KG5leHRNb3ZlLCBmYWxzZSk7XG4gICAgICAgIGNvbnN0IG5kID0gdGhpcy5ub2RlW25vZGVJZF07XG4gICAgICAgIGNvbnN0IHZhbHVlID0gaXNIZWFkTm9kZSA/IG5kLmV2YWx1YXRlZFtiZXN0XSA/IG5kLnZhbHVlW2Jlc3RdIDogYXdhaXQgdGhpcy5ldmFsdWF0ZUNoaWxkTm9kZShiLCBub2RlSWQsIGJlc3QpIDogLShhd2FpdCB0aGlzLnNlYXJjaEJyYW5jaChiLCBuZXh0SWQsIHJvdXRlKSk7XG4gICAgICAgIG5kLnRvdGFsVmFsdWUgKz0gdmFsdWU7XG4gICAgICAgIG5kLnRvdGFsQ250ICs9IDE7XG4gICAgICAgIG5kLnZhbHVlV2luW2Jlc3RdICs9IHZhbHVlO1xuICAgICAgICBuZC52aXNpdENudFtiZXN0XSArPSAxO1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuXG4gICAgYXN5bmMga2VlcFBsYXlvdXQoYiwgZXhpdENvbmRpdGlvbikge1xuICAgICAgICBsZXQgc2VhcmNoSWR4ID0gMTtcbiAgICAgICAgdGhpcy5ldmFsQ250ID0gMDtcbiAgICAgICAgbGV0IGJDcHkgPSBuZXcgX2JvYXJkLkJvYXJkKCk7XG4gICAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgICAgICBiLmNvcHlUbyhiQ3B5KTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2VhcmNoQnJhbmNoKGJDcHksIHRoaXMucm9vdElkLCBbXSk7XG4gICAgICAgICAgICBzZWFyY2hJZHggKz0gMTtcbiAgICAgICAgICAgIGlmIChzZWFyY2hJZHggJSA2NCA9PT0gMCAmJiBleGl0Q29uZGl0aW9uKHNlYXJjaElkeCkpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIF9zZWFyY2goYiwgcG9uZGVyLCBjbGVhbiwgZXhpdENvbmRpdGlvbikge1xuICAgICAgICBsZXQgW2Jlc3QsIHNlY29uZF0gPSB0aGlzLm5vZGVbdGhpcy5yb290SWRdLmJlc3QyKCk7XG4gICAgICAgIGlmIChwb25kZXIgfHwgdGhpcy5zaG91bGRTZWFyY2goYmVzdCwgc2Vjb25kKSkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5rZWVwUGxheW91dChiLCBleGl0Q29uZGl0aW9uKTtcbiAgICAgICAgICAgIGNvbnN0IGJlc3QyID0gdGhpcy5ub2RlW3RoaXMucm9vdElkXS5iZXN0MigpO1xuICAgICAgICAgICAgYmVzdCA9IGJlc3QyWzBdO1xuICAgICAgICAgICAgc2Vjb25kID0gYmVzdDJbMV07XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBuZCA9IHRoaXMubm9kZVt0aGlzLnJvb3RJZF07XG4gICAgICAgIGxldCBuZXh0TW92ZSA9IG5kLm1vdmVbYmVzdF07XG4gICAgICAgIGxldCB3aW5SYXRlID0gdGhpcy5icmFuY2hSYXRlKG5kLCBiZXN0KTtcblxuICAgICAgICBpZiAoY2xlYW4gJiYgbmV4dE1vdmUgPT09IF9jb25zdGFudHMuUEFTUyAmJiBuZC52YWx1ZVdpbltiZXN0XSAqIG5kLnZhbHVlV2luW3NlY29uZF0gPiAwLjApIHtcbiAgICAgICAgICAgIG5leHRNb3ZlID0gbmQubW92ZVtzZWNvbmRdO1xuICAgICAgICAgICAgd2luUmF0ZSA9IHRoaXMuYnJhbmNoUmF0ZShuZCwgc2Vjb25kKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gW25leHRNb3ZlLCB3aW5SYXRlXTtcbiAgICB9XG5cbiAgICBhc3luYyBzZWFyY2goYiwgdGltZSwgcG9uZGVyLCBjbGVhbikge1xuICAgICAgICBjb25zdCBzdGFydCA9IERhdGUubm93KCk7XG4gICAgICAgIGF3YWl0IHRoaXMucHJlU2VhcmNoKGIpO1xuXG4gICAgICAgIGlmICh0aGlzLm5vZGVbdGhpcy5yb290SWRdLmJyYW5jaENudCA8PSAxKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnXFxubW92ZSBjb3VudD0lZDonLCB0aGlzLnJvb3RNb3ZlQ250ICsgMSk7XG4gICAgICAgICAgICB0aGlzLnByaW50SW5mbyh0aGlzLnJvb3RJZCk7XG4gICAgICAgICAgICByZXR1cm4gW19jb25zdGFudHMuUEFTUywgMC41XTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZGVsZXRlTm9kZSgpO1xuXG4gICAgICAgIGNvbnN0IHRpbWVfID0gKHRpbWUgPT09IDAuMCA/IHRoaXMuZ2V0U2VhcmNoVGltZSgpIDogdGltZSkgKiAxMDAwO1xuICAgICAgICBpZiAocG9uZGVyKSB7XG4gICAgICAgICAgICBzZWxmLlBPTkRFUl9TVE9QID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgW25leHRNb3ZlLCB3aW5SYXRlXSA9IGF3YWl0IHRoaXMuX3NlYXJjaChiLCBwb25kZXIsIGNsZWFuLCBwb25kZXIgPyBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gc2VsZi5QT05ERVJfU1RPUDtcbiAgICAgICAgfSA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBEYXRlLm5vdygpIC0gc3RhcnQgPiB0aW1lXztcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKCFwb25kZXIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdcXG5tb3ZlIGNvdW50PSVkOiBsZWZ0IHRpbWU9JXNbc2VjXSBldmFsdWF0ZWQ9JWQnLCB0aGlzLnJvb3RNb3ZlQ250ICsgMSwgTWF0aC5tYXgodGhpcy5sZWZ0VGltZSAtIHRpbWUsIDAuMCkudG9GaXhlZCgxKSwgdGhpcy5ldmFsQ250KTtcbiAgICAgICAgICAgIHRoaXMucHJpbnRJbmZvKHRoaXMucm9vdElkKTtcbiAgICAgICAgICAgIHRoaXMubGVmdFRpbWUgPSB0aGlzLmxlZnRUaW1lIC0gKERhdGUubm93KCkgLSBzdGFydCkgLyAxMDAwO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIFtuZXh0TW92ZSwgd2luUmF0ZV07XG4gICAgfVxufVxuXG5leHBvcnRzLlRyZWUgPSBUcmVlO1xuY2xhc3MgTm9kZSB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMubW92ZSA9IG5ldyBVaW50OEFycmF5KF9jb25zdGFudHMuQlZDTlQgKyAxKTtcbiAgICAgICAgdGhpcy5wcm9iID0gbmV3IEZsb2F0MzJBcnJheShfY29uc3RhbnRzLkJWQ05UICsgMSk7XG4gICAgICAgIHRoaXMudmFsdWUgPSBuZXcgRmxvYXQzMkFycmF5KF9jb25zdGFudHMuQlZDTlQgKyAxKTtcbiAgICAgICAgdGhpcy52YWx1ZVdpbiA9IG5ldyBGbG9hdDMyQXJyYXkoX2NvbnN0YW50cy5CVkNOVCArIDEpO1xuICAgICAgICB0aGlzLnZpc2l0Q250ID0gbmV3IFVpbnQzMkFycmF5KF9jb25zdGFudHMuQlZDTlQgKyAxKTtcbiAgICAgICAgdGhpcy5uZXh0SWQgPSBuZXcgSW50MTZBcnJheShfY29uc3RhbnRzLkJWQ05UICsgMSk7XG4gICAgICAgIHRoaXMubmV4dEhhc2ggPSBuZXcgVWludDMyQXJyYXkoX2NvbnN0YW50cy5CVkNOVCArIDEpO1xuICAgICAgICB0aGlzLmV2YWx1YXRlZCA9IFtdO1xuICAgICAgICB0aGlzLmJyYW5jaENudCA9IDA7XG4gICAgICAgIHRoaXMudG90YWxWYWx1ZSA9IDAuMDtcbiAgICAgICAgdGhpcy50b3RhbENudCA9IDA7XG4gICAgICAgIHRoaXMuaGFzaCA9IDA7XG4gICAgICAgIHRoaXMubW92ZUNudCA9IC0xO1xuICAgICAgICB0aGlzLmluaXRCcmFuY2goKTtcbiAgICAgICAgdGhpcy5jbGVhcigpO1xuICAgIH1cblxuICAgIGluaXRCcmFuY2goKSB7XG4gICAgICAgIHRoaXMubW92ZS5maWxsKF9jb25zdGFudHMuVk5VTEwpO1xuICAgICAgICB0aGlzLnByb2IuZmlsbCgwLjApO1xuICAgICAgICB0aGlzLnZhbHVlLmZpbGwoMC4wKTtcbiAgICAgICAgdGhpcy52YWx1ZVdpbi5maWxsKDAuMCk7XG4gICAgICAgIHRoaXMudmlzaXRDbnQuZmlsbCgwKTtcbiAgICAgICAgdGhpcy5uZXh0SWQuZmlsbCgtMSk7XG4gICAgICAgIHRoaXMubmV4dEhhc2guZmlsbCgwKTtcbiAgICAgICAgdGhpcy5ldmFsdWF0ZWQgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBfY29uc3RhbnRzLkJWQ05UICsgMTsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLmV2YWx1YXRlZC5wdXNoKGZhbHNlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNsZWFyKCkge1xuICAgICAgICB0aGlzLmJyYW5jaENudCA9IDA7XG4gICAgICAgIHRoaXMudG90YWxWYWx1ZSA9IDAuMDtcbiAgICAgICAgdGhpcy50b3RhbENudCA9IDA7XG4gICAgICAgIHRoaXMuaGFzaCA9IDA7XG4gICAgICAgIHRoaXMubW92ZUNudCA9IC0xO1xuICAgIH1cblxuICAgIGJlc3QyKCkge1xuICAgICAgICBjb25zdCBvcmRlciA9ICgwLCBfdXRpbHMuYXJnc29ydCkodGhpcy52aXNpdENudC5zbGljZSgwLCB0aGlzLmJyYW5jaENudCksIHRydWUpO1xuICAgICAgICByZXR1cm4gb3JkZXIuc2xpY2UoMCwgMik7XG4gICAgfVxufSIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5TdG9uZUdyb3VwID0gdW5kZWZpbmVkO1xuXG52YXIgX2NvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzLmpzJyk7XG5cbmNsYXNzIFN0b25lR3JvdXAge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLmxpYkNudCA9IF9jb25zdGFudHMuVk5VTEw7XG4gICAgICAgIHRoaXMuc2l6ZSA9IF9jb25zdGFudHMuVk5VTEw7XG4gICAgICAgIHRoaXMudkF0ciA9IF9jb25zdGFudHMuVk5VTEw7XG4gICAgICAgIHRoaXMubGlicyA9IG5ldyBTZXQoKTtcbiAgICB9XG5cbiAgICBnZXRTaXplKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5zaXplO1xuICAgIH1cblxuICAgIGdldExpYkNudCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubGliQ250O1xuICAgIH1cblxuICAgIGdldFZBdHIoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnZBdHI7XG4gICAgfVxuXG4gICAgY2xlYXIoc3RvbmUpIHtcbiAgICAgICAgdGhpcy5saWJDbnQgPSBzdG9uZSA/IDAgOiBfY29uc3RhbnRzLlZOVUxMO1xuICAgICAgICB0aGlzLnNpemUgPSBzdG9uZSA/IDEgOiBfY29uc3RhbnRzLlZOVUxMO1xuICAgICAgICB0aGlzLnZBdHIgPSBfY29uc3RhbnRzLlZOVUxMO1xuICAgICAgICB0aGlzLmxpYnMuY2xlYXIoKTtcbiAgICB9XG5cbiAgICBhZGQodikge1xuICAgICAgICBpZiAodGhpcy5saWJzLmhhcyh2KSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMubGlicy5hZGQodik7XG4gICAgICAgIHRoaXMubGliQ250ICs9IDE7XG4gICAgICAgIHRoaXMudkF0ciA9IHY7XG4gICAgfVxuXG4gICAgc3ViKHYpIHtcbiAgICAgICAgaWYgKCF0aGlzLmxpYnMuaGFzKHYpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5saWJzLmRlbGV0ZSh2KTtcbiAgICAgICAgdGhpcy5saWJDbnQgLT0gMTtcbiAgICB9XG5cbiAgICBtZXJnZShvdGhlcikge1xuICAgICAgICB0aGlzLmxpYnMgPSBuZXcgU2V0KFsuLi50aGlzLmxpYnMsIC4uLm90aGVyLmxpYnNdKTtcbiAgICAgICAgdGhpcy5saWJDbnQgPSB0aGlzLmxpYnMuc2l6ZTtcbiAgICAgICAgdGhpcy5zaXplICs9IG90aGVyLnNpemU7XG4gICAgICAgIGlmICh0aGlzLmxpYkNudCA9PT0gMSkge1xuICAgICAgICAgICAgc2VsZi52QXRyID0gdGhpcy5saWJzWzBdO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgY29weVRvKGRlc3QpIHtcbiAgICAgICAgZGVzdC5saWJDbnQgPSB0aGlzLmxpYkNudDtcbiAgICAgICAgZGVzdC5zaXplID0gdGhpcy5zaXplO1xuICAgICAgICBkZXN0LnZBdHIgPSB0aGlzLnZBdHI7XG4gICAgICAgIGRlc3QubGlicyA9IG5ldyBTZXQodGhpcy5saWJzKTtcbiAgICB9XG59XG5leHBvcnRzLlN0b25lR3JvdXAgPSBTdG9uZUdyb3VwOyIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLnNodWZmbGUgPSBzaHVmZmxlO1xuZXhwb3J0cy5tb3N0Q29tbW9uID0gbW9zdENvbW1vbjtcbmV4cG9ydHMuYXJnc29ydCA9IGFyZ3NvcnQ7XG5leHBvcnRzLmFyZ21heCA9IGFyZ21heDtcbmV4cG9ydHMuaGFzaCA9IGhhc2g7XG5mdW5jdGlvbiBzaHVmZmxlKGFycmF5KSB7XG4gICAgbGV0IG4gPSBhcnJheS5sZW5ndGg7XG4gICAgbGV0IHQ7XG4gICAgbGV0IGk7XG5cbiAgICB3aGlsZSAobikge1xuICAgICAgICBpID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogbi0tKTtcbiAgICAgICAgdCA9IGFycmF5W25dO1xuICAgICAgICBhcnJheVtuXSA9IGFycmF5W2ldO1xuICAgICAgICBhcnJheVtpXSA9IHQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFycmF5O1xufVxuXG5mdW5jdGlvbiBtb3N0Q29tbW9uKGFycmF5KSB7XG4gICAgY29uc3QgbWFwID0gbmV3IE1hcCgpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgZSA9IGFycmF5W2ldO1xuICAgICAgICBpZiAobWFwLmhhcyhlKSkge1xuICAgICAgICAgICAgbWFwLnNldChlLCBtYXAuZ2V0KGUpICsgMSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBtYXAuc2V0KGUsIDEpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGxldCBtYXhLZXk7XG4gICAgbGV0IG1heFZhbHVlID0gLTE7XG4gICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgbWFwLmVudHJpZXMoKSkge1xuICAgICAgICBpZiAodmFsdWUgPiBtYXhWYWx1ZSkge1xuICAgICAgICAgICAgbWF4S2V5ID0ga2V5O1xuICAgICAgICAgICAgbWF4VmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbWF4S2V5O1xufVxuXG5mdW5jdGlvbiBhcmdzb3J0KGFycmF5LCByZXZlcnNlKSB7XG4gICAgY29uc3QgZW4gPSBBcnJheS5mcm9tKGFycmF5KS5tYXAoKGUsIGkpID0+IFtpLCBlXSk7XG4gICAgZW4uc29ydCgoYSwgYikgPT4gcmV2ZXJzZSA/IGJbMV0gLSBhWzFdIDogYVsxXSAtIGJbMV0pO1xuICAgIHJldHVybiBlbi5tYXAoZSA9PiBlWzBdKTtcbn1cblxuZnVuY3Rpb24gYXJnbWF4KGFycmF5KSB7XG4gICAgbGV0IG1heEluZGV4O1xuICAgIGxldCBtYXhWYWx1ZSA9IC1JbmZpbml0eTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IHYgPSBhcnJheVtpXTtcbiAgICAgICAgaWYgKHYgPiBtYXhWYWx1ZSkge1xuICAgICAgICAgICAgbWF4SW5kZXggPSBpO1xuICAgICAgICAgICAgbWF4VmFsdWUgPSB2O1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBtYXhJbmRleDtcbn1cblxuZnVuY3Rpb24gaGFzaChzdHIpIHtcbiAgICBsZXQgaGFzaCA9IDUzODE7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgY2hhciA9IHN0ci5jaGFyQ29kZUF0KGkpO1xuICAgICAgICBoYXNoID0gKGhhc2ggPDwgNSkgKyBoYXNoICsgY2hhcjsgLyogaGFzaCAqIDMzICsgYyAqL1xuICAgICAgICBoYXNoID0gaGFzaCAmIGhhc2g7IC8vIENvbnZlcnQgdG8gMzJiaXQgaW50ZWdlclxuICAgIH1cbiAgICByZXR1cm4gTWF0aC5hYnMoaGFzaCk7XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgX25ldXJhbF9uZXR3b3JrX2NsaWVudCA9IHJlcXVpcmUoJy4vbmV1cmFsX25ldHdvcmtfY2xpZW50LmpzJyk7XG5cbnZhciBfY29vcmRfY29udmVydCA9IHJlcXVpcmUoJy4vY29vcmRfY29udmVydC5qcycpO1xuXG52YXIgX2NvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzLmpzJyk7XG5cbnZhciBfaW50ZXJzZWN0aW9uID0gcmVxdWlyZSgnLi9pbnRlcnNlY3Rpb24uanMnKTtcblxudmFyIF9ib2FyZCA9IHJlcXVpcmUoJy4vYm9hcmQuanMnKTtcblxudmFyIF9zZWFyY2ggPSByZXF1aXJlKCcuL3NlYXJjaC5qcycpO1xuXG4vKiBnbG9iYWwgJCBKR08gQm9hcmRDb250cm9sbGVyIGFkZFByb2NlZHVyZUxpc3RlbmVyICovXG5zZWxmLmltcG9ydFNjcmlwdHMoJ3dvcmtlci1wcm9jZWR1cmUtY2FsbC5qcycpO1xuXG5jbGFzcyBBOUVuZ2luZSB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMuYiA9IG5ldyBfYm9hcmQuQm9hcmQoKTtcbiAgICAgICAgdGhpcy50cmVlID0gbmV3IF9zZWFyY2guVHJlZShubik7XG4gICAgICAgIGFkZFByb2NlZHVyZUxpc3RlbmVyKHNlbGYsIHRoaXMpO1xuICAgIH1cblxuICAgIGNsZWFyKCkge1xuICAgICAgICB0aGlzLmIuY2xlYXIoKTtcbiAgICAgICAgdGhpcy50cmVlLmNsZWFyKCk7XG4gICAgfVxuXG4gICAgdGltZVNldHRpbmdzKG1haW5UaW1lLCBieW95b21pKSB7XG4gICAgICAgIHRoaXMudHJlZS5zZXRUaW1lKG1haW5UaW1lLCBieW95b21pKTtcbiAgICB9XG5cbiAgICBhc3luYyBnZW5tb3ZlKCkge1xuICAgICAgICBjb25zdCBbbW92ZSwgd2luUmF0ZV0gPSBhd2FpdCB0aGlzLmJlc3RNb3ZlKCk7XG4gICAgICAgIGlmICh3aW5SYXRlIDwgMC4xKSB7XG4gICAgICAgICAgICByZXR1cm4gJ3Jlc2lnbic7XG4gICAgICAgIH0gZWxzZSBpZiAobW92ZSA9PT0gX2NvbnN0YW50cy5QQVNTIHx8IHRoaXMuYi5zdGF0ZVttb3ZlXSA9PT0gX2ludGVyc2VjdGlvbi5FTVBUWSkge1xuICAgICAgICAgICAgdGhpcy5iLnBsYXkobW92ZSwgdHJ1ZSk7XG4gICAgICAgICAgICByZXR1cm4gKDAsIF9jb29yZF9jb252ZXJ0LmV2MnN0cikobW92ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZXJyb3InKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCclZCglcykgaXMgbm90IGVtcHR5JywgbW92ZSwgKDAsIF9jb29yZF9jb252ZXJ0LmV2MnN0cikobW92ZSkpO1xuICAgICAgICAgICAgdGhpcy5iLnNob3dib2FyZCgpO1xuICAgICAgICAgICAgY29uc29sZS5sb2codGhpcy5iLmNhbmRpZGF0ZXMoKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwbGF5KGV2KSB7XG4gICAgICAgIHRoaXMuYi5wbGF5KGV2LCBmYWxzZSk7XG4gICAgfVxuXG4gICAgYXN5bmMgYmVzdE1vdmUoKSB7XG4gICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnRyZWUuc2VhcmNoKHRoaXMuYiwgMC4wLCBmYWxzZSwgZmFsc2UpO1xuICAgIH1cblxuICAgIGZpbmFsU2NvcmUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmIuZmluYWxTY29yZSgpO1xuICAgIH1cblxuICAgIGFzeW5jIHBvbmRlcigpIHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMudHJlZS5zZWFyY2godGhpcy5iLCBJbmZpbml0eSwgdHJ1ZSwgZmFsc2UpO1xuICAgIH1cbn1cblxuY29uc3Qgbm4gPSBuZXcgX25ldXJhbF9uZXR3b3JrX2NsaWVudC5OZXVyYWxOZXR3b3JrKCk7XG5jb25zdCBlbmdpbmUgPSBuZXcgQTlFbmdpbmUobm4pOyJdfQ==
