/* global $ JGO BoardController */
import { WorkerRMI, resigterWorkerRMI } from './worker-rmi.js';
import { NeuralNetwork } from './neural_network.js';
import { ev2str, str2ev, xy2ev, ev2xy } from './coord_convert.js';
import { BSIZE, PASS } from './constants.js';
import { speak } from './speech.js';

class A9Engine extends WorkerRMI {
    async loadNN() {
        await this.invokeRM('loadNN');
    }

    async clear() {
        await this.stopPonder();
        await this.invokeRM('clear');
    }

    async timeSettings(mainTime, byoyomi) {
        await this.invokeRM('timeSettings', [mainTime, byoyomi]);
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
        await this.invokeRM('play', [ev]);
    }

    async bestMove() {
        return await this.invokeRM('bestMove');
    }

    async finalScore() {
        return await this.invokeRM('finalScore');
    }

    startPonder() {
        this.ponderPromise = this.invokeRM('ponder');
    }

    async stopPonder() {
        if (this.ponderPromise) {
            await this.invokeRM('stopPonder');
            await this.ponderPromise;
            this.ponderPromise = null;
        }
    }
}

class PlayController {
    constructor(engine, board, igoQuest = false) {
        this.engine = engine;
        this.board = board;
        this.isSelfPlay = false;
        if (igoQuest) {
            this.timeLeft = [
                0, // dumy
                (3 * 60 + 1) * 1000, // black
                3 * 60 * 1000, // white
            ];
            if (igoQuest) {
                this.start = Date.now();
                this.timer = setInterval(() => {
                    const start = Date.now();
                    this.timeLeft[this.board.turn] -= start - this.start;
                    this.start = start;
                    if (this.board.turn == this.board.ownColor) {
                        $('#your-time').text(Math.ceil(this.timeLeft[this.board.turn] / 1000));
                    } else {
                        $('#ai-time').text(Math.ceil(this.timeLeft[this.board.turn] / 1000));
                    }
                    if (this.timeLeft[this.board.turn] < 0) {
                        clearInterval(this.timer);
                        this.timer = null;
                        alert('切れました');
                    }
                }, 100);
            }
        }
    }

    clearTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    setIsSelfPlay(isSelfPlay) {
        this.isSelfPlay = isSelfPlay;
    }
    async update(coord) {
        if (coord === 'end') {
            this.clearTimer();
            try {
                const score = await this.finalScore();
                let message = score === 0 ?
                    '持碁' : (
                        score > 0 ?
                            `黒${score}目勝ち` :
                            `白${-score}目勝ち`
                    );
                message += 'ですか？';
                speak(message);
                setTimeout(function() {
                    alert(message);
                    $(document.body).addClass('end');
                }, 3000);
            } catch (e) {
                speak('すみません、整地できませんでした');
            }
            return;
        }

        if (this.start) {
            this.timeLeft[this.board.turn] += 1000;
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
                    this.clearTimer();
                    speak('負けました', 'ja-jp', 'female');
                    $(document.body).addClass('end');
                    break;
                    case 'pass':
                    this.board.play(null);
                    speak('パスします', 'ja-jp', 'female');
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

    async finalScore() {
        const result = await $.post({
            url: 'http://35.203.161.100/gnugo',
            data: {
                sgf: this.board.jrecord.toSgf(),
                move: 'est',
                method: 'aftermath',
                rule: 'chinese'
            }
        });
        if (/Jigo/.test(result)) {
            return 0;
        }
        const match = result.match(/(Black|White) wins by ([0-9.]+) points/);
        if (match) {
            let score = parseFloat(match[2]);
            if (match[1] === 'Black') {
                return score;
            } else {
                return -score;
            }
        } else {
            return null;
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
            await engine.loadNN();
        } catch(e) {
            if (e.message === 'No backend is available') {
                if (/(Mac OS X 10_13|(iPad|iPhone|iPod); CPU OS 11).*Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)) {
                    speak('残念ながらお使いのブラウザでは動きません。Safariをお使いですね。「開発」メニューの「実験的な機能」で「WebGPU」を有効にすると動くかもしれません', 'ja-jp', 'female');
                } else if (!speak('残念ながらお使いのブラウザでは動きません', 'ja-jp', 'female')) {
                    alert('残念ながらお使いのブラウザでは動きません');
                }
            } else {
                console.error(e);
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
        const controller = new PlayController(engine, board, condition.timeRule === 'igo-quest');
        const isSelfPlay = condition.color === 'self-play';
        if (!isSelfPlay) {
            speak('お願いします', 'ja-jp', 'female');
        }
        controller.setIsSelfPlay(isSelfPlay);
        board.addObserver(controller);
        $('#pass').on('click', function(event) {
            controller.pass();
        });
        $('#resign').on('click', async function(event) {
            board.clearTimer();
            await engine.stopPonder();
            speak('ありがとうございました', 'ja-jp', 'female');
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
resigterWorkerRMI(worker, NeuralNetwork);
const engine = new A9Engine(worker);
main();
