(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
/// コミです。
const KOMI = exports.KOMI = 7.0;

/// 碁盤のサイズです。
const BSIZE = exports.BSIZE = 9;

/// 外枠を持つ拡張碁盤のサイズです。
const EBSIZE = exports.EBSIZE = BSIZE + 2;

/// 碁盤の交点の数です。
const BVCNT = exports.BVCNT = BSIZE * BSIZE;

/// 拡張碁盤の交点の数です。
const EBVCNT = exports.EBVCNT = EBSIZE * EBSIZE;

/// パスを表す線形座標です。通常の着手は拡張碁盤の線形座標で表します。
// TODO - 着手のために列挙型を作ったほうが関数のシグニチャは読みやすい。
const PASS = exports.PASS = EBVCNT;

/// 線形座標のプレースホルダーの未使用を示す値です。
// TODO - 該当する場所にOption<usize>を使ったほうが関数のシグニチャは読みやすい。
const VNULL = exports.VNULL = EBVCNT + 1;

/// NNへの入力に関する履歴の深さです。
const KEEP_PREV_CNT = exports.KEEP_PREV_CNT = 2;

/// NNへの入力フィーチャーの数です。
const FEATURE_CNT = exports.FEATURE_CNT = KEEP_PREV_CNT * 2 + 3; // 7
},{}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.X_LABELS = undefined;
exports.move2xy = move2xy;
exports.ev2xy = ev2xy;
exports.xy2ev = xy2ev;
exports.rv2ev = rv2ev;
exports.ev2rv = ev2rv;
exports.ev2str = ev2str;
exports.str2ev = str2ev;

var _constants = require('./constants.js');

const X_LABELS = exports.X_LABELS = '@ABCDEFGHJKLMNOPQRST';

function move2xy(s) {
    const OFFSET = 'a'.charCodeAt(0) - 1;
    return [s.charCodeAt(0) - OFFSET, _constants.BSIZE + 1 - (s.charCodeAt(1) - OFFSET)];
}

function ev2xy(ev) {
    return [ev % _constants.EBSIZE, Math.floor(ev / _constants.EBSIZE)];
}

function xy2ev(x, y) {
    return y * _constants.EBSIZE + x;
}

function rv2ev(rv) {
    return rv === _constants.BVCNT ? _constants.PASS : rv % _constants.BSIZE + 1 + Math.floor(rv / _constants.BSIZE + 1) * _constants.EBSIZE;
}

function ev2rv(ev) {
    return ev === _constants.PASS ? _constants.BVCNT : ev % _constants.EBSIZE - 1 + Math.floor(ev / _constants.EBSIZE - 1) * _constants.BSIZE;
}

function ev2str(ev) {
    if (ev >= _constants.PASS) {
        return 'pass';
    } else {
        const [x, y] = ev2xy(ev);
        return X_LABELS.charAt(x) + y.toString();
    }
}

