/* global $ JGO BoardController WorkerProcedureCall */
import { NeuralNetwork } from './neural_network.js';
import { ev2str, str2ev, xy2ev, ev2xy } from './coord_convert.js';
import { BSIZE, PASS } from './constants.js';
import { EMPTY } from './intersection.js';

class A9Engine {
    constructor(nn, worker) {
        this.worker = worker;
        this.receiver = new WorkerProcedureCall(this.worker, this.constructor.name);
    }

    async clear() {
        await this.stopPonder();
        await this.receiver.call('clear');
    }

    async timeSettings(mainTime, byoyomi) {
        await this.receiver.call('timeSettings', [mainTime, byoyomi]);
    }

    async genmove() {
        const [move, winRate] = await this.bestMove();
        if (winRate < 0.1) {
            return 'resign';
        } else {
            await this.play(move);
            return ev2str(move);
        }
    }

    async play(ev) {
        await this.receiver.call('play', [ev]);
    }

    async bestMove() {
        return await this.receiver.call('bestMove');
    }

    async finalScore() {
        return await this.receiver.call('finalScore');
    }

    startPonder() {
        this.ponderPromise = this.receiver.call('ponder');
    }

    async stopPonder() {
        if (this.ponderPromise) {
            window.PONDER_STOP = true;
            await this.ponderPromise;
            this.ponderPromise = null;
            window.PONDER_STOP = false;
        }
    }
}

class PlayController {
    constructor(engine, board) {
        this.engine = engine;
        this.board = board;
        this.isSelfPlay = false;
    }

    setIsSelfPlay(isSelfPlay) {
        this.isSelfPlay = isSelfPlay;
    }
    async update(coord) {
        if (coord === 'end') {
            const score = await this.engine.finalScore();
            const message = score === 0 ?
                '持碁' : (
                    score > 0 ?
                        `黒${score}目勝ち` :
                        `白${-score}目勝ち`
                );
            alert(message + 'ですか？すみません、整地苦手です…');
            $(document.body).addClass('end');
            return;
        }
        if (!this.isSelfPlay && typeof coord === 'object') {
            await this.engine.stopPonder();
            await this.engine.play(xy2ev(coord.i + 1, BSIZE - coord.j));
        }
        if (this.isSelfPlay || this.board.turn !== this.board.ownColor) {
            setTimeout(async () => {
                const move = await this.engine.genmove();
                switch (move) {
                    case 'resign':
                    alert('負けました');
                    $(document.body).addClass('end');
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
        } else {
            this.engine.startPonder();
        }
    }

    async pass() {
        if (this.board.ownColor === this.board.turn) {
            await this.engine.stopPonder();
            this.engine.play(PASS);
            this.board.play(null);
        }
    }
}

async function main() {
    const board = await new Promise(function(res, rej) {
        new BoardController(BSIZE, 0, res);
    });
    // JGOのレンダリングを完了させるためにsetTimeoutでイベントループを進める
    setTimeout(async function() {
        try {
            await nn.load();
        } catch(e) {
            if (e.message === 'No backend is available') {
                if (/(Mac OS X 10_13|(iPad|iPhone|iPod); CPU OS 11).*Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)) {
                    alert('残念ながらお使いのブラウザでは動きません。Safariをお使いですね。「開発」メニューの「実験的な機能」で「WebGPU」を有効にすると動くかもしれません');
                } else {
                    alert('残念ながらお使いのブラウザでは動きません');
                }
            }
            return;
        }
        const condition = await new Promise(function(res, rej) {
            const $startModal = $('#start-modal');
            $startModal.modal('show');
            $startModal.one('hidden.bs.modal', function(e) {
                const $conditionForm = $('#condition-form');
                res({
                    color: $conditionForm[0]['color'].value,
                    timeRule: $conditionForm[0]['time'].value,
                    time: parseInt($conditionForm[0]['ai-byoyomi'].value),
                 });
            });
        });
        switch (condition.timeRule) {
            case 'ai-time':
            await engine.timeSettings(0, condition.time);
            break;
            case 'igo-quest':
            await engine.timeSettings(3 * 60 + 55, 1); // 9路盤は平均手数が110手らしいので、55のフィッシャー秒を追加
            break;
        }
        board.setOwnColor(condition.color === 'W' ? JGO.WHITE : JGO.BLACK);
        const controller = new PlayController(engine, board);
        controller.setIsSelfPlay(condition.color === 'self-play');
        board.addObserver(controller);
        $('#pass').on('click', function(event) {
            controller.pass();
        });
        $('#resign').on('click', async function(event) {
            await engine.stopPonder();
            $(document.body).addClass('end');
        });
        $('#retry').one('click', async function(event) {
            $('#pass').off('click');
            $('#resign').off('click');
            board.destroy();
            engine.clear();
            $(document.body).removeClass('end');
            setTimeout(main, 0);
        });
    }, 0);
}

const worker = new Worker('js/worker.js');
const nn = new NeuralNetwork(worker);
const engine = new A9Engine(nn, worker);
main();
