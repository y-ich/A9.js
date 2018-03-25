import { NeuralNetwork } from './neural_network.js';
import { ev2str, str2ev, xy2ev, ev2xy } from './coord_convert.js';
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

class PlayController {
    constructor(engine, board) {
        this.engine = engine;
        this.board = board;
    }

    async update(coord) {
        if (coord) {
            this.engine.play(ev2str(xy2ev(coord.i + 1, coord.j + 1)));
        }
        if (this.board.turn !== this.board.ownColor) {
            const move = await this.engine.genmove();
            switch (move) {
                case 'resign':
                break;
                case 'pass':
                this.board.pass();
                break;
                default: {
                    const xy = ev2xy(str2ev(move));
                    this.board.play(new JGO.Coordinate(xy[0] - 1, xy[1] - 1), true);
                }
            }
        }
    }

    selectMove(distribution, feature) {
        if (feature.noSensible) {
            return null;
        }
        let xy;
        let probability;
        do {
            const random = Math.random();
            let accu = 0.0;
            let i;
            for (i = 0; i < distribution.length; i++) {
                accu += distribution[i];
                if (accu > random) {
                    probability = distribution[i];
                    break;
                }
            }
            if (i >= distribution.length) {
                continue;
            }
            const yx = this.model.pointToXy(i);
            // distributionのアラインメントが転置している(tf仕様)ので下でx,yを逆にする。
            xy = [yx[1], yx[0]];
        } while (!feature.getFeature(46, xy[0], xy[1])); // sensibleness

        console.log(probability);
        /*
        console.log(feature.planeToString(0));
        console.log(feature.planeToString(1));
        console.log(feature.planeToString(46));
        */
        return xy;
    }
}

const nn = new NeuralNetwork();
const engine = new A9Engine(nn);

const conditionPromise = new Promise(function(res, rej) {
    const $startModal = $('#start-modal');
    $startModal.modal('show');
    $startModal.on('hidden.bs.modal', function(e) {
        const $conditionForm = $('#condition-form');
        res({
            color: $conditionForm[0].color.value,
            handicap: $conditionForm[0].handicap.value
        });
    });
});

Promise.all([nn.load(), conditionPromise]).then(async function(data) {
    const color = data[1].color === 'B' ? JGO.BLACK : JGO.WHITE;
    const handicap = parseInt(data[1].handicap);
    const board = new BoardController(9, color, handicap);
    const controller = new PlayController(engine, board);
    board.addObserver(controller);
    engine.timeSettings(0, 3);
});
