import { NeuralNetwork } from './neural_network.js';
import { ev2str, str2ev } from './coord_convert.js';
import { Board } from './board.js';
import { Tree } from './search.js';

class A9Engine {
    constructor(nn) {
        this.b = new Board();
        this.tree = new Tree(nn);
    }

    clearBoard() {
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
        } else {
            this.b.play(move, true);
            return ev2str(move);
        }
    }

    play(coord) {
        this.b.play(str2ev(coord), false);
    }

    async bestMove() {
        return await this.tree.search(this.b, 0.0, false, false);
    }
}

const nn = new NeuralNetwork();
const engine = new A9Engine(nn);
nn.load().then(async function() {
    engine.timeSettings(0, 10);
    console.log(await engine.genmove());
});
