/* global $ JGO BoardController jssgf */
import { NeuralNetwork } from './neural_network.js';
import { ev2str, str2ev, xy2ev, ev2xy, move2xy } from './coord_convert.js';
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
}

class PlayController {
    constructor(engine, board, self) {
        this.engine = engine;
        this.board = board;
        this.self = self;
    }

    async update(coord) {
        if (coord === 'end') {
            await this.endEval();
            $('#sgf').val(this.board.jrecord.toSgf());
            alert(this.engine.b.finalScore());
            return;
        }
        if (!this.self && typeof coord === 'object') {
            this.engine.play(xy2ev(coord.i + 1, BSIZE - coord.j));
        }
        if (this.self || this.board.turn !== this.board.ownColor) {
            setTimeout(async () => {
                const move = await this.engine.genmove();
                console.log(move);
                switch (move) {
                    case 'resign':
                    await this.endEval();
                    $('#sgf').val(this.board.jrecord.toSgf());
                    alert('負けました');
                    break;
                    case 'pass':
                    this.board.play(null);
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
        this.engine.play(PASS);
        this.board.play(null);
    }

    async endEval() {
        console.log(this.engine.b.turn, (await nn.evaluate(this.engine.b))[1]);
        /*
        this.engine.b.turn = opponentOf(this.engine.b.turn);
        console.log(this.engine.b.turn, (await nn.evaluate(this.engine.b))[1]);
        */
    }
}

const nn = new NeuralNetwork();
const engine = new A9Engine(nn);
engine.timeSettings(0, 2);

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
    const color = data[1].color === 'W' ? JGO.WHITE : JGO.BLACK;
    const self = data[1].color === 'self';
    const board = new BoardController(BSIZE, color, 0, function() {
        const controller = new PlayController(engine, board, self);
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


$('#sgf').on('change', async function(e) {
    const sgf = $(e.currentTarget).val();
    let [node] = jssgf.fastParse(sgf);
    const b = new Board();
    while (node._children.length !== 0) {
        node = node._children[0];
        const move = node.B || node.W;
        if (move != null) {
            b.play(xy2ev.apply(null, move2xy(move)), false);
        }
    }
    b.showboard();
    console.log((await nn.evaluate(b)));
})