function str2ev(v) {
    const vStr = v.toUpperCase();
    if (vStr === 'PASS' || vStr === 'RESIGN') {
        return _constants.PASS;
    } else {
        const x = X_LABELS.indexOf(vStr.charAt(0));
        const y = parseInt(vStr.slice(1));
        return xy2ev(x, y);
    }
}
},{"./constants.js":1}],3:[function(require,module,exports){
'use strict';

var _neural_network = require('./neural_network.js');

var _coord_convert = require('./coord_convert.js');

var _constants = require('./constants.js');

var _speech = require('./speech.js');

/* global $ JGO BoardController WorkerProcedureCall */
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
            return (0, _coord_convert.ev2str)(move);
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
            try {
                const score = await this.finalScore();
                let message = score === 0 ? '持碁' : score > 0 ? `黒${score}目勝ち` : `白${-score}目勝ち`;
                message += 'ですか？';
                (0, _speech.speak)(message);
                setTimeout(function () {
                    alert(message);
                    $(document.body).addClass('end');
                }, 3000);
            } catch (e) {
                (0, _speech.speak)('すみません、整地できませんでした');
            }
            return;
        }
        if (!this.isSelfPlay && typeof coord === 'object') {
            await this.engine.stopPonder();
            await this.engine.play((0, _coord_convert.xy2ev)(coord.i + 1, _constants.BSIZE - coord.j));
        }
        if (this.isSelfPlay || this.board.turn !== this.board.ownColor) {
            setTimeout(async () => {
                const move = await this.engine.genmove();
                switch (move) {
                    case 'resign':
                        (0, _speech.speak)('負けました', 'ja-jp', 'female');
                        $(document.body).addClass('end');
                        break;
                    case 'pass':
                        this.board.play(null);
                        (0, _speech.speak)('パスします', 'ja-jp', 'female');
                        break;
                    default:
                        {
                            const ev = (0, _coord_convert.str2ev)(move);
                            const xy = (0, _coord_convert.ev2xy)(ev);
                            this.board.play(new JGO.Coordinate(xy[0] - 1, _constants.BSIZE - xy[1]), true);
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
            this.engine.play(_constants.PASS);
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
    const board = await new Promise(function (res, rej) {
        new BoardController(_constants.BSIZE, 0, res);
    });
    // JGOのレンダリングを完了させるためにsetTimeoutでイベントループを進める
    setTimeout(async function () {
        try {
            await nn.load();
        } catch (e) {
            if (e.message === 'No backend is available') {
                if (/(Mac OS X 10_13|(iPad|iPhone|iPod); CPU OS 11).*Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)) {
                    (0, _speech.speak)('残念ながらお使いのブラウザでは動きません。Safariをお使いですね。「開発」メニューの「実験的な機能」で「WebGPU」を有効にすると動くかもしれません', 'ja-jp', 'female');
                } else if (!(0, _speech.speak)('残念ながらお使いのブラウザでは動きません', 'ja-jp', 'female')) {
                    alert('残念ながらお使いのブラウザでは動きません');
                }
            }
            return;
        }
        const condition = await new Promise(function (res, rej) {
            const $startModal = $('#start-modal');
            $startModal.modal('show');
            $startModal.one('hidden.bs.modal', function (e) {
                const $conditionForm = $('#condition-form');
                res({
                    color: $conditionForm[0]['color'].value,
                    timeRule: $conditionForm[0]['time'].value,
                    time: parseInt($conditionForm[0]['ai-byoyomi'].value)
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
        const isSelfPlay = condition.color === 'self-play';
        if (!isSelfPlay) {
            (0, _speech.speak)('お願いします', 'ja-jp', 'female');
        }
        controller.setIsSelfPlay(isSelfPlay);
        board.addObserver(controller);
        $('#pass').on('click', function (event) {
            controller.pass();
        });
        $('#resign').on('click', async function (event) {
            await engine.stopPonder();
            (0, _speech.speak)('ありがとうございました', 'ja-jp', 'female');
            $(document.body).addClass('end');
        });
        $('#retry').one('click', async function (event) {
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
const nn = new _neural_network.NeuralNetwork(worker);
const engine = new A9Engine(nn, worker);
main();
},{"./constants.js":1,"./coord_convert.js":2,"./neural_network.js":4,"./speech.js":5}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
/* global WebDNN addProcedureListener */

if (!ArrayBuffer.prototype.slice) {
    ArrayBuffer.prototype.slice = function (start, end) {
        var that = new Uint8Array(this);
        if (end == undefined) end = that.length;
        var result = new ArrayBuffer(end - start);
        var resultArray = new Uint8Array(result);
        for (var i = 0; i < resultArray.length; i++) resultArray[i] = that[i + start];
        return result;
    };
}

class NeuralNetwork {
    constructor(worker) {
        this.nn = null;
        addProcedureListener(worker, this);
    }

    async load() {
        if (this.nn) {
            return;
        }
        this.nn = await WebDNN.load('./output', { backendOrder: ['webgpu', 'webgl'] });
    }

    async evaluate(feature) {
        const views = this.nn.getInputViews();
        views[0].set(feature);
        await this.nn.run();
        const result = this.nn.getOutputViews().map(e => e.toActual().slice(0)); // to.Actualそのものではworker側でdetachができない模様
        result.push(window.PONDER_STOP);
        return result;
    }
}
exports.NeuralNetwork = NeuralNetwork;
},{}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.speak = speak;
function speak(text, lang, gender) {
    if (!SpeechSynthesisUtterance) return false;

    switch (lang) {
        case 'en':
            lang = 'en-us';
            break;
        case 'ja':
            lang = 'ja-jp';
            break;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    if (/(iPhone|iPad|iPod)(?=.*OS [7-8])/.test(navigator.userAgent)) utterance.rate = 0.2;
    const voices = speechSynthesis.getVoices().filter(e => e.lang.toLowerCase() === lang);
    let voice = null;
    if (voices.length > 1) {
        let names = null;
        switch (lang) {
            case 'ja-jp':
                switch (gender) {
                    case 'male':
                        names = ['Otoya', 'Hattori', 'Ichiro'];
                        break;
                    case 'female':
                        names = ['O-ren（拡張）', 'O-ren', 'Kyoko', 'Haruka']; // Windows 10のAyumiの声は今ひとつ
                        break;
                }
                break;
            case 'en-us':
                switch (gender) {
                    case 'male':
                        names = ['Alex', 'Fred'];
                        break;
                    case 'female':
                        names = ['Samantha', 'Victoria'];
                        break;
                }
                break;
        }
        if (names) {
            voice = voices.filter(v => names.some(n => v.name.indexOf(n) >= 0))[0];
        }
        if (!voice) {
            voice = voices.filter(v => v.gender && v.gender.toLowerCase() === gender)[0];
        }
    }
    utterance.voice = voice || voices[0];
    // iOS 10 Safari has a bug that utterance.voice is no effect.
    utterance.volume = parseFloat(localStorage.getItem('volume') || '1.0');
    speechSynthesis.speak(utterance);
    return true;
}

function unlock() {
    window.removeEventListener('click', unlock);
    speechSynthesis.speak(new SpeechSynthesisUtterance(''));
}

window.addEventListener('load', function (event) {
    if (speechSynthesis) {
        speechSynthesis.getVoices();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = function () {
                console.log('onvoiceschanged');
            };
        }
        window.addEventListener('click', unlock, false); // for iOS
    }
});
},{}]},{},[3])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvY29uc3RhbnRzLmpzIiwic3JjL2Nvb3JkX2NvbnZlcnQuanMiLCJzcmMvbWFpbi5qcyIsInNyYy9uZXVyYWxfbmV0d29yay5qcyIsInNyYy9zcGVlY2guanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9cmV0dXJuIGV9KSgpIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG4vLy8g44Kz44Of44Gn44GZ44CCXG5jb25zdCBLT01JID0gZXhwb3J0cy5LT01JID0gNy4wO1xuXG4vLy8g56KB55uk44Gu44K144Kk44K644Gn44GZ44CCXG5jb25zdCBCU0laRSA9IGV4cG9ydHMuQlNJWkUgPSA5O1xuXG4vLy8g5aSW5p6g44KS5oyB44Gk5ouh5by156KB55uk44Gu44K144Kk44K644Gn44GZ44CCXG5jb25zdCBFQlNJWkUgPSBleHBvcnRzLkVCU0laRSA9IEJTSVpFICsgMjtcblxuLy8vIOeigeebpOOBruS6pOeCueOBruaVsOOBp+OBmeOAglxuY29uc3QgQlZDTlQgPSBleHBvcnRzLkJWQ05UID0gQlNJWkUgKiBCU0laRTtcblxuLy8vIOaLoeW8teeigeebpOOBruS6pOeCueOBruaVsOOBp+OBmeOAglxuY29uc3QgRUJWQ05UID0gZXhwb3J0cy5FQlZDTlQgPSBFQlNJWkUgKiBFQlNJWkU7XG5cbi8vLyDjg5HjgrnjgpLooajjgZnnt5rlvaLluqfmqJnjgafjgZnjgILpgJrluLjjga7nnYDmiYvjga/mi6HlvLXnooHnm6Tjga7nt5rlvaLluqfmqJnjgafooajjgZfjgb7jgZnjgIJcbi8vIFRPRE8gLSDnnYDmiYvjga7jgZ/jgoHjgavliJfmjJnlnovjgpLkvZzjgaPjgZ/jgbvjgYbjgYzplqLmlbDjga7jgrfjgrDjg4vjg4Hjg6Pjga/oqq3jgb/jgoTjgZnjgYTjgIJcbmNvbnN0IFBBU1MgPSBleHBvcnRzLlBBU1MgPSBFQlZDTlQ7XG5cbi8vLyDnt5rlvaLluqfmqJnjga7jg5fjg6zjg7zjgrnjg5vjg6vjg4Djg7zjga7mnKrkvb/nlKjjgpLnpLrjgZnlgKTjgafjgZnjgIJcbi8vIFRPRE8gLSDoqbLlvZPjgZnjgovloLTmiYDjgatPcHRpb248dXNpemU+44KS5L2/44Gj44Gf44G744GG44GM6Zai5pWw44Gu44K344Kw44OL44OB44Oj44Gv6Kqt44G/44KE44GZ44GE44CCXG5jb25zdCBWTlVMTCA9IGV4cG9ydHMuVk5VTEwgPSBFQlZDTlQgKyAxO1xuXG4vLy8gTk7jgbjjga7lhaXlipvjgavplqLjgZnjgovlsaXmrbTjga7mt7HjgZXjgafjgZnjgIJcbmNvbnN0IEtFRVBfUFJFVl9DTlQgPSBleHBvcnRzLktFRVBfUFJFVl9DTlQgPSAyO1xuXG4vLy8gTk7jgbjjga7lhaXlipvjg5XjgqPjg7zjg4Hjg6Pjg7zjga7mlbDjgafjgZnjgIJcbmNvbnN0IEZFQVRVUkVfQ05UID0gZXhwb3J0cy5GRUFUVVJFX0NOVCA9IEtFRVBfUFJFVl9DTlQgKiAyICsgMzsgLy8gNyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5YX0xBQkVMUyA9IHVuZGVmaW5lZDtcbmV4cG9ydHMubW92ZTJ4eSA9IG1vdmUyeHk7XG5leHBvcnRzLmV2Mnh5ID0gZXYyeHk7XG5leHBvcnRzLnh5MmV2ID0geHkyZXY7XG5leHBvcnRzLnJ2MmV2ID0gcnYyZXY7XG5leHBvcnRzLmV2MnJ2ID0gZXYycnY7XG5leHBvcnRzLmV2MnN0ciA9IGV2MnN0cjtcbmV4cG9ydHMuc3RyMmV2ID0gc3RyMmV2O1xuXG52YXIgX2NvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzLmpzJyk7XG5cbmNvbnN0IFhfTEFCRUxTID0gZXhwb3J0cy5YX0xBQkVMUyA9ICdAQUJDREVGR0hKS0xNTk9QUVJTVCc7XG5cbmZ1bmN0aW9uIG1vdmUyeHkocykge1xuICAgIGNvbnN0IE9GRlNFVCA9ICdhJy5jaGFyQ29kZUF0KDApIC0gMTtcbiAgICByZXR1cm4gW3MuY2hhckNvZGVBdCgwKSAtIE9GRlNFVCwgX2NvbnN0YW50cy5CU0laRSArIDEgLSAocy5jaGFyQ29kZUF0KDEpIC0gT0ZGU0VUKV07XG59XG5cbmZ1bmN0aW9uIGV2Mnh5KGV2KSB7XG4gICAgcmV0dXJuIFtldiAlIF9jb25zdGFudHMuRUJTSVpFLCBNYXRoLmZsb29yKGV2IC8gX2NvbnN0YW50cy5FQlNJWkUpXTtcbn1cblxuZnVuY3Rpb24geHkyZXYoeCwgeSkge1xuICAgIHJldHVybiB5ICogX2NvbnN0YW50cy5FQlNJWkUgKyB4O1xufVxuXG5mdW5jdGlvbiBydjJldihydikge1xuICAgIHJldHVybiBydiA9PT0gX2NvbnN0YW50cy5CVkNOVCA/IF9jb25zdGFudHMuUEFTUyA6IHJ2ICUgX2NvbnN0YW50cy5CU0laRSArIDEgKyBNYXRoLmZsb29yKHJ2IC8gX2NvbnN0YW50cy5CU0laRSArIDEpICogX2NvbnN0YW50cy5FQlNJWkU7XG59XG5cbmZ1bmN0aW9uIGV2MnJ2KGV2KSB7XG4gICAgcmV0dXJuIGV2ID09PSBfY29uc3RhbnRzLlBBU1MgPyBfY29uc3RhbnRzLkJWQ05UIDogZXYgJSBfY29uc3RhbnRzLkVCU0laRSAtIDEgKyBNYXRoLmZsb29yKGV2IC8gX2NvbnN0YW50cy5FQlNJWkUgLSAxKSAqIF9jb25zdGFudHMuQlNJWkU7XG59XG5cbmZ1bmN0aW9uIGV2MnN0cihldikge1xuICAgIGlmIChldiA+PSBfY29uc3RhbnRzLlBBU1MpIHtcbiAgICAgICAgcmV0dXJuICdwYXNzJztcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBbeCwgeV0gPSBldjJ4eShldik7XG4gICAgICAgIHJldHVybiBYX0xBQkVMUy5jaGFyQXQoeCkgKyB5LnRvU3RyaW5nKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBzdHIyZXYodikge1xuICAgIGNvbnN0IHZTdHIgPSB2LnRvVXBwZXJDYXNlKCk7XG4gICAgaWYgKHZTdHIgPT09ICdQQVNTJyB8fCB2U3RyID09PSAnUkVTSUdOJykge1xuICAgICAgICByZXR1cm4gX2NvbnN0YW50cy5QQVNTO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHggPSBYX0xBQkVMUy5pbmRleE9mKHZTdHIuY2hhckF0KDApKTtcbiAgICAgICAgY29uc3QgeSA9IHBhcnNlSW50KHZTdHIuc2xpY2UoMSkpO1xuICAgICAgICByZXR1cm4geHkyZXYoeCwgeSk7XG4gICAgfVxufSIsIid1c2Ugc3RyaWN0JztcblxudmFyIF9uZXVyYWxfbmV0d29yayA9IHJlcXVpcmUoJy4vbmV1cmFsX25ldHdvcmsuanMnKTtcblxudmFyIF9jb29yZF9jb252ZXJ0ID0gcmVxdWlyZSgnLi9jb29yZF9jb252ZXJ0LmpzJyk7XG5cbnZhciBfY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMuanMnKTtcblxudmFyIF9zcGVlY2ggPSByZXF1aXJlKCcuL3NwZWVjaC5qcycpO1xuXG4vKiBnbG9iYWwgJCBKR08gQm9hcmRDb250cm9sbGVyIFdvcmtlclByb2NlZHVyZUNhbGwgKi9cbmNsYXNzIEE5RW5naW5lIHtcbiAgICBjb25zdHJ1Y3Rvcihubiwgd29ya2VyKSB7XG4gICAgICAgIHRoaXMud29ya2VyID0gd29ya2VyO1xuICAgICAgICB0aGlzLnJlY2VpdmVyID0gbmV3IFdvcmtlclByb2NlZHVyZUNhbGwodGhpcy53b3JrZXIsIHRoaXMuY29uc3RydWN0b3IubmFtZSk7XG4gICAgfVxuXG4gICAgYXN5bmMgY2xlYXIoKSB7XG4gICAgICAgIGF3YWl0IHRoaXMuc3RvcFBvbmRlcigpO1xuICAgICAgICBhd2FpdCB0aGlzLnJlY2VpdmVyLmNhbGwoJ2NsZWFyJyk7XG4gICAgfVxuXG4gICAgYXN5bmMgdGltZVNldHRpbmdzKG1haW5UaW1lLCBieW95b21pKSB7XG4gICAgICAgIGF3YWl0IHRoaXMucmVjZWl2ZXIuY2FsbCgndGltZVNldHRpbmdzJywgW21haW5UaW1lLCBieW95b21pXSk7XG4gICAgfVxuXG4gICAgYXN5bmMgZ2VubW92ZSgpIHtcbiAgICAgICAgY29uc3QgW21vdmUsIHdpblJhdGVdID0gYXdhaXQgdGhpcy5iZXN0TW92ZSgpO1xuICAgICAgICBpZiAod2luUmF0ZSA8IDAuMSkge1xuICAgICAgICAgICAgcmV0dXJuICdyZXNpZ24nO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbGF5KG1vdmUpO1xuICAgICAgICAgICAgcmV0dXJuICgwLCBfY29vcmRfY29udmVydC5ldjJzdHIpKG1vdmUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYXN5bmMgcGxheShldikge1xuICAgICAgICBhd2FpdCB0aGlzLnJlY2VpdmVyLmNhbGwoJ3BsYXknLCBbZXZdKTtcbiAgICB9XG5cbiAgICBhc3luYyBiZXN0TW92ZSgpIHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucmVjZWl2ZXIuY2FsbCgnYmVzdE1vdmUnKTtcbiAgICB9XG5cbiAgICBhc3luYyBmaW5hbFNjb3JlKCkge1xuICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5yZWNlaXZlci5jYWxsKCdmaW5hbFNjb3JlJyk7XG4gICAgfVxuXG4gICAgc3RhcnRQb25kZXIoKSB7XG4gICAgICAgIHRoaXMucG9uZGVyUHJvbWlzZSA9IHRoaXMucmVjZWl2ZXIuY2FsbCgncG9uZGVyJyk7XG4gICAgfVxuXG4gICAgYXN5bmMgc3RvcFBvbmRlcigpIHtcbiAgICAgICAgaWYgKHRoaXMucG9uZGVyUHJvbWlzZSkge1xuICAgICAgICAgICAgd2luZG93LlBPTkRFUl9TVE9QID0gdHJ1ZTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucG9uZGVyUHJvbWlzZTtcbiAgICAgICAgICAgIHRoaXMucG9uZGVyUHJvbWlzZSA9IG51bGw7XG4gICAgICAgICAgICB3aW5kb3cuUE9OREVSX1NUT1AgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuY2xhc3MgUGxheUNvbnRyb2xsZXIge1xuICAgIGNvbnN0cnVjdG9yKGVuZ2luZSwgYm9hcmQpIHtcbiAgICAgICAgdGhpcy5lbmdpbmUgPSBlbmdpbmU7XG4gICAgICAgIHRoaXMuYm9hcmQgPSBib2FyZDtcbiAgICAgICAgdGhpcy5pc1NlbGZQbGF5ID0gZmFsc2U7XG4gICAgfVxuXG4gICAgc2V0SXNTZWxmUGxheShpc1NlbGZQbGF5KSB7XG4gICAgICAgIHRoaXMuaXNTZWxmUGxheSA9IGlzU2VsZlBsYXk7XG4gICAgfVxuICAgIGFzeW5jIHVwZGF0ZShjb29yZCkge1xuICAgICAgICBpZiAoY29vcmQgPT09ICdlbmQnKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNjb3JlID0gYXdhaXQgdGhpcy5maW5hbFNjb3JlKCk7XG4gICAgICAgICAgICAgICAgbGV0IG1lc3NhZ2UgPSBzY29yZSA9PT0gMCA/ICfmjIHnooEnIDogc2NvcmUgPiAwID8gYOm7kiR7c2NvcmV955uu5Yud44GhYCA6IGDnmb0key1zY29yZX3nm67li53jgaFgO1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UgKz0gJ+OBp+OBmeOBi++8nyc7XG4gICAgICAgICAgICAgICAgKDAsIF9zcGVlY2guc3BlYWspKG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBhbGVydChtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICAgICAgJChkb2N1bWVudC5ib2R5KS5hZGRDbGFzcygnZW5kJyk7XG4gICAgICAgICAgICAgICAgfSwgMzAwMCk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgKDAsIF9zcGVlY2guc3BlYWspKCfjgZnjgb/jgb7jgZvjgpPjgIHmlbTlnLDjgafjgY3jgb7jgZvjgpPjgafjgZfjgZ8nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXMuaXNTZWxmUGxheSAmJiB0eXBlb2YgY29vcmQgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmVuZ2luZS5zdG9wUG9uZGVyKCk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmVuZ2luZS5wbGF5KCgwLCBfY29vcmRfY29udmVydC54eTJldikoY29vcmQuaSArIDEsIF9jb25zdGFudHMuQlNJWkUgLSBjb29yZC5qKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuaXNTZWxmUGxheSB8fCB0aGlzLmJvYXJkLnR1cm4gIT09IHRoaXMuYm9hcmQub3duQ29sb3IpIHtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IG1vdmUgPSBhd2FpdCB0aGlzLmVuZ2luZS5nZW5tb3ZlKCk7XG4gICAgICAgICAgICAgICAgc3dpdGNoIChtb3ZlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3Jlc2lnbic6XG4gICAgICAgICAgICAgICAgICAgICAgICAoMCwgX3NwZWVjaC5zcGVhaykoJ+iyoOOBkeOBvuOBl+OBnycsICdqYS1qcCcsICdmZW1hbGUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICQoZG9jdW1lbnQuYm9keSkuYWRkQ2xhc3MoJ2VuZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3Bhc3MnOlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5ib2FyZC5wbGF5KG51bGwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgKDAsIF9zcGVlY2guc3BlYWspKCfjg5HjgrnjgZfjgb7jgZknLCAnamEtanAnLCAnZmVtYWxlJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBldiA9ICgwLCBfY29vcmRfY29udmVydC5zdHIyZXYpKG1vdmUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHh5ID0gKDAsIF9jb29yZF9jb252ZXJ0LmV2Mnh5KShldik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5ib2FyZC5wbGF5KG5ldyBKR08uQ29vcmRpbmF0ZSh4eVswXSAtIDEsIF9jb25zdGFudHMuQlNJWkUgLSB4eVsxXSksIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIDApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5lbmdpbmUuc3RhcnRQb25kZXIoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIHBhc3MoKSB7XG4gICAgICAgIGlmICh0aGlzLmJvYXJkLm93bkNvbG9yID09PSB0aGlzLmJvYXJkLnR1cm4pIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuZW5naW5lLnN0b3BQb25kZXIoKTtcbiAgICAgICAgICAgIHRoaXMuZW5naW5lLnBsYXkoX2NvbnN0YW50cy5QQVNTKTtcbiAgICAgICAgICAgIHRoaXMuYm9hcmQucGxheShudWxsKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIGZpbmFsU2NvcmUoKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0ICQucG9zdCh7XG4gICAgICAgICAgICB1cmw6ICdodHRwOi8vMzUuMjAzLjE2MS4xMDAvZ251Z28nLFxuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIHNnZjogdGhpcy5ib2FyZC5qcmVjb3JkLnRvU2dmKCksXG4gICAgICAgICAgICAgICAgbW92ZTogJ2VzdCcsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnYWZ0ZXJtYXRoJyxcbiAgICAgICAgICAgICAgICBydWxlOiAnY2hpbmVzZSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmICgvSmlnby8udGVzdChyZXN1bHQpKSB7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBtYXRjaCA9IHJlc3VsdC5tYXRjaCgvKEJsYWNrfFdoaXRlKSB3aW5zIGJ5IChbMC05Ll0rKSBwb2ludHMvKTtcbiAgICAgICAgaWYgKG1hdGNoKSB7XG4gICAgICAgICAgICBsZXQgc2NvcmUgPSBwYXJzZUZsb2F0KG1hdGNoWzJdKTtcbiAgICAgICAgICAgIGlmIChtYXRjaFsxXSA9PT0gJ0JsYWNrJykge1xuICAgICAgICAgICAgICAgIHJldHVybiBzY29yZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIC1zY29yZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgfVxuXG59XG5cbmFzeW5jIGZ1bmN0aW9uIG1haW4oKSB7XG4gICAgY29uc3QgYm9hcmQgPSBhd2FpdCBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzLCByZWopIHtcbiAgICAgICAgbmV3IEJvYXJkQ29udHJvbGxlcihfY29uc3RhbnRzLkJTSVpFLCAwLCByZXMpO1xuICAgIH0pO1xuICAgIC8vIEpHT+OBruODrOODs+ODgOODquODs+OCsOOCkuWujOS6huOBleOBm+OCi+OBn+OCgeOBq3NldFRpbWVvdXTjgafjgqTjg5njg7Pjg4jjg6vjg7zjg5fjgpLpgLLjgoHjgotcbiAgICBzZXRUaW1lb3V0KGFzeW5jIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IG5uLmxvYWQoKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgaWYgKGUubWVzc2FnZSA9PT0gJ05vIGJhY2tlbmQgaXMgYXZhaWxhYmxlJykge1xuICAgICAgICAgICAgICAgIGlmICgvKE1hYyBPUyBYIDEwXzEzfChpUGFkfGlQaG9uZXxpUG9kKTsgQ1BVIE9TIDExKS4qU2FmYXJpLy50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpICYmICEvQ2hyb21lLy50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpKSB7XG4gICAgICAgICAgICAgICAgICAgICgwLCBfc3BlZWNoLnNwZWFrKSgn5q6L5b+144Gq44GM44KJ44GK5L2/44GE44Gu44OW44Op44Km44K244Gn44Gv5YuV44GN44G+44Gb44KT44CCU2FmYXJp44KS44GK5L2/44GE44Gn44GZ44Gt44CC44CM6ZaL55m644CN44Oh44OL44Ol44O844Gu44CM5a6f6aiT55qE44Gq5qmf6IO944CN44Gn44CMV2ViR1BV44CN44KS5pyJ5Yq544Gr44GZ44KL44Go5YuV44GP44GL44KC44GX44KM44G+44Gb44KTJywgJ2phLWpwJywgJ2ZlbWFsZScpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoISgwLCBfc3BlZWNoLnNwZWFrKSgn5q6L5b+144Gq44GM44KJ44GK5L2/44GE44Gu44OW44Op44Km44K244Gn44Gv5YuV44GN44G+44Gb44KTJywgJ2phLWpwJywgJ2ZlbWFsZScpKSB7XG4gICAgICAgICAgICAgICAgICAgIGFsZXJ0KCfmrovlv7XjgarjgYzjgonjgYrkvb/jgYTjga7jg5bjg6njgqbjgrbjgafjga/li5XjgY3jgb7jgZvjgpMnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY29uZGl0aW9uID0gYXdhaXQgbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlcywgcmVqKSB7XG4gICAgICAgICAgICBjb25zdCAkc3RhcnRNb2RhbCA9ICQoJyNzdGFydC1tb2RhbCcpO1xuICAgICAgICAgICAgJHN0YXJ0TW9kYWwubW9kYWwoJ3Nob3cnKTtcbiAgICAgICAgICAgICRzdGFydE1vZGFsLm9uZSgnaGlkZGVuLmJzLm1vZGFsJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkY29uZGl0aW9uRm9ybSA9ICQoJyNjb25kaXRpb24tZm9ybScpO1xuICAgICAgICAgICAgICAgIHJlcyh7XG4gICAgICAgICAgICAgICAgICAgIGNvbG9yOiAkY29uZGl0aW9uRm9ybVswXVsnY29sb3InXS52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgdGltZVJ1bGU6ICRjb25kaXRpb25Gb3JtWzBdWyd0aW1lJ10udmFsdWUsXG4gICAgICAgICAgICAgICAgICAgIHRpbWU6IHBhcnNlSW50KCRjb25kaXRpb25Gb3JtWzBdWydhaS1ieW95b21pJ10udmFsdWUpXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHN3aXRjaCAoY29uZGl0aW9uLnRpbWVSdWxlKSB7XG4gICAgICAgICAgICBjYXNlICdhaS10aW1lJzpcbiAgICAgICAgICAgICAgICBhd2FpdCBlbmdpbmUudGltZVNldHRpbmdzKDAsIGNvbmRpdGlvbi50aW1lKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2lnby1xdWVzdCc6XG4gICAgICAgICAgICAgICAgYXdhaXQgZW5naW5lLnRpbWVTZXR0aW5ncygzICogNjAgKyA1NSwgMSk7IC8vIDnot6/nm6Tjga/lubPlnYfmiYvmlbDjgYwxMTDmiYvjgonjgZfjgYTjga7jgafjgIE1NeOBruODleOCo+ODg+OCt+ODo+ODvOenkuOCkui/veWKoFxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGJvYXJkLnNldE93bkNvbG9yKGNvbmRpdGlvbi5jb2xvciA9PT0gJ1cnID8gSkdPLldISVRFIDogSkdPLkJMQUNLKTtcbiAgICAgICAgY29uc3QgY29udHJvbGxlciA9IG5ldyBQbGF5Q29udHJvbGxlcihlbmdpbmUsIGJvYXJkKTtcbiAgICAgICAgY29uc3QgaXNTZWxmUGxheSA9IGNvbmRpdGlvbi5jb2xvciA9PT0gJ3NlbGYtcGxheSc7XG4gICAgICAgIGlmICghaXNTZWxmUGxheSkge1xuICAgICAgICAgICAgKDAsIF9zcGVlY2guc3BlYWspKCfjgYrpoZjjgYTjgZfjgb7jgZknLCAnamEtanAnLCAnZmVtYWxlJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29udHJvbGxlci5zZXRJc1NlbGZQbGF5KGlzU2VsZlBsYXkpO1xuICAgICAgICBib2FyZC5hZGRPYnNlcnZlcihjb250cm9sbGVyKTtcbiAgICAgICAgJCgnI3Bhc3MnKS5vbignY2xpY2snLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIGNvbnRyb2xsZXIucGFzcygpO1xuICAgICAgICB9KTtcbiAgICAgICAgJCgnI3Jlc2lnbicpLm9uKCdjbGljaycsIGFzeW5jIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgYXdhaXQgZW5naW5lLnN0b3BQb25kZXIoKTtcbiAgICAgICAgICAgICgwLCBfc3BlZWNoLnNwZWFrKSgn44GC44KK44GM44Go44GG44GU44GW44GE44G+44GX44GfJywgJ2phLWpwJywgJ2ZlbWFsZScpO1xuICAgICAgICAgICAgJChkb2N1bWVudC5ib2R5KS5hZGRDbGFzcygnZW5kJyk7XG4gICAgICAgIH0pO1xuICAgICAgICAkKCcjcmV0cnknKS5vbmUoJ2NsaWNrJywgYXN5bmMgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAkKCcjcGFzcycpLm9mZignY2xpY2snKTtcbiAgICAgICAgICAgICQoJyNyZXNpZ24nKS5vZmYoJ2NsaWNrJyk7XG4gICAgICAgICAgICBib2FyZC5kZXN0cm95KCk7XG4gICAgICAgICAgICBlbmdpbmUuY2xlYXIoKTtcbiAgICAgICAgICAgICQoZG9jdW1lbnQuYm9keSkucmVtb3ZlQ2xhc3MoJ2VuZCcpO1xuICAgICAgICAgICAgc2V0VGltZW91dChtYWluLCAwKTtcbiAgICAgICAgfSk7XG4gICAgfSwgMCk7XG59XG5cbmNvbnN0IHdvcmtlciA9IG5ldyBXb3JrZXIoJ2pzL3dvcmtlci5qcycpO1xuY29uc3Qgbm4gPSBuZXcgX25ldXJhbF9uZXR3b3JrLk5ldXJhbE5ldHdvcmsod29ya2VyKTtcbmNvbnN0IGVuZ2luZSA9IG5ldyBBOUVuZ2luZShubiwgd29ya2VyKTtcbm1haW4oKTsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcbi8qIGdsb2JhbCBXZWJETk4gYWRkUHJvY2VkdXJlTGlzdGVuZXIgKi9cblxuaWYgKCFBcnJheUJ1ZmZlci5wcm90b3R5cGUuc2xpY2UpIHtcbiAgICBBcnJheUJ1ZmZlci5wcm90b3R5cGUuc2xpY2UgPSBmdW5jdGlvbiAoc3RhcnQsIGVuZCkge1xuICAgICAgICB2YXIgdGhhdCA9IG5ldyBVaW50OEFycmF5KHRoaXMpO1xuICAgICAgICBpZiAoZW5kID09IHVuZGVmaW5lZCkgZW5kID0gdGhhdC5sZW5ndGg7XG4gICAgICAgIHZhciByZXN1bHQgPSBuZXcgQXJyYXlCdWZmZXIoZW5kIC0gc3RhcnQpO1xuICAgICAgICB2YXIgcmVzdWx0QXJyYXkgPSBuZXcgVWludDhBcnJheShyZXN1bHQpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJlc3VsdEFycmF5Lmxlbmd0aDsgaSsrKSByZXN1bHRBcnJheVtpXSA9IHRoYXRbaSArIHN0YXJ0XTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xufVxuXG5jbGFzcyBOZXVyYWxOZXR3b3JrIHtcbiAgICBjb25zdHJ1Y3Rvcih3b3JrZXIpIHtcbiAgICAgICAgdGhpcy5ubiA9IG51bGw7XG4gICAgICAgIGFkZFByb2NlZHVyZUxpc3RlbmVyKHdvcmtlciwgdGhpcyk7XG4gICAgfVxuXG4gICAgYXN5bmMgbG9hZCgpIHtcbiAgICAgICAgaWYgKHRoaXMubm4pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLm5uID0gYXdhaXQgV2ViRE5OLmxvYWQoJy4vb3V0cHV0JywgeyBiYWNrZW5kT3JkZXI6IFsnd2ViZ3B1JywgJ3dlYmdsJ10gfSk7XG4gICAgfVxuXG4gICAgYXN5bmMgZXZhbHVhdGUoZmVhdHVyZSkge1xuICAgICAgICBjb25zdCB2aWV3cyA9IHRoaXMubm4uZ2V0SW5wdXRWaWV3cygpO1xuICAgICAgICB2aWV3c1swXS5zZXQoZmVhdHVyZSk7XG4gICAgICAgIGF3YWl0IHRoaXMubm4ucnVuKCk7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMubm4uZ2V0T3V0cHV0Vmlld3MoKS5tYXAoZSA9PiBlLnRvQWN0dWFsKCkuc2xpY2UoMCkpOyAvLyB0by5BY3R1YWzjgZ3jga7jgoLjga7jgafjga93b3JrZXLlgbTjgadkZXRhY2jjgYzjgafjgY3jgarjgYTmqKHmp5hcbiAgICAgICAgcmVzdWx0LnB1c2god2luZG93LlBPTkRFUl9TVE9QKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG59XG5leHBvcnRzLk5ldXJhbE5ldHdvcmsgPSBOZXVyYWxOZXR3b3JrOyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5zcGVhayA9IHNwZWFrO1xuZnVuY3Rpb24gc3BlYWsodGV4dCwgbGFuZywgZ2VuZGVyKSB7XG4gICAgaWYgKCFTcGVlY2hTeW50aGVzaXNVdHRlcmFuY2UpIHJldHVybiBmYWxzZTtcblxuICAgIHN3aXRjaCAobGFuZykge1xuICAgICAgICBjYXNlICdlbic6XG4gICAgICAgICAgICBsYW5nID0gJ2VuLXVzJztcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdqYSc6XG4gICAgICAgICAgICBsYW5nID0gJ2phLWpwJztcbiAgICAgICAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBjb25zdCB1dHRlcmFuY2UgPSBuZXcgU3BlZWNoU3ludGhlc2lzVXR0ZXJhbmNlKHRleHQpO1xuICAgIGlmICgvKGlQaG9uZXxpUGFkfGlQb2QpKD89LipPUyBbNy04XSkvLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCkpIHV0dGVyYW5jZS5yYXRlID0gMC4yO1xuICAgIGNvbnN0IHZvaWNlcyA9IHNwZWVjaFN5bnRoZXNpcy5nZXRWb2ljZXMoKS5maWx0ZXIoZSA9PiBlLmxhbmcudG9Mb3dlckNhc2UoKSA9PT0gbGFuZyk7XG4gICAgbGV0IHZvaWNlID0gbnVsbDtcbiAgICBpZiAodm9pY2VzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgbGV0IG5hbWVzID0gbnVsbDtcbiAgICAgICAgc3dpdGNoIChsYW5nKSB7XG4gICAgICAgICAgICBjYXNlICdqYS1qcCc6XG4gICAgICAgICAgICAgICAgc3dpdGNoIChnZW5kZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnbWFsZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lcyA9IFsnT3RveWEnLCAnSGF0dG9yaScsICdJY2hpcm8nXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdmZW1hbGUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZXMgPSBbJ08tcmVu77yI5ouh5by177yJJywgJ08tcmVuJywgJ0t5b2tvJywgJ0hhcnVrYSddOyAvLyBXaW5kb3dzIDEw44GuQXl1bWnjga7lo7Djga/ku4rjgbLjgajjgaRcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2VuLXVzJzpcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGdlbmRlcikge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdtYWxlJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWVzID0gWydBbGV4JywgJ0ZyZWQnXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdmZW1hbGUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZXMgPSBbJ1NhbWFudGhhJywgJ1ZpY3RvcmlhJ107XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5hbWVzKSB7XG4gICAgICAgICAgICB2b2ljZSA9IHZvaWNlcy5maWx0ZXIodiA9PiBuYW1lcy5zb21lKG4gPT4gdi5uYW1lLmluZGV4T2YobikgPj0gMCkpWzBdO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdm9pY2UpIHtcbiAgICAgICAgICAgIHZvaWNlID0gdm9pY2VzLmZpbHRlcih2ID0+IHYuZ2VuZGVyICYmIHYuZ2VuZGVyLnRvTG93ZXJDYXNlKCkgPT09IGdlbmRlcilbMF07XG4gICAgICAgIH1cbiAgICB9XG4gICAgdXR0ZXJhbmNlLnZvaWNlID0gdm9pY2UgfHwgdm9pY2VzWzBdO1xuICAgIC8vIGlPUyAxMCBTYWZhcmkgaGFzIGEgYnVnIHRoYXQgdXR0ZXJhbmNlLnZvaWNlIGlzIG5vIGVmZmVjdC5cbiAgICB1dHRlcmFuY2Uudm9sdW1lID0gcGFyc2VGbG9hdChsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgndm9sdW1lJykgfHwgJzEuMCcpO1xuICAgIHNwZWVjaFN5bnRoZXNpcy5zcGVhayh1dHRlcmFuY2UpO1xuICAgIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiB1bmxvY2soKSB7XG4gICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdW5sb2NrKTtcbiAgICBzcGVlY2hTeW50aGVzaXMuc3BlYWsobmV3IFNwZWVjaFN5bnRoZXNpc1V0dGVyYW5jZSgnJykpO1xufVxuXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIGZ1bmN0aW9uIChldmVudCkge1xuICAgIGlmIChzcGVlY2hTeW50aGVzaXMpIHtcbiAgICAgICAgc3BlZWNoU3ludGhlc2lzLmdldFZvaWNlcygpO1xuICAgICAgICBpZiAoc3BlZWNoU3ludGhlc2lzLm9udm9pY2VzY2hhbmdlZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBzcGVlY2hTeW50aGVzaXMub252b2ljZXNjaGFuZ2VkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdvbnZvaWNlc2NoYW5nZWQnKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdW5sb2NrLCBmYWxzZSk7IC8vIGZvciBpT1NcbiAgICB9XG59KTsiXX0=
