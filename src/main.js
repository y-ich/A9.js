import { NeuralNetwork } from './neural_network.js';
import { ev2str, str2ev, xy2ev, ev2xy } from './coord_convert.js';
import { BSIZE } from './constants.js';
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
            this.engine.play(ev2str(xy2ev(coord.i + 1, BSIZE - coord.j)));
        }
        if (this.board.turn !== this.board.ownColor) {
            setTimeout(async () => {
                const move = await this.engine.genmove();
                switch (move) {
                    case 'resign':
                    alert('負ました');
                    break;
                    case 'pass':
                    this.board.pass();
                    break;
                    default: {
                        const xy = ev2xy(str2ev(move));
                        this.board.play(new JGO.Coordinate(xy[0] - 1, BSIZE - xy[1]), true);
                    }
                }
            }, 0);
        }
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
    const board = new BoardController(BSIZE, color, handicap);
    const controller = new PlayController(engine, board);
    board.addObserver(controller);
    engine.timeSettings(0, 1);
});
