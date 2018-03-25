import { shuffle, mostCommon, hash } from './utils.js';
import { BSIZE, EBSIZE, BVCNT, EBVCNT, VNULL, KEEP_PREV_CNT, PASS, KOMI, FEATURE_CNT } from './constants.js';
import { EMPTY, BLACK, WHITE, EXTERIOR, opponentOf } from './intersection.js';
import { StoneGroup } from './stone_group.js';
import { X_LABELS, xy2ev, rv2ev, ev2rv, ev2str, str2ev } from './coord_convert.js';

export function neighbors(v) {
    return [v + 1, v + EBSIZE, v - 1, v - EBSIZE];
}

export function diagonals(v) {
    return [
        v + EBSIZE + 1,
        v + EBSIZE - 1,
        v - EBSIZE - 1,
        v - EBSIZE + 1,
    ]
}

export class Candidates {
    constructor(hash, moveCnt, list) {
        this.hash = hash;
        this.moveCnt = moveCnt;
        this.list = list;
    }
}

export class Board {
    constructor() {
        this.state = new Uint8Array(EBVCNT);
        this.state.fill(EXTERIOR);
        this.id = new Uint8Array(EBVCNT);
        this.next = new Uint8Array(EBVCNT);
        this.sg = [];
        for (let i = 0; i < EBVCNT; i++) {
            this.sg.push(new StoneGroup());
        }
        this.prevState = [];
        this.ko = VNULL;
        this.turn = BLACK;
        this.moveCnt = 0;
        this.prevMove = VNULL;
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
        for (let x = 1; x <= BSIZE; x++) {
            for (let y = 1; y <= BSIZE; y++) {
                this.state[xy2ev(x, y)] = EMPTY;
            }
        }
        for (let i = 0; i < this.id.length; i++) {
            this.id[i] = i;
        }
        for (let i = 0; i < this.next.length; i++) {
            this.next[i] = i;
        }
        this.sg.forEach(e => { e.clear(false) });
        this.prevState = [];
        for (let i = 0; i < KEEP_PREV_CNT; i++) {
            this.prevState.push(new Uint8Array(this.state));
        }
        this.ko = VNULL;
        this.turn = BLACK;
        this.moveCnt = 0;
        this.prevMove = VNULL;
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
        for (let i = 0; i < KEEP_PREV_CNT; i++) {
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
            this.state[vTmp] = EMPTY;
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
    }

    placeStone(v) {
        const stoneColor = this.turn;
        this.state[v] = stoneColor;
        this.id[v] = v;
        this.sg[this.id[v]].clear(true);
        for (const nv of neighbors(v)) {
            if (this.state[nv] === EMPTY) {
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
        const opponentStone = opponentOf(this.turn);
        for (const nv of neighbors(v)) {
            if (this.state[nv] === opponentStone && this.sg[this.id[nv]].getLibCnt() === 0) {
                this.remove(nv);
            }
        }
    }

    legal(v) {
        if (v === PASS) {
            return true;
        } else if (v === this.ko || this.state[v] !== EMPTY) {
            return false;
        }

        const stoneCnt = [0, 0];
        const atrCnt = [0, 0];
        for (const nv of neighbors(v)) {
            const c = this.state[nv];
            switch (c) {
                case EMPTY:
                return true;
                case BLACK:
                stoneCnt[c] += 1;
                if (this.sg[this.id[nv]].getLibCnt() === 1) {
                    atrCnt[c] += 1;
                }
            }
        }
        return atrCnt[opponentOf(this.turn)] !== 0 ||
            atrCnt[this.turn] < stoneCnt[this.turn];
    }

    eyeshape(v, pl) {
        if (v === PASS) {
            return false;
        }
        for (const nv of neighbors(v)) {
            const c = this.state[nv];
            if (c === EMPTY || c === opponentOf(pl)) {
                return false;
            }
        }
        const diagCnt = [0, 0, 0, 0];
        for (const nv of diagonals(v)) {
            diagCnt[this.state[nv]] += 1;
        }
        const wedgeCnt = diagCnt[opponentOf(pl)] + (diagCnt[3] > 0 ? 1 : 0);
        if (wedgeCnt === 2) {
            for (const nv of diagonals(v)) {
                if (this.state[nv] === opponentOf(pl) &&
                    this.sg[this.id[nv]].getLibCnt() === 1 &&
                    this.sg[this.id[nv]].getVAtr() !== this.ko) {
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
        for (let i = KEEP_PREV_CNT - 2; i >= 0; i--) {
            this.prevState[i + 1] = this.prevState[i];
        }
        this.prevState[0] = new Uint8Array(this.state);
        if (v === PASS) {
            this.ko = VNULL;
        } else {
            this.placeStone(v);
            const id = this.id[v];
            this.ko = VNULL;
            if (this.removeCnt === 1 && this.sg[id].getLibCnt() === 1 && this.sg[id].getSize() === 1) {
                this.ko = this.sg[id].getVAtr();
            }
        }
        this.prevMove = v;
        this.history.push(v);
        this.turn = opponentOf(this.turn);
        this.moveCnt += 1;
        return true;
    }

    randomPlay() {
        const emptyList = [];
        for (let i = 0; i < this.state.length; i++) {
            if (this.state[i] === EMPTY) {
                emptyList.push(i);
            }
        }
        shuffle(emptyList);
        for (const v of emptyList) {
            if (this.play(v, true)) {
                return v;
            }
        }
        this.play(PASS, true);
        return PASS;
    }

    score() {
        const stoneCnt = [0, 0];
        for (let _v = 0; _v < BVCNT; _v++) {
            const v = rv2ev(_v);
            const s = this.state[v];
            if (s === BLACK || s === WHITE) {
                stoneCnt[s] += 1;
            } else {
                const nbrCnt = [0, 0, 0, 0];
                for (const nv of neighbors(v)) {
                    nbrCnt[this.state[nv]] += 1;
                }
                if (nbrCnt[WHITE] > 0 && nbrCnt[BLACK] === 0) {
                    stoneCnt[WHITE] += 1;
                } else if (nbrCnt[BLACK] > 0 && nbrCnt[WHITE] === 0) {
                    stoneCnt[BLACK] += 1;
                }
            }
        }
        return stoneCnt[1] - stoneCnt[0] - KOMI;
    }

    rollout(showBoard) {
        while (this.moveCnt < EBVCNT * 2) {
            const prevMove = this.prevMove;
            const move = this.randomPlay();
            if (showBoard && move !== PASS) {
                console.log('\nmove count=%d', this.moveCnt);
                this.showboard();
            }
            if (prevMove === PASS && move === PASS) {
                break;
            }
        }
    }

    showboard() {
        function printXlabel() {
            let lineStr = '  ';
            for (let x = 1; x <= BSIZE; x++) {
                lineStr += ` ${X_LABELS[x]} `;
            }
            console.log(lineStr);
        }
        printXlabel();
        for (let y = BSIZE; y > 0; y--) {
            let lineStr = (' ' + y.toString()).slice(-2);
            for (let x = 1; x <= BSIZE; x++) {
                const v = xy2ev(x, y);
                let xStr;
                switch (this.state[v]) {
                    case BLACK:
                    xStr = v === this.prevMove ? '[X]' : ' X ';
                    break;
                    case WHITE:
                    xStr = v === this.prevMove ? '[O]' : ' O ';
                    break;
                    case EMPTY:
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
            return p * FEATURE_CNT + f;
        }
        const array = new Float32Array(BVCNT * FEATURE_CNT);

        const my = this.turn;
        const opp = opponentOf(this.turn);
        for (let p = 0; p < BVCNT; p++) {
            array[index(p, 0)] = this.state[rv2ev(p)] === my ? 1.0 : 0.0;
        }
        for (let p = 0; p < BVCNT; p++) {
            array[index(p, 1)] = this.state[rv2ev(p)] === opp ? 1.0 : 0.0;
        }
        for (let i = 0; i < KEEP_PREV_CNT; i++) {
            for (let p = 0; p < BVCNT; p++) {
                array[index(p, (i + 1) * 2)] = this.state[rv2ev(p)] === my ? 1.0 : 0.0;
            }
            for (let p = 0; p < BVCNT; p++) {
                array[index(p, (i + 1) * 2 + 1)] = this.state[rv2ev(p)] === opp ? 1.0 : 0.0;
            }
        }
        for (let p = 0; p < BVCNT; p++) {
            array[index(p, FEATURE_CNT - 1)] = my;
        }

        return array;
    }

    hash() {
        return hash((this.state.toString() + this.prevState[0].toString() + this.turn.toString()).replace(',', ''));
    }

    candidates() {
        const candList = [];
        for (let v = 0; v < this.state.length; v++) {
            if (this.state[v] === EMPTY && this.legal(v) && !this.eyeshape(v, this.turn)) {
                candList.push(ev2rv(v));
            }
        }
        candList.push(ev2rv(PASS));
        return new Candidates(this.hash(), this.moveCnt, candList);
    }

    finalScore() {
        const ROLL_OUT_NUM = 256;
        const doubleScoreList = [];
        let bCpy = new Board();
        for (let i = 0; i < ROLL_OUT_NUM; i++) {
            this.copyTo(bCpy);
            bCpy.rollout(false);
            doubleScoreList.push(bCpy.score() * 2);
        }
        return mostCommon(doubleScoreList) / 2;
    }
}
/*
function testBoard() {
    const b = new Board();
    b.playSequence(['A1', 'A2', 'A9', 'B1'].map(str2ev));
    b.showboard();
}
testBoard();
*/
