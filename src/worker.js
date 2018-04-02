/* global $ JGO BoardController addProcedureListener */
import { NeuralNetwork } from './neural_network_client.js';
import { ev2str, str2ev, xy2ev, ev2xy } from './coord_convert.js';
import { BSIZE, PASS } from './constants.js';
import { EMPTY } from './intersection.js';
import { Board } from './board.js';
import { Tree } from './search.js';

self.importScripts('worker-procedure-call.js');

class A9Engine {
    constructor() {
        this.b = new Board();
        this.tree = new Tree(nn);
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
        } else if (move === PASS || this.b.state[move] === EMPTY) {
            this.b.play(move, true);
            return ev2str(move);
        } else {
            console.log('error');
            console.log('%d(%s) is not empty', move, ev2str(move));
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

const nn = new NeuralNetwork();
const engine = new A9Engine(nn);
