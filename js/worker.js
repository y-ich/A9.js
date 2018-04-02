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

    async evaluate(...inputs) {
        return await this.receiver.call('evaluate', inputs);
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

    stopPonder() {
        self.PONDER_STOP = true;
    }
}

const nn = new _neural_network_client.NeuralNetwork();
const engine = new A9Engine(nn);
},{"./board.js":1,"./constants.js":2,"./coord_convert.js":3,"./intersection.js":4,"./neural_network_client.js":5,"./search.js":6}]},{},[9])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYm9hcmQuanMiLCJzcmMvY29uc3RhbnRzLmpzIiwic3JjL2Nvb3JkX2NvbnZlcnQuanMiLCJzcmMvaW50ZXJzZWN0aW9uLmpzIiwic3JjL25ldXJhbF9uZXR3b3JrX2NsaWVudC5qcyIsInNyYy9zZWFyY2guanMiLCJzcmMvc3RvbmVfZ3JvdXAuanMiLCJzcmMvdXRpbHMuanMiLCJzcmMvd29ya2VyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDamFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc31yZXR1cm4gZX0pKCkiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuQm9hcmQgPSBleHBvcnRzLkNhbmRpZGF0ZXMgPSB1bmRlZmluZWQ7XG5leHBvcnRzLm5laWdoYm9ycyA9IG5laWdoYm9ycztcbmV4cG9ydHMuZGlhZ29uYWxzID0gZGlhZ29uYWxzO1xuXG52YXIgX3V0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xuXG52YXIgX2NvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzLmpzJyk7XG5cbnZhciBfaW50ZXJzZWN0aW9uID0gcmVxdWlyZSgnLi9pbnRlcnNlY3Rpb24uanMnKTtcblxudmFyIF9zdG9uZV9ncm91cCA9IHJlcXVpcmUoJy4vc3RvbmVfZ3JvdXAuanMnKTtcblxudmFyIF9jb29yZF9jb252ZXJ0ID0gcmVxdWlyZSgnLi9jb29yZF9jb252ZXJ0LmpzJyk7XG5cbmZ1bmN0aW9uIG5laWdoYm9ycyh2KSB7XG4gICAgcmV0dXJuIFt2ICsgMSwgdiArIF9jb25zdGFudHMuRUJTSVpFLCB2IC0gMSwgdiAtIF9jb25zdGFudHMuRUJTSVpFXTtcbn1cblxuZnVuY3Rpb24gZGlhZ29uYWxzKHYpIHtcbiAgICByZXR1cm4gW3YgKyBfY29uc3RhbnRzLkVCU0laRSArIDEsIHYgKyBfY29uc3RhbnRzLkVCU0laRSAtIDEsIHYgLSBfY29uc3RhbnRzLkVCU0laRSAtIDEsIHYgLSBfY29uc3RhbnRzLkVCU0laRSArIDFdO1xufVxuXG5jbGFzcyBDYW5kaWRhdGVzIHtcbiAgICBjb25zdHJ1Y3RvcihoYXNoLCBtb3ZlQ250LCBsaXN0KSB7XG4gICAgICAgIHRoaXMuaGFzaCA9IGhhc2g7XG4gICAgICAgIHRoaXMubW92ZUNudCA9IG1vdmVDbnQ7XG4gICAgICAgIHRoaXMubGlzdCA9IGxpc3Q7XG4gICAgfVxufVxuXG5leHBvcnRzLkNhbmRpZGF0ZXMgPSBDYW5kaWRhdGVzO1xuY2xhc3MgQm9hcmQge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLnN0YXRlID0gbmV3IFVpbnQ4QXJyYXkoX2NvbnN0YW50cy5FQlZDTlQpO1xuICAgICAgICB0aGlzLnN0YXRlLmZpbGwoX2ludGVyc2VjdGlvbi5FWFRFUklPUik7XG4gICAgICAgIHRoaXMuaWQgPSBuZXcgVWludDhBcnJheShfY29uc3RhbnRzLkVCVkNOVCk7XG4gICAgICAgIHRoaXMubmV4dCA9IG5ldyBVaW50OEFycmF5KF9jb25zdGFudHMuRUJWQ05UKTtcbiAgICAgICAgdGhpcy5zZyA9IFtdO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IF9jb25zdGFudHMuRUJWQ05UOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMuc2cucHVzaChuZXcgX3N0b25lX2dyb3VwLlN0b25lR3JvdXAoKSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5wcmV2U3RhdGUgPSBbXTtcbiAgICAgICAgdGhpcy5rbyA9IF9jb25zdGFudHMuVk5VTEw7XG4gICAgICAgIHRoaXMudHVybiA9IF9pbnRlcnNlY3Rpb24uQkxBQ0s7XG4gICAgICAgIHRoaXMubW92ZUNudCA9IDA7XG4gICAgICAgIHRoaXMucHJldk1vdmUgPSBfY29uc3RhbnRzLlZOVUxMO1xuICAgICAgICB0aGlzLnJlbW92ZUNudCA9IDA7XG4gICAgICAgIHRoaXMuaGlzdG9yeSA9IFtdO1xuICAgICAgICB0aGlzLmNsZWFyKCk7XG4gICAgfVxuXG4gICAgZ2V0TW92ZUNudCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubW92ZUNudDtcbiAgICB9XG5cbiAgICBnZXRQcmV2TW92ZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucHJldk1vdmU7XG4gICAgfVxuXG4gICAgZ2V0SGlzdG9yeSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaGlzdG9yeTtcbiAgICB9XG5cbiAgICBjbGVhcigpIHtcbiAgICAgICAgZm9yIChsZXQgeCA9IDE7IHggPD0gX2NvbnN0YW50cy5CU0laRTsgeCsrKSB7XG4gICAgICAgICAgICBmb3IgKGxldCB5ID0gMTsgeSA8PSBfY29uc3RhbnRzLkJTSVpFOyB5KyspIHtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlWygwLCBfY29vcmRfY29udmVydC54eTJldikoeCwgeSldID0gX2ludGVyc2VjdGlvbi5FTVBUWTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuaWQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMuaWRbaV0gPSBpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uZXh0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLm5leHRbaV0gPSBpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc2cuZm9yRWFjaChlID0+IHtcbiAgICAgICAgICAgIGUuY2xlYXIoZmFsc2UpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5wcmV2U3RhdGUgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBfY29uc3RhbnRzLktFRVBfUFJFVl9DTlQ7IGkrKykge1xuICAgICAgICAgICAgdGhpcy5wcmV2U3RhdGUucHVzaChuZXcgVWludDhBcnJheSh0aGlzLnN0YXRlKSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5rbyA9IF9jb25zdGFudHMuVk5VTEw7XG4gICAgICAgIHRoaXMudHVybiA9IF9pbnRlcnNlY3Rpb24uQkxBQ0s7XG4gICAgICAgIHRoaXMubW92ZUNudCA9IDA7XG4gICAgICAgIHRoaXMucHJldk1vdmUgPSBfY29uc3RhbnRzLlZOVUxMO1xuICAgICAgICB0aGlzLnJlbW92ZUNudCA9IDA7XG4gICAgICAgIHRoaXMuaGlzdG9yeSA9IFtdO1xuICAgIH1cblxuICAgIGNvcHlUbyhkZXN0KSB7XG4gICAgICAgIGRlc3Quc3RhdGUgPSBuZXcgVWludDhBcnJheSh0aGlzLnN0YXRlKTtcbiAgICAgICAgZGVzdC5pZCA9IG5ldyBVaW50OEFycmF5KHRoaXMuaWQpO1xuICAgICAgICBkZXN0Lm5leHQgPSBuZXcgVWludDhBcnJheSh0aGlzLm5leHQpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRlc3Quc2cubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMuc2dbaV0uY29weVRvKGRlc3Quc2dbaV0pO1xuICAgICAgICB9XG4gICAgICAgIGRlc3QucHJldlN0YXRlID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgX2NvbnN0YW50cy5LRUVQX1BSRVZfQ05UOyBpKyspIHtcbiAgICAgICAgICAgIGRlc3QucHJldlN0YXRlLnB1c2gobmV3IFVpbnQ4QXJyYXkodGhpcy5wcmV2U3RhdGVbaV0pKTtcbiAgICAgICAgfVxuICAgICAgICBkZXN0LmtvID0gdGhpcy5rbztcbiAgICAgICAgZGVzdC50dXJuID0gdGhpcy50dXJuO1xuICAgICAgICBkZXN0Lm1vdmVDbnQgPSB0aGlzLm1vdmVDbnQ7XG4gICAgICAgIGRlc3QucmVtb3ZlQ250ID0gdGhpcy5yZW1vdmVDbnQ7XG4gICAgICAgIGRlc3QuaGlzdG9yeSA9IEFycmF5LmZyb20odGhpcy5oaXN0b3J5KTtcbiAgICB9XG5cbiAgICBwbGF5U2VxdWVuY2Uoc2VxdWVuY2UpIHtcbiAgICAgICAgZm9yIChjb25zdCB2IG9mIHNlcXVlbmNlKSB7XG4gICAgICAgICAgICB0aGlzLnBsYXkodiwgZmFsc2UpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmVtb3ZlKHYpIHtcbiAgICAgICAgbGV0IHZUbXAgPSB2O1xuICAgICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICAgICAgdGhpcy5yZW1vdmVDbnQgKz0gMTtcbiAgICAgICAgICAgIHRoaXMuc3RhdGVbdlRtcF0gPSBfaW50ZXJzZWN0aW9uLkVNUFRZO1xuICAgICAgICAgICAgdGhpcy5pZFt2VG1wXSA9IHZUbXA7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IG52IG9mIG5laWdoYm9ycyh2VG1wKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2dbdGhpcy5pZFtudl1dLmFkZCh2VG1wKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHZOZXh0ID0gdGhpcy5uZXh0W3ZUbXBdO1xuICAgICAgICAgICAgdGhpcy5uZXh0W3ZUbXBdID0gdlRtcDtcbiAgICAgICAgICAgIHZUbXAgPSB2TmV4dDtcbiAgICAgICAgICAgIGlmICh2VG1wID09PSB2KSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBtZXJnZSh2MSwgdjIpIHtcbiAgICAgICAgbGV0IGlkQmFzZSA9IHRoaXMuaWRbdjFdO1xuICAgICAgICBsZXQgaWRBZGQgPSB0aGlzLmlkW3YyXTtcbiAgICAgICAgaWYgKHRoaXMuc2dbaWRCYXNlXS5nZXRTaXplKCkgPCB0aGlzLnNnW2lkQWRkXS5nZXRTaXplKCkpIHtcbiAgICAgICAgICAgIGxldCB0bXAgPSBpZEJhc2U7XG4gICAgICAgICAgICBpZEJhc2UgPSBpZEFkZDtcbiAgICAgICAgICAgIGlkQWRkID0gdG1wO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zZ1tpZEJhc2VdLm1lcmdlKHRoaXMuc2dbaWRBZGRdKTtcblxuICAgICAgICBsZXQgdlRtcCA9IGlkQWRkO1xuICAgICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICAgICAgdGhpcy5pZFt2VG1wXSA9IGlkQmFzZTtcbiAgICAgICAgICAgIHZUbXAgPSB0aGlzLm5leHRbdlRtcF07XG4gICAgICAgICAgICBpZiAodlRtcCA9PT0gaWRBZGQpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjb25zdCB0bXAgPSB0aGlzLm5leHRbdjFdO1xuICAgICAgICB0aGlzLm5leHRbdjFdID0gdGhpcy5uZXh0W3YyXTtcbiAgICAgICAgdGhpcy5uZXh0W3YyXSA9IHRtcDtcbiAgICB9XG5cbiAgICBwbGFjZVN0b25lKHYpIHtcbiAgICAgICAgY29uc3Qgc3RvbmVDb2xvciA9IHRoaXMudHVybjtcbiAgICAgICAgdGhpcy5zdGF0ZVt2XSA9IHN0b25lQ29sb3I7XG4gICAgICAgIHRoaXMuaWRbdl0gPSB2O1xuICAgICAgICB0aGlzLnNnW3RoaXMuaWRbdl1dLmNsZWFyKHRydWUpO1xuICAgICAgICBmb3IgKGNvbnN0IG52IG9mIG5laWdoYm9ycyh2KSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuc3RhdGVbbnZdID09PSBfaW50ZXJzZWN0aW9uLkVNUFRZKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZ1t0aGlzLmlkW3ZdXS5hZGQobnYpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNnW3RoaXMuaWRbbnZdXS5zdWIodik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBudiBvZiBuZWlnaGJvcnModikpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnN0YXRlW252XSA9PT0gc3RvbmVDb2xvciAmJiB0aGlzLmlkW252XSAhPT0gdGhpcy5pZFt2XSkge1xuICAgICAgICAgICAgICAgIHRoaXMubWVyZ2UodiwgbnYpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMucmVtb3ZlQ250ID0gMDtcbiAgICAgICAgY29uc3Qgb3Bwb25lbnRTdG9uZSA9ICgwLCBfaW50ZXJzZWN0aW9uLm9wcG9uZW50T2YpKHRoaXMudHVybik7XG4gICAgICAgIGZvciAoY29uc3QgbnYgb2YgbmVpZ2hib3JzKHYpKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5zdGF0ZVtudl0gPT09IG9wcG9uZW50U3RvbmUgJiYgdGhpcy5zZ1t0aGlzLmlkW252XV0uZ2V0TGliQ250KCkgPT09IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZShudik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBsZWdhbCh2KSB7XG4gICAgICAgIGlmICh2ID09PSBfY29uc3RhbnRzLlBBU1MpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9IGVsc2UgaWYgKHYgPT09IHRoaXMua28gfHwgdGhpcy5zdGF0ZVt2XSAhPT0gX2ludGVyc2VjdGlvbi5FTVBUWSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc3RvbmVDbnQgPSBbMCwgMF07XG4gICAgICAgIGNvbnN0IGF0ckNudCA9IFswLCAwXTtcbiAgICAgICAgZm9yIChjb25zdCBudiBvZiBuZWlnaGJvcnModikpIHtcbiAgICAgICAgICAgIGNvbnN0IGMgPSB0aGlzLnN0YXRlW252XTtcbiAgICAgICAgICAgIHN3aXRjaCAoYykge1xuICAgICAgICAgICAgICAgIGNhc2UgX2ludGVyc2VjdGlvbi5FTVBUWTpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgY2FzZSBfaW50ZXJzZWN0aW9uLkJMQUNLOlxuICAgICAgICAgICAgICAgIGNhc2UgX2ludGVyc2VjdGlvbi5XSElURTpcbiAgICAgICAgICAgICAgICAgICAgc3RvbmVDbnRbY10gKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuc2dbdGhpcy5pZFtudl1dLmdldExpYkNudCgpID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhdHJDbnRbY10gKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhdHJDbnRbKDAsIF9pbnRlcnNlY3Rpb24ub3Bwb25lbnRPZikodGhpcy50dXJuKV0gIT09IDAgfHwgYXRyQ250W3RoaXMudHVybl0gPCBzdG9uZUNudFt0aGlzLnR1cm5dO1xuICAgIH1cblxuICAgIGV5ZXNoYXBlKHYsIHBsKSB7XG4gICAgICAgIGlmICh2ID09PSBfY29uc3RhbnRzLlBBU1MpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IG52IG9mIG5laWdoYm9ycyh2KSkge1xuICAgICAgICAgICAgY29uc3QgYyA9IHRoaXMuc3RhdGVbbnZdO1xuICAgICAgICAgICAgaWYgKGMgPT09IF9pbnRlcnNlY3Rpb24uRU1QVFkgfHwgYyA9PT0gKDAsIF9pbnRlcnNlY3Rpb24ub3Bwb25lbnRPZikocGwpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGRpYWdDbnQgPSBbMCwgMCwgMCwgMF07XG4gICAgICAgIGZvciAoY29uc3QgbnYgb2YgZGlhZ29uYWxzKHYpKSB7XG4gICAgICAgICAgICBkaWFnQ250W3RoaXMuc3RhdGVbbnZdXSArPSAxO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHdlZGdlQ250ID0gZGlhZ0NudFsoMCwgX2ludGVyc2VjdGlvbi5vcHBvbmVudE9mKShwbCldICsgKGRpYWdDbnRbM10gPiAwID8gMSA6IDApO1xuICAgICAgICBpZiAod2VkZ2VDbnQgPT09IDIpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgbnYgb2YgZGlhZ29uYWxzKHYpKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuc3RhdGVbbnZdID09PSAoMCwgX2ludGVyc2VjdGlvbi5vcHBvbmVudE9mKShwbCkgJiYgdGhpcy5zZ1t0aGlzLmlkW252XV0uZ2V0TGliQ250KCkgPT09IDEgJiYgdGhpcy5zZ1t0aGlzLmlkW252XV0uZ2V0VkF0cigpICE9PSB0aGlzLmtvKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gd2VkZ2VDbnQgPCAyO1xuICAgIH1cblxuICAgIHBsYXkodiwgbm90RmlsbEV5ZSkge1xuICAgICAgICBpZiAoIXRoaXMubGVnYWwodikpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobm90RmlsbEV5ZSAmJiB0aGlzLmV5ZXNoYXBlKHYsIHRoaXMudHVybikpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCBpID0gX2NvbnN0YW50cy5LRUVQX1BSRVZfQ05UIC0gMjsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICAgIHRoaXMucHJldlN0YXRlW2kgKyAxXSA9IHRoaXMucHJldlN0YXRlW2ldO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucHJldlN0YXRlWzBdID0gbmV3IFVpbnQ4QXJyYXkodGhpcy5zdGF0ZSk7XG4gICAgICAgIGlmICh2ID09PSBfY29uc3RhbnRzLlBBU1MpIHtcbiAgICAgICAgICAgIHRoaXMua28gPSBfY29uc3RhbnRzLlZOVUxMO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5wbGFjZVN0b25lKHYpO1xuICAgICAgICAgICAgY29uc3QgaWQgPSB0aGlzLmlkW3ZdO1xuICAgICAgICAgICAgdGhpcy5rbyA9IF9jb25zdGFudHMuVk5VTEw7XG4gICAgICAgICAgICBpZiAodGhpcy5yZW1vdmVDbnQgPT09IDEgJiYgdGhpcy5zZ1tpZF0uZ2V0TGliQ250KCkgPT09IDEgJiYgdGhpcy5zZ1tpZF0uZ2V0U2l6ZSgpID09PSAxKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5rbyA9IHRoaXMuc2dbaWRdLmdldFZBdHIoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLnByZXZNb3ZlID0gdjtcbiAgICAgICAgdGhpcy5oaXN0b3J5LnB1c2godik7XG4gICAgICAgIHRoaXMudHVybiA9ICgwLCBfaW50ZXJzZWN0aW9uLm9wcG9uZW50T2YpKHRoaXMudHVybik7XG4gICAgICAgIHRoaXMubW92ZUNudCArPSAxO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICByYW5kb21QbGF5KCkge1xuICAgICAgICBjb25zdCBlbXB0eUxpc3QgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnN0YXRlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5zdGF0ZVtpXSA9PT0gX2ludGVyc2VjdGlvbi5FTVBUWSkge1xuICAgICAgICAgICAgICAgIGVtcHR5TGlzdC5wdXNoKGkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgICgwLCBfdXRpbHMuc2h1ZmZsZSkoZW1wdHlMaXN0KTtcbiAgICAgICAgZm9yIChjb25zdCB2IG9mIGVtcHR5TGlzdCkge1xuICAgICAgICAgICAgaWYgKHRoaXMucGxheSh2LCB0cnVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB2O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMucGxheShfY29uc3RhbnRzLlBBU1MsIHRydWUpO1xuICAgICAgICByZXR1cm4gX2NvbnN0YW50cy5QQVNTO1xuICAgIH1cblxuICAgIHNjb3JlKCkge1xuICAgICAgICBjb25zdCBzdG9uZUNudCA9IFswLCAwXTtcbiAgICAgICAgZm9yIChsZXQgX3YgPSAwOyBfdiA8IF9jb25zdGFudHMuQlZDTlQ7IF92KyspIHtcbiAgICAgICAgICAgIGNvbnN0IHYgPSAoMCwgX2Nvb3JkX2NvbnZlcnQucnYyZXYpKF92KTtcbiAgICAgICAgICAgIGNvbnN0IHMgPSB0aGlzLnN0YXRlW3ZdO1xuICAgICAgICAgICAgaWYgKHMgPT09IF9pbnRlcnNlY3Rpb24uQkxBQ0sgfHwgcyA9PT0gX2ludGVyc2VjdGlvbi5XSElURSkge1xuICAgICAgICAgICAgICAgIHN0b25lQ250W3NdICs9IDE7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ickNudCA9IFswLCAwLCAwLCAwXTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IG52IG9mIG5laWdoYm9ycyh2KSkge1xuICAgICAgICAgICAgICAgICAgICBuYnJDbnRbdGhpcy5zdGF0ZVtudl1dICs9IDE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChuYnJDbnRbX2ludGVyc2VjdGlvbi5XSElURV0gPiAwICYmIG5ickNudFtfaW50ZXJzZWN0aW9uLkJMQUNLXSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBzdG9uZUNudFtfaW50ZXJzZWN0aW9uLldISVRFXSArPSAxO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobmJyQ250W19pbnRlcnNlY3Rpb24uQkxBQ0tdID4gMCAmJiBuYnJDbnRbX2ludGVyc2VjdGlvbi5XSElURV0gPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgc3RvbmVDbnRbX2ludGVyc2VjdGlvbi5CTEFDS10gKz0gMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0b25lQ250WzFdIC0gc3RvbmVDbnRbMF0gLSBfY29uc3RhbnRzLktPTUk7XG4gICAgfVxuXG4gICAgcm9sbG91dChzaG93Qm9hcmQpIHtcbiAgICAgICAgd2hpbGUgKHRoaXMubW92ZUNudCA8IF9jb25zdGFudHMuRUJWQ05UICogMikge1xuICAgICAgICAgICAgY29uc3QgcHJldk1vdmUgPSB0aGlzLnByZXZNb3ZlO1xuICAgICAgICAgICAgY29uc3QgbW92ZSA9IHRoaXMucmFuZG9tUGxheSgpO1xuICAgICAgICAgICAgaWYgKHNob3dCb2FyZCAmJiBtb3ZlICE9PSBfY29uc3RhbnRzLlBBU1MpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnXFxubW92ZSBjb3VudD0lZCcsIHRoaXMubW92ZUNudCk7XG4gICAgICAgICAgICAgICAgdGhpcy5zaG93Ym9hcmQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChwcmV2TW92ZSA9PT0gX2NvbnN0YW50cy5QQVNTICYmIG1vdmUgPT09IF9jb25zdGFudHMuUEFTUykge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgc2hvd2JvYXJkKCkge1xuICAgICAgICBmdW5jdGlvbiBwcmludFhsYWJlbCgpIHtcbiAgICAgICAgICAgIGxldCBsaW5lU3RyID0gJyAgJztcbiAgICAgICAgICAgIGZvciAobGV0IHggPSAxOyB4IDw9IF9jb25zdGFudHMuQlNJWkU7IHgrKykge1xuICAgICAgICAgICAgICAgIGxpbmVTdHIgKz0gYCAke19jb29yZF9jb252ZXJ0LlhfTEFCRUxTW3hdfSBgO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc29sZS5sb2cobGluZVN0cik7XG4gICAgICAgIH1cbiAgICAgICAgcHJpbnRYbGFiZWwoKTtcbiAgICAgICAgZm9yIChsZXQgeSA9IF9jb25zdGFudHMuQlNJWkU7IHkgPiAwOyB5LS0pIHtcbiAgICAgICAgICAgIGxldCBsaW5lU3RyID0gKCcgJyArIHkudG9TdHJpbmcoKSkuc2xpY2UoLTIpO1xuICAgICAgICAgICAgZm9yIChsZXQgeCA9IDE7IHggPD0gX2NvbnN0YW50cy5CU0laRTsgeCsrKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdiA9ICgwLCBfY29vcmRfY29udmVydC54eTJldikoeCwgeSk7XG4gICAgICAgICAgICAgICAgbGV0IHhTdHI7XG4gICAgICAgICAgICAgICAgc3dpdGNoICh0aGlzLnN0YXRlW3ZdKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgX2ludGVyc2VjdGlvbi5CTEFDSzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHhTdHIgPSB2ID09PSB0aGlzLnByZXZNb3ZlID8gJ1tYXScgOiAnIFggJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIF9pbnRlcnNlY3Rpb24uV0hJVEU6XG4gICAgICAgICAgICAgICAgICAgICAgICB4U3RyID0gdiA9PT0gdGhpcy5wcmV2TW92ZSA/ICdbT10nIDogJyBPICc7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBfaW50ZXJzZWN0aW9uLkVNUFRZOlxuICAgICAgICAgICAgICAgICAgICAgICAgeFN0ciA9ICcgLiAnO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICB4U3RyID0gJyA/ICc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGxpbmVTdHIgKz0geFN0cjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxpbmVTdHIgKz0gKCcgJyArIHkudG9TdHJpbmcoKSkuc2xpY2UoLTIpO1xuICAgICAgICAgICAgY29uc29sZS5sb2cobGluZVN0cik7XG4gICAgICAgIH1cbiAgICAgICAgcHJpbnRYbGFiZWwoKTtcbiAgICAgICAgY29uc29sZS5sb2coJycpO1xuICAgIH1cblxuICAgIGZlYXR1cmUoKSB7XG4gICAgICAgIGZ1bmN0aW9uIGluZGV4KHAsIGYpIHtcbiAgICAgICAgICAgIHJldHVybiBwICogX2NvbnN0YW50cy5GRUFUVVJFX0NOVCArIGY7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgYXJyYXkgPSBuZXcgRmxvYXQzMkFycmF5KF9jb25zdGFudHMuQlZDTlQgKiBfY29uc3RhbnRzLkZFQVRVUkVfQ05UKTtcblxuICAgICAgICBjb25zdCBteSA9IHRoaXMudHVybjtcbiAgICAgICAgY29uc3Qgb3BwID0gKDAsIF9pbnRlcnNlY3Rpb24ub3Bwb25lbnRPZikodGhpcy50dXJuKTtcbiAgICAgICAgZm9yIChsZXQgcCA9IDA7IHAgPCBfY29uc3RhbnRzLkJWQ05UOyBwKyspIHtcbiAgICAgICAgICAgIGFycmF5W2luZGV4KHAsIDApXSA9IHRoaXMuc3RhdGVbKDAsIF9jb29yZF9jb252ZXJ0LnJ2MmV2KShwKV0gPT09IG15ID8gMS4wIDogMC4wO1xuICAgICAgICB9XG4gICAgICAgIGZvciAobGV0IHAgPSAwOyBwIDwgX2NvbnN0YW50cy5CVkNOVDsgcCsrKSB7XG4gICAgICAgICAgICBhcnJheVtpbmRleChwLCAxKV0gPSB0aGlzLnN0YXRlWygwLCBfY29vcmRfY29udmVydC5ydjJldikocCldID09PSBvcHAgPyAxLjAgOiAwLjA7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBfY29uc3RhbnRzLktFRVBfUFJFVl9DTlQ7IGkrKykge1xuICAgICAgICAgICAgZm9yIChsZXQgcCA9IDA7IHAgPCBfY29uc3RhbnRzLkJWQ05UOyBwKyspIHtcbiAgICAgICAgICAgICAgICBhcnJheVtpbmRleChwLCAoaSArIDEpICogMildID0gdGhpcy5wcmV2U3RhdGVbaV1bKDAsIF9jb29yZF9jb252ZXJ0LnJ2MmV2KShwKV0gPT09IG15ID8gMS4wIDogMC4wO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChsZXQgcCA9IDA7IHAgPCBfY29uc3RhbnRzLkJWQ05UOyBwKyspIHtcbiAgICAgICAgICAgICAgICBhcnJheVtpbmRleChwLCAoaSArIDEpICogMiArIDEpXSA9IHRoaXMucHJldlN0YXRlW2ldWygwLCBfY29vcmRfY29udmVydC5ydjJldikocCldID09PSBvcHAgPyAxLjAgOiAwLjA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChsZXQgcCA9IDA7IHAgPCBfY29uc3RhbnRzLkJWQ05UOyBwKyspIHtcbiAgICAgICAgICAgIGFycmF5W2luZGV4KHAsIF9jb25zdGFudHMuRkVBVFVSRV9DTlQgLSAxKV0gPSBteTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBhcnJheTtcbiAgICB9XG5cbiAgICBoYXNoKCkge1xuICAgICAgICByZXR1cm4gKDAsIF91dGlscy5oYXNoKSgodGhpcy5zdGF0ZS50b1N0cmluZygpICsgdGhpcy5wcmV2U3RhdGVbMF0udG9TdHJpbmcoKSArIHRoaXMudHVybi50b1N0cmluZygpKS5yZXBsYWNlKCcsJywgJycpKTtcbiAgICB9XG5cbiAgICBjYW5kaWRhdGVzKCkge1xuICAgICAgICBjb25zdCBjYW5kTGlzdCA9IFtdO1xuICAgICAgICBmb3IgKGxldCB2ID0gMDsgdiA8IHRoaXMuc3RhdGUubGVuZ3RoOyB2KyspIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnN0YXRlW3ZdID09PSBfaW50ZXJzZWN0aW9uLkVNUFRZICYmIHRoaXMubGVnYWwodikgJiYgIXRoaXMuZXllc2hhcGUodiwgdGhpcy50dXJuKSkge1xuICAgICAgICAgICAgICAgIGNhbmRMaXN0LnB1c2goKDAsIF9jb29yZF9jb252ZXJ0LmV2MnJ2KSh2KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY2FuZExpc3QucHVzaCgoMCwgX2Nvb3JkX2NvbnZlcnQuZXYycnYpKF9jb25zdGFudHMuUEFTUykpO1xuICAgICAgICByZXR1cm4gbmV3IENhbmRpZGF0ZXModGhpcy5oYXNoKCksIHRoaXMubW92ZUNudCwgY2FuZExpc3QpO1xuICAgIH1cblxuICAgIGZpbmFsU2NvcmUoKSB7XG4gICAgICAgIGNvbnN0IFJPTExfT1VUX05VTSA9IDI1NjtcbiAgICAgICAgY29uc3QgZG91YmxlU2NvcmVMaXN0ID0gW107XG4gICAgICAgIGxldCBiQ3B5ID0gbmV3IEJvYXJkKCk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgUk9MTF9PVVRfTlVNOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMuY29weVRvKGJDcHkpO1xuICAgICAgICAgICAgYkNweS5yb2xsb3V0KGZhbHNlKTtcbiAgICAgICAgICAgIGRvdWJsZVNjb3JlTGlzdC5wdXNoKGJDcHkuc2NvcmUoKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICgwLCBfdXRpbHMubW9zdENvbW1vbikoZG91YmxlU2NvcmVMaXN0KTtcbiAgICB9XG59XG5leHBvcnRzLkJvYXJkID0gQm9hcmQ7IC8qXG4gICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHRlc3RCb2FyZCgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGIgPSBuZXcgQm9hcmQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGIucGxheVNlcXVlbmNlKFsnQTEnLCAnQTInLCAnQTknLCAnQjEnXS5tYXAoc3RyMmV2KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBiLnNob3dib2FyZCgpO1xuICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgIHRlc3RCb2FyZCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAqLyIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuLy8vIOOCs+ODn+OBp+OBmeOAglxuY29uc3QgS09NSSA9IGV4cG9ydHMuS09NSSA9IDcuMDtcblxuLy8vIOeigeebpOOBruOCteOCpOOCuuOBp+OBmeOAglxuY29uc3QgQlNJWkUgPSBleHBvcnRzLkJTSVpFID0gOTtcblxuLy8vIOWkluaeoOOCkuaMgeOBpOaLoeW8teeigeebpOOBruOCteOCpOOCuuOBp+OBmeOAglxuY29uc3QgRUJTSVpFID0gZXhwb3J0cy5FQlNJWkUgPSBCU0laRSArIDI7XG5cbi8vLyDnooHnm6Tjga7kuqTngrnjga7mlbDjgafjgZnjgIJcbmNvbnN0IEJWQ05UID0gZXhwb3J0cy5CVkNOVCA9IEJTSVpFICogQlNJWkU7XG5cbi8vLyDmi6HlvLXnooHnm6Tjga7kuqTngrnjga7mlbDjgafjgZnjgIJcbmNvbnN0IEVCVkNOVCA9IGV4cG9ydHMuRUJWQ05UID0gRUJTSVpFICogRUJTSVpFO1xuXG4vLy8g44OR44K544KS6KGo44GZ57ea5b2i5bqn5qiZ44Gn44GZ44CC6YCa5bi444Gu552A5omL44Gv5ouh5by156KB55uk44Gu57ea5b2i5bqn5qiZ44Gn6KGo44GX44G+44GZ44CCXG4vLyBUT0RPIC0g552A5omL44Gu44Gf44KB44Gr5YiX5oyZ5Z6L44KS5L2c44Gj44Gf44G744GG44GM6Zai5pWw44Gu44K344Kw44OL44OB44Oj44Gv6Kqt44G/44KE44GZ44GE44CCXG5jb25zdCBQQVNTID0gZXhwb3J0cy5QQVNTID0gRUJWQ05UO1xuXG4vLy8g57ea5b2i5bqn5qiZ44Gu44OX44Os44O844K544Ob44Or44OA44O844Gu5pyq5L2/55So44KS56S644GZ5YCk44Gn44GZ44CCXG4vLyBUT0RPIC0g6Kmy5b2T44GZ44KL5aC05omA44GrT3B0aW9uPHVzaXplPuOCkuS9v+OBo+OBn+OBu+OBhuOBjOmWouaVsOOBruOCt+OCsOODi+ODgeODo+OBr+iqreOBv+OChOOBmeOBhOOAglxuY29uc3QgVk5VTEwgPSBleHBvcnRzLlZOVUxMID0gRUJWQ05UICsgMTtcblxuLy8vIE5O44G444Gu5YWl5Yqb44Gr6Zai44GZ44KL5bGl5q2044Gu5rex44GV44Gn44GZ44CCXG5jb25zdCBLRUVQX1BSRVZfQ05UID0gZXhwb3J0cy5LRUVQX1BSRVZfQ05UID0gMjtcblxuLy8vIE5O44G444Gu5YWl5Yqb44OV44Kj44O844OB44Oj44O844Gu5pWw44Gn44GZ44CCXG5jb25zdCBGRUFUVVJFX0NOVCA9IGV4cG9ydHMuRkVBVFVSRV9DTlQgPSBLRUVQX1BSRVZfQ05UICogMiArIDM7IC8vIDciLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuWF9MQUJFTFMgPSB1bmRlZmluZWQ7XG5leHBvcnRzLm1vdmUyeHkgPSBtb3ZlMnh5O1xuZXhwb3J0cy5ldjJ4eSA9IGV2Mnh5O1xuZXhwb3J0cy54eTJldiA9IHh5MmV2O1xuZXhwb3J0cy5ydjJldiA9IHJ2MmV2O1xuZXhwb3J0cy5ldjJydiA9IGV2MnJ2O1xuZXhwb3J0cy5ldjJzdHIgPSBldjJzdHI7XG5leHBvcnRzLnN0cjJldiA9IHN0cjJldjtcblxudmFyIF9jb25zdGFudHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cy5qcycpO1xuXG5jb25zdCBYX0xBQkVMUyA9IGV4cG9ydHMuWF9MQUJFTFMgPSAnQEFCQ0RFRkdISktMTU5PUFFSU1QnO1xuXG5mdW5jdGlvbiBtb3ZlMnh5KHMpIHtcbiAgICBjb25zdCBPRkZTRVQgPSAnYScuY2hhckNvZGVBdCgwKSAtIDE7XG4gICAgcmV0dXJuIFtzLmNoYXJDb2RlQXQoMCkgLSBPRkZTRVQsIF9jb25zdGFudHMuQlNJWkUgKyAxIC0gKHMuY2hhckNvZGVBdCgxKSAtIE9GRlNFVCldO1xufVxuXG5mdW5jdGlvbiBldjJ4eShldikge1xuICAgIHJldHVybiBbZXYgJSBfY29uc3RhbnRzLkVCU0laRSwgTWF0aC5mbG9vcihldiAvIF9jb25zdGFudHMuRUJTSVpFKV07XG59XG5cbmZ1bmN0aW9uIHh5MmV2KHgsIHkpIHtcbiAgICByZXR1cm4geSAqIF9jb25zdGFudHMuRUJTSVpFICsgeDtcbn1cblxuZnVuY3Rpb24gcnYyZXYocnYpIHtcbiAgICByZXR1cm4gcnYgPT09IF9jb25zdGFudHMuQlZDTlQgPyBfY29uc3RhbnRzLlBBU1MgOiBydiAlIF9jb25zdGFudHMuQlNJWkUgKyAxICsgTWF0aC5mbG9vcihydiAvIF9jb25zdGFudHMuQlNJWkUgKyAxKSAqIF9jb25zdGFudHMuRUJTSVpFO1xufVxuXG5mdW5jdGlvbiBldjJydihldikge1xuICAgIHJldHVybiBldiA9PT0gX2NvbnN0YW50cy5QQVNTID8gX2NvbnN0YW50cy5CVkNOVCA6IGV2ICUgX2NvbnN0YW50cy5FQlNJWkUgLSAxICsgTWF0aC5mbG9vcihldiAvIF9jb25zdGFudHMuRUJTSVpFIC0gMSkgKiBfY29uc3RhbnRzLkJTSVpFO1xufVxuXG5mdW5jdGlvbiBldjJzdHIoZXYpIHtcbiAgICBpZiAoZXYgPj0gX2NvbnN0YW50cy5QQVNTKSB7XG4gICAgICAgIHJldHVybiAncGFzcyc7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgW3gsIHldID0gZXYyeHkoZXYpO1xuICAgICAgICByZXR1cm4gWF9MQUJFTFMuY2hhckF0KHgpICsgeS50b1N0cmluZygpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gc3RyMmV2KHYpIHtcbiAgICBjb25zdCB2U3RyID0gdi50b1VwcGVyQ2FzZSgpO1xuICAgIGlmICh2U3RyID09PSAnUEFTUycgfHwgdlN0ciA9PT0gJ1JFU0lHTicpIHtcbiAgICAgICAgcmV0dXJuIF9jb25zdGFudHMuUEFTUztcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCB4ID0gWF9MQUJFTFMuaW5kZXhPZih2U3RyLmNoYXJBdCgwKSk7XG4gICAgICAgIGNvbnN0IHkgPSBwYXJzZUludCh2U3RyLnNsaWNlKDEpKTtcbiAgICAgICAgcmV0dXJuIHh5MmV2KHgsIHkpO1xuICAgIH1cbn0iLCJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5vcHBvbmVudE9mID0gb3Bwb25lbnRPZjtcbmNvbnN0IFdISVRFID0gZXhwb3J0cy5XSElURSA9IDA7XG5jb25zdCBCTEFDSyA9IGV4cG9ydHMuQkxBQ0sgPSAxO1xuXG5mdW5jdGlvbiBvcHBvbmVudE9mKGNvbG9yKSB7XG4gICAgc3dpdGNoIChjb2xvcikge1xuICAgICAgICBjYXNlIFdISVRFOlxuICAgICAgICAgICAgcmV0dXJuIEJMQUNLO1xuICAgICAgICBjYXNlIEJMQUNLOlxuICAgICAgICAgICAgcmV0dXJuIFdISVRFO1xuICAgIH1cbn1cblxuY29uc3QgRU1QVFkgPSBleHBvcnRzLkVNUFRZID0gMjtcbmNvbnN0IEVYVEVSSU9SID0gZXhwb3J0cy5FWFRFUklPUiA9IDM7IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG4vKiBnbG9iYWwgV29ya2VyUHJvY2VkdXJlQ2FsbCAqL1xuXG5jbGFzcyBOZXVyYWxOZXR3b3JrIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpcy5yZWNlaXZlciA9IG5ldyBXb3JrZXJQcm9jZWR1cmVDYWxsKHNlbGYsIHRoaXMuY29uc3RydWN0b3IubmFtZSk7XG4gICAgfVxuXG4gICAgYXN5bmMgZXZhbHVhdGUoLi4uaW5wdXRzKSB7XG4gICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnJlY2VpdmVyLmNhbGwoJ2V2YWx1YXRlJywgaW5wdXRzKTtcbiAgICB9XG59XG5leHBvcnRzLk5ldXJhbE5ldHdvcmsgPSBOZXVyYWxOZXR3b3JrOyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5UcmVlID0gdW5kZWZpbmVkO1xuXG52YXIgX3V0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xuXG52YXIgX2NvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzLmpzJyk7XG5cbnZhciBfY29vcmRfY29udmVydCA9IHJlcXVpcmUoJy4vY29vcmRfY29udmVydC5qcycpO1xuXG52YXIgX2JvYXJkID0gcmVxdWlyZSgnLi9ib2FyZC5qcycpO1xuXG5jb25zdCBNQVhfTk9ERV9DTlQgPSAxNjM4NDtcbmNvbnN0IEVYUEFORF9DTlQgPSA4O1xuXG5sZXQgVFJFRV9DUCA9IDIuMDtcblxuZnVuY3Rpb24gcHJpbnRQcm9iKHByb2IpIHtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IF9jb25zdGFudHMuQlNJWkU7IHkrKykge1xuICAgICAgICBsZXQgc3RyID0gJyc7XG4gICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgX2NvbnN0YW50cy5CU0laRTsgeCsrKSB7XG4gICAgICAgICAgICBzdHIgKz0gKCcgICcgKyBwcm9iW3ggKyB5ICogX2NvbnN0YW50cy5CU0laRV0udG9GaXhlZCgxKSkuc2xpY2UoLTUpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKHN0cik7XG4gICAgfVxuICAgIGNvbnNvbGUubG9nKCdwYXNzPSVzJywgcHJvYltwcm9iLmxlbmd0aCAtIDFdLnRvRml4ZWQoMSkpO1xufVxuXG5jbGFzcyBUcmVlIHtcbiAgICBjb25zdHJ1Y3Rvcihubikge1xuICAgICAgICB0aGlzLm1haW5UaW1lID0gMC4wO1xuICAgICAgICB0aGlzLmJ5b3lvbWkgPSAxLjA7XG4gICAgICAgIHRoaXMubGVmdFRpbWUgPSAwLjA7XG4gICAgICAgIHRoaXMubm9kZSA9IFtdO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IE1BWF9OT0RFX0NOVDsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLm5vZGUucHVzaChuZXcgTm9kZSgpKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLm5vZGVDbnQgPSAwO1xuICAgICAgICB0aGlzLnJvb3RJZCA9IDA7XG4gICAgICAgIHRoaXMucm9vdE1vdmVDbnQgPSAwO1xuICAgICAgICB0aGlzLm5vZGVIYXNocyA9IG5ldyBNYXAoKTtcbiAgICAgICAgdGhpcy5ldmFsQ250ID0gMDtcbiAgICAgICAgdGhpcy5ubiA9IG5uO1xuICAgIH1cblxuICAgIHNldFRpbWUobWFpblRpbWUsIGJ5b3lvbWkpIHtcbiAgICAgICAgdGhpcy5tYWluVGltZSA9IG1haW5UaW1lO1xuICAgICAgICB0aGlzLmxlZnRUaW1lID0gbWFpblRpbWU7XG4gICAgICAgIHRoaXMuYnlveW9taSA9IGJ5b3lvbWk7XG4gICAgfVxuXG4gICAgc2V0TGVmdFRpbWUobGVmdFRpbWUpIHtcbiAgICAgICAgdGhpcy5sZWZ0VGltZSA9IGxlZnRUaW1lO1xuICAgIH1cblxuICAgIGNsZWFyKCkge1xuICAgICAgICB0aGlzLmxlZnRUaW1lID0gdGhpcy5tYWluVGltZTtcbiAgICAgICAgZm9yIChjb25zdCBuZCBvZiB0aGlzLm5vZGUpIHtcbiAgICAgICAgICAgIG5kLmNsZWFyKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5ub2RlQ250ID0gMDtcbiAgICAgICAgdGhpcy5yb290SWQgPSAwO1xuICAgICAgICB0aGlzLnJvb3RNb3ZlQ250ID0gMDtcbiAgICAgICAgdGhpcy5ub2RlSGFzaHMuY2xlYXIoKTtcbiAgICAgICAgdGhpcy5ldmFsQ250ID0gMDtcbiAgICB9XG5cbiAgICBkZWxldGVOb2RlKCkge1xuICAgICAgICBpZiAodGhpcy5ub2RlQ250IDwgTUFYX05PREVfQ05UIC8gMikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgTUFYX05PREVfQ05UOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IG1jID0gdGhpcy5ub2RlW2ldLm1vdmVDbnQ7XG4gICAgICAgICAgICBpZiAobWMgIT0gbnVsbCAmJiBtYyA8IHRoaXMucm9vdE1vdmVDbnQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm5vZGVIYXNocy5kZWxldGUodGhpcy5ub2RlW2ldLmhhc2gpO1xuICAgICAgICAgICAgICAgIHRoaXMubm9kZVtpXS5jbGVhcigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgY3JlYXRlTm9kZShiLCBwcm9iKSB7XG4gICAgICAgIGNvbnN0IGNhbmRpZGF0ZXMgPSBiLmNhbmRpZGF0ZXMoKTtcbiAgICAgICAgY29uc3QgaHMgPSBjYW5kaWRhdGVzLmhhc2g7XG4gICAgICAgIGlmICh0aGlzLm5vZGVIYXNocy5oYXMoaHMpICYmIHRoaXMubm9kZVt0aGlzLm5vZGVIYXNoc1toc11dLmhhc2ggPT09IGhzICYmIHRoaXMubm9kZVt0aGlzLm5vZGVIYXNoc1toc11dLm1vdmVDbnQgPT09IGNhbmRpZGF0ZXMubW92ZUNudCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubm9kZUhhc2hzW2hzXTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBub2RlSWQgPSBocyAlIE1BWF9OT0RFX0NOVDtcblxuICAgICAgICB3aGlsZSAodGhpcy5ub2RlW25vZGVJZF0ubW92ZUNudCAhPSAtMSkge1xuICAgICAgICAgICAgbm9kZUlkID0gbm9kZUlkICsgMSA8IE1BWF9OT0RFX0NOVCA/IG5vZGVJZCArIDEgOiAwO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5ub2RlSGFzaHNbaHNdID0gbm9kZUlkO1xuICAgICAgICB0aGlzLm5vZGVDbnQgKz0gMTtcblxuICAgICAgICBjb25zdCBuZCA9IHRoaXMubm9kZVtub2RlSWRdO1xuICAgICAgICBuZC5jbGVhcigpO1xuICAgICAgICBuZC5tb3ZlQ250ID0gY2FuZGlkYXRlcy5tb3ZlQ250O1xuICAgICAgICBuZC5oYXNoID0gaHM7XG4gICAgICAgIG5kLmluaXRCcmFuY2goKTtcblxuICAgICAgICBmb3IgKGNvbnN0IHJ2IG9mICgwLCBfdXRpbHMuYXJnc29ydCkocHJvYiwgdHJ1ZSkpIHtcbiAgICAgICAgICAgIGlmIChjYW5kaWRhdGVzLmxpc3QuaW5jbHVkZXMocnYpKSB7XG4gICAgICAgICAgICAgICAgbmQubW92ZVtuZC5icmFuY2hDbnRdID0gKDAsIF9jb29yZF9jb252ZXJ0LnJ2MmV2KShydik7XG4gICAgICAgICAgICAgICAgbmQucHJvYltuZC5icmFuY2hDbnRdID0gcHJvYltydl07XG4gICAgICAgICAgICAgICAgbmQuYnJhbmNoQ250ICs9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5vZGVJZDtcbiAgICB9XG5cbiAgICBiZXN0QnlVQ0IoYiwgbm9kZUlkKSB7XG4gICAgICAgIGNvbnN0IG5kID0gdGhpcy5ub2RlW25vZGVJZF07XG4gICAgICAgIGNvbnN0IG5kUmF0ZSA9IG5kLnRvdGFsQ250ID09PSAwID8gMC4wIDogbmQudG90YWxWYWx1ZSAvIG5kLnRvdGFsQ250O1xuICAgICAgICBjb25zdCBjcHN2ID0gVFJFRV9DUCAqIE1hdGguc3FydChuZC50b3RhbENudCk7XG4gICAgICAgIGNvbnN0IGFjdGlvblZhbHVlID0gbmV3IEZsb2F0MzJBcnJheShfY29uc3RhbnRzLkJWQ05UICsgMSk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYWN0aW9uVmFsdWUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFjdGlvblZhbHVlW2ldID0gbmQudmlzaXRDbnRbaV0gPT09IDAgPyBuZFJhdGUgOiBuZC52YWx1ZVdpbltpXSAvIG5kLnZpc2l0Q250W2ldO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHVjYiA9IG5ldyBGbG9hdDMyQXJyYXkobmQuYnJhbmNoQ250KTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB1Y2IubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHVjYltpXSA9IGFjdGlvblZhbHVlW2ldICsgY3BzdiAqIG5kLnByb2JbaV0gLyAobmQudmlzaXRDbnRbaV0gKyAxKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBiZXN0ID0gKDAsIF91dGlscy5hcmdtYXgpKHVjYik7XG4gICAgICAgIGNvbnN0IG5leHRJZCA9IG5kLm5leHRJZFtiZXN0XTtcbiAgICAgICAgY29uc3QgbmV4dE1vdmUgPSBuZC5tb3ZlW2Jlc3RdO1xuICAgICAgICBjb25zdCBpc0hlYWROb2RlID0gIXRoaXMuaGFzTmV4dChub2RlSWQsIGJlc3QsIGIuZ2V0TW92ZUNudCgpICsgMSkgfHwgbmQudmlzaXRDbnRbYmVzdF0gPCBFWFBBTkRfQ05UIHx8IGIuZ2V0TW92ZUNudCgpID4gX2NvbnN0YW50cy5CVkNOVCAqIDIgfHwgbmV4dE1vdmUgPT09IF9jb25zdGFudHMuUEFTUyAmJiBiLmdldFByZXZNb3ZlKCkgPT09IF9jb25zdGFudHMuUEFTUztcbiAgICAgICAgcmV0dXJuIFtiZXN0LCBuZXh0SWQsIG5leHRNb3ZlLCBpc0hlYWROb2RlXTtcbiAgICB9XG5cbiAgICBzaG91bGRTZWFyY2goYmVzdCwgc2Vjb25kKSB7XG4gICAgICAgIGNvbnN0IG5kID0gdGhpcy5ub2RlW3RoaXMucm9vdElkXTtcbiAgICAgICAgY29uc3Qgd2luUmF0ZSA9IHRoaXMuYnJhbmNoUmF0ZShuZCwgYmVzdCk7XG5cbiAgICAgICAgcmV0dXJuIG5kLnRvdGFsQ250IDw9IDUwMDAgfHwgbmQudmlzaXRDbnRbYmVzdF0gPD0gbmQudmlzaXRDbnRbc2Vjb25kXSAqIDEwMCAmJiB3aW5SYXRlID49IDAuMSAmJiB3aW5SYXRlIDw9IDAuOTtcbiAgICB9XG5cbiAgICBnZXRTZWFyY2hUaW1lKCkge1xuICAgICAgICBpZiAodGhpcy5tYWluVGltZSA9PT0gMC4wIHx8IHRoaXMubGVmdFRpbWUgPCBzZWxmLmJ5b3lvbWkgKiAyLjApIHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLm1heCh0aGlzLmJ5b3lvbWksIDEuMCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5sZWZ0VGltZSAvICg1NS4wICsgTWF0aC5tYXgoNTAgLSB0aGlzLnJvb3RNb3ZlQ250LCAwKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBoYXNOZXh0KG5vZGVJZCwgYnJJZCwgbW92ZUNudCkge1xuICAgICAgICBjb25zdCBuZCA9IHRoaXMubm9kZVtub2RlSWRdO1xuICAgICAgICBjb25zdCBuZXh0SWQgPSBuZC5uZXh0SWRbYnJJZF07XG4gICAgICAgIHJldHVybiBuZXh0SWQgPj0gMCAmJiBuZC5uZXh0SGFzaFticklkXSA9PT0gdGhpcy5ub2RlW25leHRJZF0uaGFzaCAmJiB0aGlzLm5vZGVbbmV4dElkXS5tb3ZlQ250ID09PSBtb3ZlQ250O1xuICAgIH1cblxuICAgIGJyYW5jaFJhdGUobmQsIGlkKSB7XG4gICAgICAgIHJldHVybiBuZC52YWx1ZVdpbltpZF0gLyBNYXRoLm1heChuZC52aXNpdENudFtpZF0sIDEpIC8gMi4wICsgMC41O1xuICAgIH1cblxuICAgIGJlc3RTZXF1ZW5jZShub2RlSWQsIGhlYWRNb3ZlKSB7XG4gICAgICAgIGxldCBzZXFTdHIgPSAoJyAgICcgKyAoMCwgX2Nvb3JkX2NvbnZlcnQuZXYyc3RyKShoZWFkTW92ZSkpLnNsaWNlKC01KTtcbiAgICAgICAgbGV0IG5leHRNb3ZlID0gaGVhZE1vdmU7XG5cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCA3OyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IG5kID0gdGhpcy5ub2RlW25vZGVJZF07XG4gICAgICAgICAgICBpZiAobmV4dE1vdmUgPT09IF9jb25zdGFudHMuUEFTUyB8fCBuZC5icmFuY2hDbnQgPCAxKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGJlc3QgPSAoMCwgX3V0aWxzLmFyZ21heCkobmQudmlzaXRDbnQuc2xpY2UoMCwgbmQuYnJhbmNoQ250KSk7XG4gICAgICAgICAgICBpZiAobmQudmlzaXRDbnRbYmVzdF0gPT09IDApIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5leHRNb3ZlID0gbmQubW92ZVtiZXN0XTtcbiAgICAgICAgICAgIHNlcVN0ciArPSAnLT4nICsgKCcgICAnICsgKDAsIF9jb29yZF9jb252ZXJ0LmV2MnN0cikobmV4dE1vdmUpKS5zbGljZSgtNSk7XG5cbiAgICAgICAgICAgIGlmICghdGhpcy5oYXNOZXh0KG5vZGVJZCwgYmVzdCwgbmQubW92ZUNudCArIDEpKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBub2RlSWQgPSBuZC5uZXh0SWRbYmVzdF07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gc2VxU3RyO1xuICAgIH1cblxuICAgIHByaW50SW5mbyhub2RlSWQpIHtcbiAgICAgICAgY29uc3QgbmQgPSB0aGlzLm5vZGVbbm9kZUlkXTtcbiAgICAgICAgY29uc3Qgb3JkZXIgPSAoMCwgX3V0aWxzLmFyZ3NvcnQpKG5kLnZpc2l0Q250LnNsaWNlKDAsIG5kLmJyYW5jaENudCksIHRydWUpO1xuICAgICAgICBjb25zb2xlLmxvZygnfG1vdmV8Y291bnQgIHxyYXRlIHx2YWx1ZXxwcm9iIHwgYmVzdCBzZXF1ZW5jZScpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IE1hdGgubWluKG9yZGVyLmxlbmd0aCwgOSk7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgbSA9IG9yZGVyW2ldO1xuICAgICAgICAgICAgY29uc3QgdmlzaXRDbnQgPSBuZC52aXNpdENudFttXTtcbiAgICAgICAgICAgIGlmICh2aXNpdENudCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCByYXRlID0gdmlzaXRDbnQgPT09IDAgPyAwLjAgOiB0aGlzLmJyYW5jaFJhdGUobmQsIG0pICogMTAwLjA7XG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9IChuZC52YWx1ZVttXSAvIDIuMCArIDAuNSkgKiAxMDAuMDtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCd8JXN8JXN8JXN8JXN8JXN8ICVzJywgKCcgICAnICsgKDAsIF9jb29yZF9jb252ZXJ0LmV2MnN0cikobmQubW92ZVttXSkpLnNsaWNlKC00KSwgKHZpc2l0Q250ICsgJyAgICAgICcpLnNsaWNlKDAsIDcpLCAoJyAgJyArIHJhdGUudG9GaXhlZCgxKSkuc2xpY2UoLTUpLCAoJyAgJyArIHZhbHVlLnRvRml4ZWQoMSkpLnNsaWNlKC01KSwgKCcgICcgKyAobmQucHJvYlttXSAqIDEwMC4wKS50b0ZpeGVkKDEpKS5zbGljZSgtNSksIHRoaXMuYmVzdFNlcXVlbmNlKG5kLm5leHRJZFttXSwgbmQubW92ZVttXSkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYXN5bmMgcHJlU2VhcmNoKGIpIHtcbiAgICAgICAgY29uc3QgW3Byb2JdID0gYXdhaXQgdGhpcy5ubi5ldmFsdWF0ZShiLmZlYXR1cmUoKSk7XG4gICAgICAgIHRoaXMucm9vdElkID0gdGhpcy5jcmVhdGVOb2RlKGIsIHByb2IpO1xuICAgICAgICB0aGlzLnJvb3RNb3ZlQ250ID0gYi5nZXRNb3ZlQ250KCk7XG4gICAgICAgIFRSRUVfQ1AgPSB0aGlzLnJvb3RNb3ZlQ250IDwgOCA/IDAuMDEgOiAxLjU7XG4gICAgfVxuXG4gICAgYXN5bmMgZXZhbHVhdGVDaGlsZE5vZGUoYiwgbm9kZUlkLCBjaGlsZCkge1xuICAgICAgICBsZXQgW3Byb2IsIHZhbHVlXSA9IGF3YWl0IHRoaXMubm4uZXZhbHVhdGUoYi5mZWF0dXJlKCkpO1xuICAgICAgICB0aGlzLmV2YWxDbnQgKz0gMTtcbiAgICAgICAgdmFsdWUgPSAtdmFsdWVbMF07XG4gICAgICAgIGNvbnN0IG5kID0gdGhpcy5ub2RlW25vZGVJZF07XG4gICAgICAgIG5kLnZhbHVlW2NoaWxkXSA9IHZhbHVlO1xuICAgICAgICBuZC5ldmFsdWF0ZWRbY2hpbGRdID0gdHJ1ZTtcbiAgICAgICAgaWYgKHRoaXMubm9kZUNudCA+IDAuODUgKiBNQVhfTk9ERV9DTlQpIHtcbiAgICAgICAgICAgIHRoaXMuZGVsZXRlTm9kZSgpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG5leHRJZCA9IHRoaXMuY3JlYXRlTm9kZShiLCBwcm9iKTtcbiAgICAgICAgbmQubmV4dElkW2NoaWxkXSA9IG5leHRJZDtcbiAgICAgICAgbmQubmV4dEhhc2hbY2hpbGRdID0gYi5oYXNoKCk7XG4gICAgICAgIG5kLnRvdGFsVmFsdWUgLT0gbmQudmFsdWVXaW5bY2hpbGRdO1xuICAgICAgICBuZC50b3RhbENudCArPSBuZC52aXNpdENudFtjaGlsZF07XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG5cbiAgICBhc3luYyBzZWFyY2hCcmFuY2goYiwgbm9kZUlkLCByb3V0ZSkge1xuICAgICAgICBjb25zdCBbYmVzdCwgbmV4dElkLCBuZXh0TW92ZSwgaXNIZWFkTm9kZV0gPSB0aGlzLmJlc3RCeVVDQihiLCBub2RlSWQpO1xuICAgICAgICByb3V0ZS5wdXNoKFtub2RlSWQsIGJlc3RdKTtcbiAgICAgICAgYi5wbGF5KG5leHRNb3ZlLCBmYWxzZSk7XG4gICAgICAgIGNvbnN0IG5kID0gdGhpcy5ub2RlW25vZGVJZF07XG4gICAgICAgIGNvbnN0IHZhbHVlID0gaXNIZWFkTm9kZSA/IG5kLmV2YWx1YXRlZFtiZXN0XSA/IG5kLnZhbHVlW2Jlc3RdIDogYXdhaXQgdGhpcy5ldmFsdWF0ZUNoaWxkTm9kZShiLCBub2RlSWQsIGJlc3QpIDogLShhd2FpdCB0aGlzLnNlYXJjaEJyYW5jaChiLCBuZXh0SWQsIHJvdXRlKSk7XG4gICAgICAgIG5kLnRvdGFsVmFsdWUgKz0gdmFsdWU7XG4gICAgICAgIG5kLnRvdGFsQ250ICs9IDE7XG4gICAgICAgIG5kLnZhbHVlV2luW2Jlc3RdICs9IHZhbHVlO1xuICAgICAgICBuZC52aXNpdENudFtiZXN0XSArPSAxO1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuXG4gICAgYXN5bmMga2VlcFBsYXlvdXQoYiwgZXhpdENvbmRpdGlvbikge1xuICAgICAgICBsZXQgc2VhcmNoSWR4ID0gMTtcbiAgICAgICAgdGhpcy5ldmFsQ250ID0gMDtcbiAgICAgICAgbGV0IGJDcHkgPSBuZXcgX2JvYXJkLkJvYXJkKCk7XG4gICAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgICAgICBiLmNvcHlUbyhiQ3B5KTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2VhcmNoQnJhbmNoKGJDcHksIHRoaXMucm9vdElkLCBbXSk7XG4gICAgICAgICAgICBzZWFyY2hJZHggKz0gMTtcbiAgICAgICAgICAgIGlmIChzZWFyY2hJZHggJSA2NCA9PT0gMCAmJiBleGl0Q29uZGl0aW9uKHNlYXJjaElkeCkpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIF9zZWFyY2goYiwgcG9uZGVyLCBjbGVhbiwgZXhpdENvbmRpdGlvbikge1xuICAgICAgICBsZXQgW2Jlc3QsIHNlY29uZF0gPSB0aGlzLm5vZGVbdGhpcy5yb290SWRdLmJlc3QyKCk7XG4gICAgICAgIGlmIChwb25kZXIgfHwgdGhpcy5zaG91bGRTZWFyY2goYmVzdCwgc2Vjb25kKSkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5rZWVwUGxheW91dChiLCBleGl0Q29uZGl0aW9uKTtcbiAgICAgICAgICAgIGNvbnN0IGJlc3QyID0gdGhpcy5ub2RlW3RoaXMucm9vdElkXS5iZXN0MigpO1xuICAgICAgICAgICAgYmVzdCA9IGJlc3QyWzBdO1xuICAgICAgICAgICAgc2Vjb25kID0gYmVzdDJbMV07XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBuZCA9IHRoaXMubm9kZVt0aGlzLnJvb3RJZF07XG4gICAgICAgIGxldCBuZXh0TW92ZSA9IG5kLm1vdmVbYmVzdF07XG4gICAgICAgIGxldCB3aW5SYXRlID0gdGhpcy5icmFuY2hSYXRlKG5kLCBiZXN0KTtcblxuICAgICAgICBpZiAoY2xlYW4gJiYgbmV4dE1vdmUgPT09IF9jb25zdGFudHMuUEFTUyAmJiBuZC52YWx1ZVdpbltiZXN0XSAqIG5kLnZhbHVlV2luW3NlY29uZF0gPiAwLjApIHtcbiAgICAgICAgICAgIG5leHRNb3ZlID0gbmQubW92ZVtzZWNvbmRdO1xuICAgICAgICAgICAgd2luUmF0ZSA9IHRoaXMuYnJhbmNoUmF0ZShuZCwgc2Vjb25kKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gW25leHRNb3ZlLCB3aW5SYXRlXTtcbiAgICB9XG5cbiAgICBhc3luYyBzZWFyY2goYiwgdGltZSwgcG9uZGVyLCBjbGVhbikge1xuICAgICAgICBjb25zdCBzdGFydCA9IERhdGUubm93KCk7XG4gICAgICAgIGF3YWl0IHRoaXMucHJlU2VhcmNoKGIpO1xuXG4gICAgICAgIGlmICh0aGlzLm5vZGVbdGhpcy5yb290SWRdLmJyYW5jaENudCA8PSAxKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnXFxubW92ZSBjb3VudD0lZDonLCB0aGlzLnJvb3RNb3ZlQ250ICsgMSk7XG4gICAgICAgICAgICB0aGlzLnByaW50SW5mbyh0aGlzLnJvb3RJZCk7XG4gICAgICAgICAgICByZXR1cm4gW19jb25zdGFudHMuUEFTUywgMC41XTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZGVsZXRlTm9kZSgpO1xuXG4gICAgICAgIGNvbnN0IHRpbWVfID0gKHRpbWUgPT09IDAuMCA/IHRoaXMuZ2V0U2VhcmNoVGltZSgpIDogdGltZSkgKiAxMDAwO1xuICAgICAgICBpZiAocG9uZGVyKSB7XG4gICAgICAgICAgICBzZWxmLlBPTkRFUl9TVE9QID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgW25leHRNb3ZlLCB3aW5SYXRlXSA9IGF3YWl0IHRoaXMuX3NlYXJjaChiLCBwb25kZXIsIGNsZWFuLCBwb25kZXIgPyBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gc2VsZi5QT05ERVJfU1RPUDtcbiAgICAgICAgfSA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBEYXRlLm5vdygpIC0gc3RhcnQgPiB0aW1lXztcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKCFwb25kZXIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdcXG5tb3ZlIGNvdW50PSVkOiBsZWZ0IHRpbWU9JXNbc2VjXSBldmFsdWF0ZWQ9JWQnLCB0aGlzLnJvb3RNb3ZlQ250ICsgMSwgTWF0aC5tYXgodGhpcy5sZWZ0VGltZSAtIHRpbWUsIDAuMCkudG9GaXhlZCgxKSwgdGhpcy5ldmFsQ250KTtcbiAgICAgICAgICAgIHRoaXMucHJpbnRJbmZvKHRoaXMucm9vdElkKTtcbiAgICAgICAgICAgIHRoaXMubGVmdFRpbWUgPSB0aGlzLmxlZnRUaW1lIC0gKERhdGUubm93KCkgLSBzdGFydCkgLyAxMDAwO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIFtuZXh0TW92ZSwgd2luUmF0ZV07XG4gICAgfVxufVxuXG5leHBvcnRzLlRyZWUgPSBUcmVlO1xuY2xhc3MgTm9kZSB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMubW92ZSA9IG5ldyBVaW50OEFycmF5KF9jb25zdGFudHMuQlZDTlQgKyAxKTtcbiAgICAgICAgdGhpcy5wcm9iID0gbmV3IEZsb2F0MzJBcnJheShfY29uc3RhbnRzLkJWQ05UICsgMSk7XG4gICAgICAgIHRoaXMudmFsdWUgPSBuZXcgRmxvYXQzMkFycmF5KF9jb25zdGFudHMuQlZDTlQgKyAxKTtcbiAgICAgICAgdGhpcy52YWx1ZVdpbiA9IG5ldyBGbG9hdDMyQXJyYXkoX2NvbnN0YW50cy5CVkNOVCArIDEpO1xuICAgICAgICB0aGlzLnZpc2l0Q250ID0gbmV3IFVpbnQzMkFycmF5KF9jb25zdGFudHMuQlZDTlQgKyAxKTtcbiAgICAgICAgdGhpcy5uZXh0SWQgPSBuZXcgSW50MTZBcnJheShfY29uc3RhbnRzLkJWQ05UICsgMSk7XG4gICAgICAgIHRoaXMubmV4dEhhc2ggPSBuZXcgVWludDMyQXJyYXkoX2NvbnN0YW50cy5CVkNOVCArIDEpO1xuICAgICAgICB0aGlzLmV2YWx1YXRlZCA9IFtdO1xuICAgICAgICB0aGlzLmJyYW5jaENudCA9IDA7XG4gICAgICAgIHRoaXMudG90YWxWYWx1ZSA9IDAuMDtcbiAgICAgICAgdGhpcy50b3RhbENudCA9IDA7XG4gICAgICAgIHRoaXMuaGFzaCA9IDA7XG4gICAgICAgIHRoaXMubW92ZUNudCA9IC0xO1xuICAgICAgICB0aGlzLmluaXRCcmFuY2goKTtcbiAgICAgICAgdGhpcy5jbGVhcigpO1xuICAgIH1cblxuICAgIGluaXRCcmFuY2goKSB7XG4gICAgICAgIHRoaXMubW92ZS5maWxsKF9jb25zdGFudHMuVk5VTEwpO1xuICAgICAgICB0aGlzLnByb2IuZmlsbCgwLjApO1xuICAgICAgICB0aGlzLnZhbHVlLmZpbGwoMC4wKTtcbiAgICAgICAgdGhpcy52YWx1ZVdpbi5maWxsKDAuMCk7XG4gICAgICAgIHRoaXMudmlzaXRDbnQuZmlsbCgwKTtcbiAgICAgICAgdGhpcy5uZXh0SWQuZmlsbCgtMSk7XG4gICAgICAgIHRoaXMubmV4dEhhc2guZmlsbCgwKTtcbiAgICAgICAgdGhpcy5ldmFsdWF0ZWQgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBfY29uc3RhbnRzLkJWQ05UICsgMTsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLmV2YWx1YXRlZC5wdXNoKGZhbHNlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNsZWFyKCkge1xuICAgICAgICB0aGlzLmJyYW5jaENudCA9IDA7XG4gICAgICAgIHRoaXMudG90YWxWYWx1ZSA9IDAuMDtcbiAgICAgICAgdGhpcy50b3RhbENudCA9IDA7XG4gICAgICAgIHRoaXMuaGFzaCA9IDA7XG4gICAgICAgIHRoaXMubW92ZUNudCA9IC0xO1xuICAgIH1cblxuICAgIGJlc3QyKCkge1xuICAgICAgICBjb25zdCBvcmRlciA9ICgwLCBfdXRpbHMuYXJnc29ydCkodGhpcy52aXNpdENudC5zbGljZSgwLCB0aGlzLmJyYW5jaENudCksIHRydWUpO1xuICAgICAgICByZXR1cm4gb3JkZXIuc2xpY2UoMCwgMik7XG4gICAgfVxufSIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5TdG9uZUdyb3VwID0gdW5kZWZpbmVkO1xuXG52YXIgX2NvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzLmpzJyk7XG5cbmNsYXNzIFN0b25lR3JvdXAge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLmxpYkNudCA9IF9jb25zdGFudHMuVk5VTEw7XG4gICAgICAgIHRoaXMuc2l6ZSA9IF9jb25zdGFudHMuVk5VTEw7XG4gICAgICAgIHRoaXMudkF0ciA9IF9jb25zdGFudHMuVk5VTEw7XG4gICAgICAgIHRoaXMubGlicyA9IG5ldyBTZXQoKTtcbiAgICB9XG5cbiAgICBnZXRTaXplKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5zaXplO1xuICAgIH1cblxuICAgIGdldExpYkNudCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubGliQ250O1xuICAgIH1cblxuICAgIGdldFZBdHIoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnZBdHI7XG4gICAgfVxuXG4gICAgY2xlYXIoc3RvbmUpIHtcbiAgICAgICAgdGhpcy5saWJDbnQgPSBzdG9uZSA/IDAgOiBfY29uc3RhbnRzLlZOVUxMO1xuICAgICAgICB0aGlzLnNpemUgPSBzdG9uZSA/IDEgOiBfY29uc3RhbnRzLlZOVUxMO1xuICAgICAgICB0aGlzLnZBdHIgPSBfY29uc3RhbnRzLlZOVUxMO1xuICAgICAgICB0aGlzLmxpYnMuY2xlYXIoKTtcbiAgICB9XG5cbiAgICBhZGQodikge1xuICAgICAgICBpZiAodGhpcy5saWJzLmhhcyh2KSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMubGlicy5hZGQodik7XG4gICAgICAgIHRoaXMubGliQ250ICs9IDE7XG4gICAgICAgIHRoaXMudkF0ciA9IHY7XG4gICAgfVxuXG4gICAgc3ViKHYpIHtcbiAgICAgICAgaWYgKCF0aGlzLmxpYnMuaGFzKHYpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5saWJzLmRlbGV0ZSh2KTtcbiAgICAgICAgdGhpcy5saWJDbnQgLT0gMTtcbiAgICB9XG5cbiAgICBtZXJnZShvdGhlcikge1xuICAgICAgICB0aGlzLmxpYnMgPSBuZXcgU2V0KFsuLi50aGlzLmxpYnMsIC4uLm90aGVyLmxpYnNdKTtcbiAgICAgICAgdGhpcy5saWJDbnQgPSB0aGlzLmxpYnMuc2l6ZTtcbiAgICAgICAgdGhpcy5zaXplICs9IG90aGVyLnNpemU7XG4gICAgICAgIGlmICh0aGlzLmxpYkNudCA9PT0gMSkge1xuICAgICAgICAgICAgc2VsZi52QXRyID0gdGhpcy5saWJzWzBdO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgY29weVRvKGRlc3QpIHtcbiAgICAgICAgZGVzdC5saWJDbnQgPSB0aGlzLmxpYkNudDtcbiAgICAgICAgZGVzdC5zaXplID0gdGhpcy5zaXplO1xuICAgICAgICBkZXN0LnZBdHIgPSB0aGlzLnZBdHI7XG4gICAgICAgIGRlc3QubGlicyA9IG5ldyBTZXQodGhpcy5saWJzKTtcbiAgICB9XG59XG5leHBvcnRzLlN0b25lR3JvdXAgPSBTdG9uZUdyb3VwOyIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLnNodWZmbGUgPSBzaHVmZmxlO1xuZXhwb3J0cy5tb3N0Q29tbW9uID0gbW9zdENvbW1vbjtcbmV4cG9ydHMuYXJnc29ydCA9IGFyZ3NvcnQ7XG5leHBvcnRzLmFyZ21heCA9IGFyZ21heDtcbmV4cG9ydHMuaGFzaCA9IGhhc2g7XG5mdW5jdGlvbiBzaHVmZmxlKGFycmF5KSB7XG4gICAgbGV0IG4gPSBhcnJheS5sZW5ndGg7XG4gICAgbGV0IHQ7XG4gICAgbGV0IGk7XG5cbiAgICB3aGlsZSAobikge1xuICAgICAgICBpID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogbi0tKTtcbiAgICAgICAgdCA9IGFycmF5W25dO1xuICAgICAgICBhcnJheVtuXSA9IGFycmF5W2ldO1xuICAgICAgICBhcnJheVtpXSA9IHQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFycmF5O1xufVxuXG5mdW5jdGlvbiBtb3N0Q29tbW9uKGFycmF5KSB7XG4gICAgY29uc3QgbWFwID0gbmV3IE1hcCgpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgZSA9IGFycmF5W2ldO1xuICAgICAgICBpZiAobWFwLmhhcyhlKSkge1xuICAgICAgICAgICAgbWFwLnNldChlLCBtYXAuZ2V0KGUpICsgMSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBtYXAuc2V0KGUsIDEpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGxldCBtYXhLZXk7XG4gICAgbGV0IG1heFZhbHVlID0gLTE7XG4gICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgbWFwLmVudHJpZXMoKSkge1xuICAgICAgICBpZiAodmFsdWUgPiBtYXhWYWx1ZSkge1xuICAgICAgICAgICAgbWF4S2V5ID0ga2V5O1xuICAgICAgICAgICAgbWF4VmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbWF4S2V5O1xufVxuXG5mdW5jdGlvbiBhcmdzb3J0KGFycmF5LCByZXZlcnNlKSB7XG4gICAgY29uc3QgZW4gPSBBcnJheS5mcm9tKGFycmF5KS5tYXAoKGUsIGkpID0+IFtpLCBlXSk7XG4gICAgZW4uc29ydCgoYSwgYikgPT4gcmV2ZXJzZSA/IGJbMV0gLSBhWzFdIDogYVsxXSAtIGJbMV0pO1xuICAgIHJldHVybiBlbi5tYXAoZSA9PiBlWzBdKTtcbn1cblxuZnVuY3Rpb24gYXJnbWF4KGFycmF5KSB7XG4gICAgbGV0IG1heEluZGV4O1xuICAgIGxldCBtYXhWYWx1ZSA9IC1JbmZpbml0eTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IHYgPSBhcnJheVtpXTtcbiAgICAgICAgaWYgKHYgPiBtYXhWYWx1ZSkge1xuICAgICAgICAgICAgbWF4SW5kZXggPSBpO1xuICAgICAgICAgICAgbWF4VmFsdWUgPSB2O1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBtYXhJbmRleDtcbn1cblxuZnVuY3Rpb24gaGFzaChzdHIpIHtcbiAgICBsZXQgaGFzaCA9IDUzODE7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgY2hhciA9IHN0ci5jaGFyQ29kZUF0KGkpO1xuICAgICAgICBoYXNoID0gKGhhc2ggPDwgNSkgKyBoYXNoICsgY2hhcjsgLyogaGFzaCAqIDMzICsgYyAqL1xuICAgICAgICBoYXNoID0gaGFzaCAmIGhhc2g7IC8vIENvbnZlcnQgdG8gMzJiaXQgaW50ZWdlclxuICAgIH1cbiAgICByZXR1cm4gTWF0aC5hYnMoaGFzaCk7XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgX25ldXJhbF9uZXR3b3JrX2NsaWVudCA9IHJlcXVpcmUoJy4vbmV1cmFsX25ldHdvcmtfY2xpZW50LmpzJyk7XG5cbnZhciBfY29vcmRfY29udmVydCA9IHJlcXVpcmUoJy4vY29vcmRfY29udmVydC5qcycpO1xuXG52YXIgX2NvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzLmpzJyk7XG5cbnZhciBfaW50ZXJzZWN0aW9uID0gcmVxdWlyZSgnLi9pbnRlcnNlY3Rpb24uanMnKTtcblxudmFyIF9ib2FyZCA9IHJlcXVpcmUoJy4vYm9hcmQuanMnKTtcblxudmFyIF9zZWFyY2ggPSByZXF1aXJlKCcuL3NlYXJjaC5qcycpO1xuXG4vKiBnbG9iYWwgJCBKR08gQm9hcmRDb250cm9sbGVyIGFkZFByb2NlZHVyZUxpc3RlbmVyICovXG5zZWxmLmltcG9ydFNjcmlwdHMoJ3dvcmtlci1wcm9jZWR1cmUtY2FsbC5qcycpO1xuXG5jbGFzcyBBOUVuZ2luZSB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMuYiA9IG5ldyBfYm9hcmQuQm9hcmQoKTtcbiAgICAgICAgdGhpcy50cmVlID0gbmV3IF9zZWFyY2guVHJlZShubik7XG4gICAgICAgIGFkZFByb2NlZHVyZUxpc3RlbmVyKHNlbGYsIHRoaXMpO1xuICAgIH1cblxuICAgIGNsZWFyKCkge1xuICAgICAgICB0aGlzLmIuY2xlYXIoKTtcbiAgICAgICAgdGhpcy50cmVlLmNsZWFyKCk7XG4gICAgfVxuXG4gICAgdGltZVNldHRpbmdzKG1haW5UaW1lLCBieW95b21pKSB7XG4gICAgICAgIHRoaXMudHJlZS5zZXRUaW1lKG1haW5UaW1lLCBieW95b21pKTtcbiAgICB9XG5cbiAgICBhc3luYyBnZW5tb3ZlKCkge1xuICAgICAgICBjb25zdCBbbW92ZSwgd2luUmF0ZV0gPSBhd2FpdCB0aGlzLmJlc3RNb3ZlKCk7XG4gICAgICAgIGlmICh3aW5SYXRlIDwgMC4xKSB7XG4gICAgICAgICAgICByZXR1cm4gJ3Jlc2lnbic7XG4gICAgICAgIH0gZWxzZSBpZiAobW92ZSA9PT0gX2NvbnN0YW50cy5QQVNTIHx8IHRoaXMuYi5zdGF0ZVttb3ZlXSA9PT0gX2ludGVyc2VjdGlvbi5FTVBUWSkge1xuICAgICAgICAgICAgdGhpcy5iLnBsYXkobW92ZSwgdHJ1ZSk7XG4gICAgICAgICAgICByZXR1cm4gKDAsIF9jb29yZF9jb252ZXJ0LmV2MnN0cikobW92ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZXJyb3InKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCclZCglcykgaXMgbm90IGVtcHR5JywgbW92ZSwgKDAsIF9jb29yZF9jb252ZXJ0LmV2MnN0cikobW92ZSkpO1xuICAgICAgICAgICAgdGhpcy5iLnNob3dib2FyZCgpO1xuICAgICAgICAgICAgY29uc29sZS5sb2codGhpcy5iLmNhbmRpZGF0ZXMoKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwbGF5KGV2KSB7XG4gICAgICAgIHRoaXMuYi5wbGF5KGV2LCBmYWxzZSk7XG4gICAgfVxuXG4gICAgYXN5bmMgYmVzdE1vdmUoKSB7XG4gICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnRyZWUuc2VhcmNoKHRoaXMuYiwgMC4wLCBmYWxzZSwgZmFsc2UpO1xuICAgIH1cblxuICAgIGZpbmFsU2NvcmUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmIuZmluYWxTY29yZSgpO1xuICAgIH1cblxuICAgIGFzeW5jIHBvbmRlcigpIHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMudHJlZS5zZWFyY2godGhpcy5iLCBJbmZpbml0eSwgdHJ1ZSwgZmFsc2UpO1xuICAgIH1cblxuICAgIHN0b3BQb25kZXIoKSB7XG4gICAgICAgIHNlbGYuUE9OREVSX1NUT1AgPSB0cnVlO1xuICAgIH1cbn1cblxuY29uc3Qgbm4gPSBuZXcgX25ldXJhbF9uZXR3b3JrX2NsaWVudC5OZXVyYWxOZXR3b3JrKCk7XG5jb25zdCBlbmdpbmUgPSBuZXcgQTlFbmdpbmUobm4pOyJdfQ==
