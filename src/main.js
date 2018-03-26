/* global $ JGO BoardController */
import { NeuralNetwork } from './neural_network.js';
import { ev2str, str2ev, xy2ev, ev2xy } from './coord_convert.js';
import { BSIZE, PASS } from './constants.js';
import { EMPTY } from './intersection.js';
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
        } else if (move === PASS || this.b.state[move] === EMPTY) {
            this.b.play(move, true);
            this.b.showboard();
            return ev2str(move);
        } else {
            console.log('error');
            console.log('%d(%s) is not empty', move, ev2str(move));
            this.b.showboard();
            console.log(this.b.candidates());
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
        if (coord === 'end') {
            alert(this.engine.b.finalScore());
            return;
        }
        if (typeof coord === 'object') {
            this.engine.play(ev2str(xy2ev(coord.i + 1, BSIZE - coord.j)));
        }
        if (this.board.turn !== this.board.ownColor) {
            setTimeout(async () => {
                const move = await this.engine.genmove();
                console.log(move);
                switch (move) {
                    case 'resign':
                    alert('負けました');
                    break;
                    case 'pass':
                    this.board.pass();
                    break;
                    default: {
                        const ev = str2ev(move);
                        const xy = ev2xy(ev);
                        this.board.play(new JGO.Coordinate(xy[0] - 1, BSIZE - xy[1]), true);
                    }
                }
            }, 0);
        }
    }

    pass() {
        this.engine.play('pass');
        this.board.pass();
    }
}

const nn = new NeuralNetwork();
const engine = new A9Engine(nn);
engine.timeSettings(0, 10);

const conditionPromise = new Promise(function(res, rej) {
    const $startModal = $('#start-modal');
    $startModal.modal('show');
    $startModal.on('hidden.bs.modal', function(e) {
        const $conditionForm = $('#condition-form');
        res({
            color: $conditionForm[0].color.value
        });
    });
});

Promise.all([nn.load(), conditionPromise]).then(async function(data) {
    const color = data[1].color === 'B' ? JGO.BLACK : JGO.WHITE;
    const board = new BoardController(BSIZE, color, 0, function() {
        const controller = new PlayController(engine, board);
        board.addObserver(controller);
        $('#pass').on('click', function(event) {
            // TODO 自分の番だけにする
            controller.pass();
        });
        $('#resign').on('click', function(event) {
            location.reload();
        });
    });
});
