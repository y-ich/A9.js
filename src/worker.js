import { resigterWorkerRMI } from 'worker-rmi';
import { NeuralNetwork } from './neural_network_client.js';
import { ev2str } from './coord_convert.js';
import { PASS } from './constants.js';
import { EMPTY } from './intersection.js';
import { Board } from './board.js';
import { Tree } from './search.js';

class A9Engine {
    constructor() {
        this.b = new Board();
        this.nn = new NeuralNetwork(self);
        this.tree = new Tree(this.nn);
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

    timeLeft() {
        return this.tree.leftTime;
    }
}

resigterWorkerRMI(self, A9Engine);
