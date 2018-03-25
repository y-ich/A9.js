import { argsort, argmax } from './utils.js';
import { BSIZE, BVCNT, PASS, VNULL } from './constants.js';
import { rv2ev, ev2str } from './coord_convert.js';
import { Board } from './board.js';

const MAX_NODE_CNT = 16384;
const EXPAND_CNT = 8;

let TREE_CP = 2.0;

function printProb(prob) {
    for (let y = 0; y < BSIZE; y++) {
        let str = '';
        for (let x = 0; x < BSIZE; x++) {
            str += ('  ' + prob[x + y * BSIZE].toFixed(1)).slice(-5);
        }
        console.log(str);
    }
    console.log('pass=%s', prob[prob.length - 1].toFixed(1));
}

export class Tree {
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
        if (this.nodeHashs.has(hs) &&
            this.node[this.nodeHashs[hs]].hash === hs &&
            this.node[this.nodeHashs[hs]].moveCnt === candidates.moveCnt) {
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

        for (const rv of argsort(prob, true)) {
            if (candidates.list.includes(rv)) {
                nd.move[nd.branchCnt] = rv2ev(rv);
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
        const rate = new Float32Array(BVCNT + 1);
        for (let i = 0; i < rate.length; i++) {
            rate[i] = nd.visitCnt[i] === 0 ? ndRate : nd.valueWin[i] / nd.visitCnt[i];
        }
        const actionValue = new Float32Array(nd.branchCnt);
        for (let i = 0; i < actionValue.length; i++) {
            actionValue[i] = rate[i] + cpsv * nd.prob[i] / (nd.visitCnt[i] + 1);
        }
        const best = argmax(actionValue);
        const nextId = nd.nextId[best];
        const nextMove = nd.move[best];
        const isHeadNode = !this.hasNext(nodeId, best, b.getMoveCnt() + 1) ||
            nd.visitCnt[best] < EXPAND_CNT ||
            b.getMoveCnt() > BVCNT * 2 ||
            (nextMove === PASS && b.getPrevMove() === PASS);
        return [best, nextId, nextMove, isHeadNode];
    }

    shouldSearch(best, second) {
        const nd = this.node[this.rootId];
        const winRate = this.branchRate(nd, best);

        return nd.totalCnt <= 5000 ||
            (nd.visitCnt[best] <= nd.visitCnt[second] * 100 &&
                winRate >= 0.1 && winRate <= 0.9)
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
        return nextId != null && nd.nextHash[brId] === this.node[nodeId].hash &&
            this.node[nextId].moveCnt === moveCnt;
    }

    branchRate(nd, id) {
        return nd.valueWin[id] / Math.max(nd.visitCnt[id], 1) / 2.0 + 0.5;
    }

    bestSequence(nodeId, headMove) {
        let seqStr = ('  ' + ev2str(headMove)).slice(-3);
        let nextMove = headMove;

        for (let i = 0; i < 7; i++) {
            const nd = this.node[nodeId];
            if (nextMove === PASS || nd.branchCnt < 1) {
                break;
            }

            const best = argmax(nd.visitCnt.slice(0, nd.branchCnt));
            if (nd.visitCnt[best] === 0) {
                break;
            }
            nextMove = nd.move[best];
            seqStr += '->' + ('  ' + ev2str(ev2str(nextMove))).slice(-3);

            if (!this.hasNext(nodeId, best, nd.moveCnt + 1)) {
                break;
            }
            nodeId = nd.nextId[best];
        }

        return seqStr;
    }

    printInfo(nodeId) {
        const nd = this.node[nodeId];
        const order = argsort(nd.visitCnt.slice(0, nd.branchCnt), true);
        console.log('|move|count  |rate |value|prob | best sequence');
        for (let i = 0; i < Math.min(order.length, 9); i++) {
            const m = order[i];
            const visitCnt = nd.visitCnt[m];
            if (visitCnt === 0) {
                break;
            }

            const rate = visitCnt === 0 ? 0.0 : this.branchRate(nd, m) * 100.0;
            const value = (nd.value[m] / 2.0 + 0.5) * 100.0;
            console.log(
                '|%s|%s|%s|%s|%s| %s',
                ('   ' + ev2str(nd.move[m])).slice(-4),
                (visitCnt + '      ').slice(0, 7),
                ('  ' + rate.toFixed(1)).slice(-5),
                ('  ' + value.toFixed(1)).slice(-5),
                ('  ' + (nd.prob[m] * 100.0).toFixed(1)).slice(-5),
                this.bestSequence(nd.nextId[m], nd.move[m])
            );
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
        const value = isHeadNode ?
            (nd.evaluated[best] ?
                nd.value[best] :
                await this.evaluateChildNode(b, nodeId, best)) :
            - await this.searchBranch(b, nextId, route);
        nd.totalValue += value;
        nd.totalCnt += 1;
        nd.valueWin[best] += value;
        nd.visitCnt[best] += 1;
        return value;
    }

    async keepPlayout(b, exitCondition) {
        let searchIdx = 1;
        this.evalCnt = 0;
        let bCpy = new Board();
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

        if (clean && nextMove === PASS && nd.valueWin[best] * nd.valueWin[second] > 0.0) {
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
            return [PASS, 0.5];
        }

        this.deleteNode();

        const time_ = (time === 0.0 ? this.getSearchTime() : time) * 1000;
        const [nextMove, winRate] = await this._search(b, ponder, clean, function() {
            return Date.now() - start > time_;
        });

        if (!ponder) {
            console.log(
                '\nmove count=%d: left time=%s[sec] evaluated=%d',
                this.rootMoveCnt + 1,
                Math.max(this.leftTime - time, 0.0).toFixed(1),
                this.evalCnt);
            this.printInfo(this.rootId);
            this.leftTime = this.leftTime - (Date.now() - start) / 1000;
        }

        return [nextMove, winRate];
    }
}

class Node {
    constructor() {
        this.move = new Uint8Array(BVCNT + 1);
        this.prob = new Float32Array(BVCNT + 1);
        this.value = new Float32Array(BVCNT + 1);
        this.valueWin = new Float32Array(BVCNT + 1);
        this.visitCnt = new Uint32Array(BVCNT + 1);
        this.nextId = new Int16Array(BVCNT + 1);
        this.nextHash = new Uint32Array(BVCNT + 1);
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
        this.move.fill(VNULL);
        this.prob.fill(0.0);
        this.value.fill(0.0);
        this.valueWin.fill(0.0);
        this.visitCnt.fill(0);
        this.nextId.fill(-1);
        this.nextHash.fill(0);
        this.evaluated = [];
        for (let i = 0; i < BVCNT + 1; i++) {
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
        const order = argsort(this.visitCnt.slice(0, this.branchCnt), true);
        return order.slice(0, 2);
    }
}
