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
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.opponentOf = opponentOf;
const WHITE = exports.WHITE = 0;
const BLACK = exports.BLACK = 1;

function opponentOf(color) {
    switch (color) {
        case WHITE:
            return BLACK;
        case BLACK:
            return WHITE;
    }
}

const EMPTY = exports.EMPTY = 2;
const EXTERIOR = exports.EXTERIOR = 3;
},{}],4:[function(require,module,exports){
'use strict';

var _neural_network = require('./neural_network.js');

var _coord_convert = require('./coord_convert.js');

var _constants = require('./constants.js');

var _intersection = require('./intersection.js');

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
        console.log(move, winRate);
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
            console.log('ponder stopped');
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
            const message = score === 0 ? '持碁' : score > 0 ? `黒${score}目勝ち` : `白${-score}目勝ち`;
            alert(message + 'ですか？すみません、整地苦手です…');
            $(document.body).addClass('end');
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
                        alert('負けました');
                        $(document.body).addClass('end');
                        break;
                    case 'pass':
                        this.board.play(null);
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
                    alert('残念ながらお使いのブラウザでは動きません。Safariをお使いですね。「開発」メニューの「実験的な機能」で「WebGPU」を有効にすると動くかもしれません');
                } else {
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
        controller.setIsSelfPlay(condition.color === 'self-play');
        board.addObserver(controller);
        $('#pass').on('click', function (event) {
            controller.pass();
        });
        $('#resign').on('click', async function (event) {
            await engine.stopPonder();
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
},{"./constants.js":1,"./coord_convert.js":2,"./intersection.js":3,"./neural_network.js":5}],5:[function(require,module,exports){
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
        const result = this.nn.getOutputViews().map(e => e.toActual());
        result.push(window.PONDER_STOP);
        return result;
    }
}
exports.NeuralNetwork = NeuralNetwork;
},{}]},{},[4])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvY29uc3RhbnRzLmpzIiwic3JjL2Nvb3JkX2NvbnZlcnQuanMiLCJzcmMvaW50ZXJzZWN0aW9uLmpzIiwic3JjL21haW4uanMiLCJzcmMvbmV1cmFsX25ldHdvcmsuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfXJldHVybiBlfSkoKSIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuLy8vIOOCs+ODn+OBp+OBmeOAglxuY29uc3QgS09NSSA9IGV4cG9ydHMuS09NSSA9IDcuMDtcblxuLy8vIOeigeebpOOBruOCteOCpOOCuuOBp+OBmeOAglxuY29uc3QgQlNJWkUgPSBleHBvcnRzLkJTSVpFID0gOTtcblxuLy8vIOWkluaeoOOCkuaMgeOBpOaLoeW8teeigeebpOOBruOCteOCpOOCuuOBp+OBmeOAglxuY29uc3QgRUJTSVpFID0gZXhwb3J0cy5FQlNJWkUgPSBCU0laRSArIDI7XG5cbi8vLyDnooHnm6Tjga7kuqTngrnjga7mlbDjgafjgZnjgIJcbmNvbnN0IEJWQ05UID0gZXhwb3J0cy5CVkNOVCA9IEJTSVpFICogQlNJWkU7XG5cbi8vLyDmi6HlvLXnooHnm6Tjga7kuqTngrnjga7mlbDjgafjgZnjgIJcbmNvbnN0IEVCVkNOVCA9IGV4cG9ydHMuRUJWQ05UID0gRUJTSVpFICogRUJTSVpFO1xuXG4vLy8g44OR44K544KS6KGo44GZ57ea5b2i5bqn5qiZ44Gn44GZ44CC6YCa5bi444Gu552A5omL44Gv5ouh5by156KB55uk44Gu57ea5b2i5bqn5qiZ44Gn6KGo44GX44G+44GZ44CCXG4vLyBUT0RPIC0g552A5omL44Gu44Gf44KB44Gr5YiX5oyZ5Z6L44KS5L2c44Gj44Gf44G744GG44GM6Zai5pWw44Gu44K344Kw44OL44OB44Oj44Gv6Kqt44G/44KE44GZ44GE44CCXG5jb25zdCBQQVNTID0gZXhwb3J0cy5QQVNTID0gRUJWQ05UO1xuXG4vLy8g57ea5b2i5bqn5qiZ44Gu44OX44Os44O844K544Ob44Or44OA44O844Gu5pyq5L2/55So44KS56S644GZ5YCk44Gn44GZ44CCXG4vLyBUT0RPIC0g6Kmy5b2T44GZ44KL5aC05omA44GrT3B0aW9uPHVzaXplPuOCkuS9v+OBo+OBn+OBu+OBhuOBjOmWouaVsOOBruOCt+OCsOODi+ODgeODo+OBr+iqreOBv+OChOOBmeOBhOOAglxuY29uc3QgVk5VTEwgPSBleHBvcnRzLlZOVUxMID0gRUJWQ05UICsgMTtcblxuLy8vIE5O44G444Gu5YWl5Yqb44Gr6Zai44GZ44KL5bGl5q2044Gu5rex44GV44Gn44GZ44CCXG5jb25zdCBLRUVQX1BSRVZfQ05UID0gZXhwb3J0cy5LRUVQX1BSRVZfQ05UID0gMjtcblxuLy8vIE5O44G444Gu5YWl5Yqb44OV44Kj44O844OB44Oj44O844Gu5pWw44Gn44GZ44CCXG5jb25zdCBGRUFUVVJFX0NOVCA9IGV4cG9ydHMuRkVBVFVSRV9DTlQgPSBLRUVQX1BSRVZfQ05UICogMiArIDM7IC8vIDciLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuWF9MQUJFTFMgPSB1bmRlZmluZWQ7XG5leHBvcnRzLm1vdmUyeHkgPSBtb3ZlMnh5O1xuZXhwb3J0cy5ldjJ4eSA9IGV2Mnh5O1xuZXhwb3J0cy54eTJldiA9IHh5MmV2O1xuZXhwb3J0cy5ydjJldiA9IHJ2MmV2O1xuZXhwb3J0cy5ldjJydiA9IGV2MnJ2O1xuZXhwb3J0cy5ldjJzdHIgPSBldjJzdHI7XG5leHBvcnRzLnN0cjJldiA9IHN0cjJldjtcblxudmFyIF9jb25zdGFudHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cy5qcycpO1xuXG5jb25zdCBYX0xBQkVMUyA9IGV4cG9ydHMuWF9MQUJFTFMgPSAnQEFCQ0RFRkdISktMTU5PUFFSU1QnO1xuXG5mdW5jdGlvbiBtb3ZlMnh5KHMpIHtcbiAgICBjb25zdCBPRkZTRVQgPSAnYScuY2hhckNvZGVBdCgwKSAtIDE7XG4gICAgcmV0dXJuIFtzLmNoYXJDb2RlQXQoMCkgLSBPRkZTRVQsIF9jb25zdGFudHMuQlNJWkUgKyAxIC0gKHMuY2hhckNvZGVBdCgxKSAtIE9GRlNFVCldO1xufVxuXG5mdW5jdGlvbiBldjJ4eShldikge1xuICAgIHJldHVybiBbZXYgJSBfY29uc3RhbnRzLkVCU0laRSwgTWF0aC5mbG9vcihldiAvIF9jb25zdGFudHMuRUJTSVpFKV07XG59XG5cbmZ1bmN0aW9uIHh5MmV2KHgsIHkpIHtcbiAgICByZXR1cm4geSAqIF9jb25zdGFudHMuRUJTSVpFICsgeDtcbn1cblxuZnVuY3Rpb24gcnYyZXYocnYpIHtcbiAgICByZXR1cm4gcnYgPT09IF9jb25zdGFudHMuQlZDTlQgPyBfY29uc3RhbnRzLlBBU1MgOiBydiAlIF9jb25zdGFudHMuQlNJWkUgKyAxICsgTWF0aC5mbG9vcihydiAvIF9jb25zdGFudHMuQlNJWkUgKyAxKSAqIF9jb25zdGFudHMuRUJTSVpFO1xufVxuXG5mdW5jdGlvbiBldjJydihldikge1xuICAgIHJldHVybiBldiA9PT0gX2NvbnN0YW50cy5QQVNTID8gX2NvbnN0YW50cy5CVkNOVCA6IGV2ICUgX2NvbnN0YW50cy5FQlNJWkUgLSAxICsgTWF0aC5mbG9vcihldiAvIF9jb25zdGFudHMuRUJTSVpFIC0gMSkgKiBfY29uc3RhbnRzLkJTSVpFO1xufVxuXG5mdW5jdGlvbiBldjJzdHIoZXYpIHtcbiAgICBpZiAoZXYgPj0gX2NvbnN0YW50cy5QQVNTKSB7XG4gICAgICAgIHJldHVybiAncGFzcyc7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgW3gsIHldID0gZXYyeHkoZXYpO1xuICAgICAgICByZXR1cm4gWF9MQUJFTFMuY2hhckF0KHgpICsgeS50b1N0cmluZygpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gc3RyMmV2KHYpIHtcbiAgICBjb25zdCB2U3RyID0gdi50b1VwcGVyQ2FzZSgpO1xuICAgIGlmICh2U3RyID09PSAnUEFTUycgfHwgdlN0ciA9PT0gJ1JFU0lHTicpIHtcbiAgICAgICAgcmV0dXJuIF9jb25zdGFudHMuUEFTUztcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCB4ID0gWF9MQUJFTFMuaW5kZXhPZih2U3RyLmNoYXJBdCgwKSk7XG4gICAgICAgIGNvbnN0IHkgPSBwYXJzZUludCh2U3RyLnNsaWNlKDEpKTtcbiAgICAgICAgcmV0dXJuIHh5MmV2KHgsIHkpO1xuICAgIH1cbn0iLCJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5vcHBvbmVudE9mID0gb3Bwb25lbnRPZjtcbmNvbnN0IFdISVRFID0gZXhwb3J0cy5XSElURSA9IDA7XG5jb25zdCBCTEFDSyA9IGV4cG9ydHMuQkxBQ0sgPSAxO1xuXG5mdW5jdGlvbiBvcHBvbmVudE9mKGNvbG9yKSB7XG4gICAgc3dpdGNoIChjb2xvcikge1xuICAgICAgICBjYXNlIFdISVRFOlxuICAgICAgICAgICAgcmV0dXJuIEJMQUNLO1xuICAgICAgICBjYXNlIEJMQUNLOlxuICAgICAgICAgICAgcmV0dXJuIFdISVRFO1xuICAgIH1cbn1cblxuY29uc3QgRU1QVFkgPSBleHBvcnRzLkVNUFRZID0gMjtcbmNvbnN0IEVYVEVSSU9SID0gZXhwb3J0cy5FWFRFUklPUiA9IDM7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgX25ldXJhbF9uZXR3b3JrID0gcmVxdWlyZSgnLi9uZXVyYWxfbmV0d29yay5qcycpO1xuXG52YXIgX2Nvb3JkX2NvbnZlcnQgPSByZXF1aXJlKCcuL2Nvb3JkX2NvbnZlcnQuanMnKTtcblxudmFyIF9jb25zdGFudHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cy5qcycpO1xuXG52YXIgX2ludGVyc2VjdGlvbiA9IHJlcXVpcmUoJy4vaW50ZXJzZWN0aW9uLmpzJyk7XG5cbi8qIGdsb2JhbCAkIEpHTyBCb2FyZENvbnRyb2xsZXIgV29ya2VyUHJvY2VkdXJlQ2FsbCAqL1xuY2xhc3MgQTlFbmdpbmUge1xuICAgIGNvbnN0cnVjdG9yKG5uLCB3b3JrZXIpIHtcbiAgICAgICAgdGhpcy53b3JrZXIgPSB3b3JrZXI7XG4gICAgICAgIHRoaXMucmVjZWl2ZXIgPSBuZXcgV29ya2VyUHJvY2VkdXJlQ2FsbCh0aGlzLndvcmtlciwgdGhpcy5jb25zdHJ1Y3Rvci5uYW1lKTtcbiAgICB9XG5cbiAgICBhc3luYyBjbGVhcigpIHtcbiAgICAgICAgYXdhaXQgdGhpcy5zdG9wUG9uZGVyKCk7XG4gICAgICAgIGF3YWl0IHRoaXMucmVjZWl2ZXIuY2FsbCgnY2xlYXInKTtcbiAgICB9XG5cbiAgICBhc3luYyB0aW1lU2V0dGluZ3MobWFpblRpbWUsIGJ5b3lvbWkpIHtcbiAgICAgICAgYXdhaXQgdGhpcy5yZWNlaXZlci5jYWxsKCd0aW1lU2V0dGluZ3MnLCBbbWFpblRpbWUsIGJ5b3lvbWldKTtcbiAgICB9XG5cbiAgICBhc3luYyBnZW5tb3ZlKCkge1xuICAgICAgICBjb25zdCBbbW92ZSwgd2luUmF0ZV0gPSBhd2FpdCB0aGlzLmJlc3RNb3ZlKCk7XG4gICAgICAgIGNvbnNvbGUubG9nKG1vdmUsIHdpblJhdGUpO1xuICAgICAgICBpZiAod2luUmF0ZSA8IDAuMSkge1xuICAgICAgICAgICAgcmV0dXJuICdyZXNpZ24nO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbGF5KG1vdmUpO1xuICAgICAgICAgICAgcmV0dXJuICgwLCBfY29vcmRfY29udmVydC5ldjJzdHIpKG1vdmUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYXN5bmMgcGxheShldikge1xuICAgICAgICBhd2FpdCB0aGlzLnJlY2VpdmVyLmNhbGwoJ3BsYXknLCBbZXZdKTtcbiAgICB9XG5cbiAgICBhc3luYyBiZXN0TW92ZSgpIHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucmVjZWl2ZXIuY2FsbCgnYmVzdE1vdmUnKTtcbiAgICB9XG5cbiAgICBhc3luYyBmaW5hbFNjb3JlKCkge1xuICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5yZWNlaXZlci5jYWxsKCdmaW5hbFNjb3JlJyk7XG4gICAgfVxuXG4gICAgc3RhcnRQb25kZXIoKSB7XG4gICAgICAgIHRoaXMucG9uZGVyUHJvbWlzZSA9IHRoaXMucmVjZWl2ZXIuY2FsbCgncG9uZGVyJyk7XG4gICAgfVxuXG4gICAgYXN5bmMgc3RvcFBvbmRlcigpIHtcbiAgICAgICAgaWYgKHRoaXMucG9uZGVyUHJvbWlzZSkge1xuICAgICAgICAgICAgd2luZG93LlBPTkRFUl9TVE9QID0gdHJ1ZTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucG9uZGVyUHJvbWlzZTtcbiAgICAgICAgICAgIHRoaXMucG9uZGVyUHJvbWlzZSA9IG51bGw7XG4gICAgICAgICAgICB3aW5kb3cuUE9OREVSX1NUT1AgPSBmYWxzZTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwb25kZXIgc3RvcHBlZCcpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5jbGFzcyBQbGF5Q29udHJvbGxlciB7XG4gICAgY29uc3RydWN0b3IoZW5naW5lLCBib2FyZCkge1xuICAgICAgICB0aGlzLmVuZ2luZSA9IGVuZ2luZTtcbiAgICAgICAgdGhpcy5ib2FyZCA9IGJvYXJkO1xuICAgICAgICB0aGlzLmlzU2VsZlBsYXkgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBzZXRJc1NlbGZQbGF5KGlzU2VsZlBsYXkpIHtcbiAgICAgICAgdGhpcy5pc1NlbGZQbGF5ID0gaXNTZWxmUGxheTtcbiAgICB9XG4gICAgYXN5bmMgdXBkYXRlKGNvb3JkKSB7XG4gICAgICAgIGlmIChjb29yZCA9PT0gJ2VuZCcpIHtcbiAgICAgICAgICAgIGNvbnN0IHNjb3JlID0gYXdhaXQgdGhpcy5lbmdpbmUuZmluYWxTY29yZSgpO1xuICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IHNjb3JlID09PSAwID8gJ+aMgeeigScgOiBzY29yZSA+IDAgPyBg6buSJHtzY29yZX3nm67li53jgaFgIDogYOeZvSR7LXNjb3JlfeebruWLneOBoWA7XG4gICAgICAgICAgICBhbGVydChtZXNzYWdlICsgJ+OBp+OBmeOBi++8n+OBmeOBv+OBvuOBm+OCk+OAgeaVtOWcsOiLpuaJi+OBp+OBmeKApicpO1xuICAgICAgICAgICAgJChkb2N1bWVudC5ib2R5KS5hZGRDbGFzcygnZW5kJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLmlzU2VsZlBsYXkgJiYgdHlwZW9mIGNvb3JkID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5lbmdpbmUuc3RvcFBvbmRlcigpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5lbmdpbmUucGxheSgoMCwgX2Nvb3JkX2NvbnZlcnQueHkyZXYpKGNvb3JkLmkgKyAxLCBfY29uc3RhbnRzLkJTSVpFIC0gY29vcmQuaikpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmlzU2VsZlBsYXkgfHwgdGhpcy5ib2FyZC50dXJuICE9PSB0aGlzLmJvYXJkLm93bkNvbG9yKSB7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBtb3ZlID0gYXdhaXQgdGhpcy5lbmdpbmUuZ2VubW92ZSgpO1xuICAgICAgICAgICAgICAgIHN3aXRjaCAobW92ZSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdyZXNpZ24nOlxuICAgICAgICAgICAgICAgICAgICAgICAgYWxlcnQoJ+iyoOOBkeOBvuOBl+OBnycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgJChkb2N1bWVudC5ib2R5KS5hZGRDbGFzcygnZW5kJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAncGFzcyc6XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJvYXJkLnBsYXkobnVsbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBldiA9ICgwLCBfY29vcmRfY29udmVydC5zdHIyZXYpKG1vdmUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHh5ID0gKDAsIF9jb29yZF9jb252ZXJ0LmV2Mnh5KShldik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5ib2FyZC5wbGF5KG5ldyBKR08uQ29vcmRpbmF0ZSh4eVswXSAtIDEsIF9jb25zdGFudHMuQlNJWkUgLSB4eVsxXSksIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIDApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5lbmdpbmUuc3RhcnRQb25kZXIoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIHBhc3MoKSB7XG4gICAgICAgIGlmICh0aGlzLmJvYXJkLm93bkNvbG9yID09PSB0aGlzLmJvYXJkLnR1cm4pIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuZW5naW5lLnN0b3BQb25kZXIoKTtcbiAgICAgICAgICAgIHRoaXMuZW5naW5lLnBsYXkoX2NvbnN0YW50cy5QQVNTKTtcbiAgICAgICAgICAgIHRoaXMuYm9hcmQucGxheShudWxsKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gbWFpbigpIHtcbiAgICBjb25zdCBib2FyZCA9IGF3YWl0IG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXMsIHJlaikge1xuICAgICAgICBuZXcgQm9hcmRDb250cm9sbGVyKF9jb25zdGFudHMuQlNJWkUsIDAsIHJlcyk7XG4gICAgfSk7XG4gICAgLy8gSkdP44Gu44Os44Oz44OA44Oq44Oz44Kw44KS5a6M5LqG44GV44Gb44KL44Gf44KB44Grc2V0VGltZW91dOOBp+OCpOODmeODs+ODiOODq+ODvOODl+OCkumAsuOCgeOCi1xuICAgIHNldFRpbWVvdXQoYXN5bmMgZnVuY3Rpb24gKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgbm4ubG9hZCgpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBpZiAoZS5tZXNzYWdlID09PSAnTm8gYmFja2VuZCBpcyBhdmFpbGFibGUnKSB7XG4gICAgICAgICAgICAgICAgaWYgKC8oTWFjIE9TIFggMTBfMTN8KGlQYWR8aVBob25lfGlQb2QpOyBDUFUgT1MgMTEpLipTYWZhcmkvLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCkgJiYgIS9DaHJvbWUvLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCkpIHtcbiAgICAgICAgICAgICAgICAgICAgYWxlcnQoJ+aui+W/teOBquOBjOOCieOBiuS9v+OBhOOBruODluODqeOCpuOCtuOBp+OBr+WLleOBjeOBvuOBm+OCk+OAglNhZmFyaeOCkuOBiuS9v+OBhOOBp+OBmeOBreOAguOAjOmWi+eZuuOAjeODoeODi+ODpeODvOOBruOAjOWun+mok+eahOOBquapn+iDveOAjeOBp+OAjFdlYkdQVeOAjeOCkuacieWKueOBq+OBmeOCi+OBqOWLleOBj+OBi+OCguOBl+OCjOOBvuOBm+OCkycpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGFsZXJ0KCfmrovlv7XjgarjgYzjgonjgYrkvb/jgYTjga7jg5bjg6njgqbjgrbjgafjga/li5XjgY3jgb7jgZvjgpMnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY29uZGl0aW9uID0gYXdhaXQgbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlcywgcmVqKSB7XG4gICAgICAgICAgICBjb25zdCAkc3RhcnRNb2RhbCA9ICQoJyNzdGFydC1tb2RhbCcpO1xuICAgICAgICAgICAgJHN0YXJ0TW9kYWwubW9kYWwoJ3Nob3cnKTtcbiAgICAgICAgICAgICRzdGFydE1vZGFsLm9uZSgnaGlkZGVuLmJzLm1vZGFsJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkY29uZGl0aW9uRm9ybSA9ICQoJyNjb25kaXRpb24tZm9ybScpO1xuICAgICAgICAgICAgICAgIHJlcyh7XG4gICAgICAgICAgICAgICAgICAgIGNvbG9yOiAkY29uZGl0aW9uRm9ybVswXVsnY29sb3InXS52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgdGltZVJ1bGU6ICRjb25kaXRpb25Gb3JtWzBdWyd0aW1lJ10udmFsdWUsXG4gICAgICAgICAgICAgICAgICAgIHRpbWU6IHBhcnNlSW50KCRjb25kaXRpb25Gb3JtWzBdWydhaS1ieW95b21pJ10udmFsdWUpXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHN3aXRjaCAoY29uZGl0aW9uLnRpbWVSdWxlKSB7XG4gICAgICAgICAgICBjYXNlICdhaS10aW1lJzpcbiAgICAgICAgICAgICAgICBhd2FpdCBlbmdpbmUudGltZVNldHRpbmdzKDAsIGNvbmRpdGlvbi50aW1lKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2lnby1xdWVzdCc6XG4gICAgICAgICAgICAgICAgYXdhaXQgZW5naW5lLnRpbWVTZXR0aW5ncygzICogNjAgKyA1NSwgMSk7IC8vIDnot6/nm6Tjga/lubPlnYfmiYvmlbDjgYwxMTDmiYvjgonjgZfjgYTjga7jgafjgIE1NeOBruODleOCo+ODg+OCt+ODo+ODvOenkuOCkui/veWKoFxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGJvYXJkLnNldE93bkNvbG9yKGNvbmRpdGlvbi5jb2xvciA9PT0gJ1cnID8gSkdPLldISVRFIDogSkdPLkJMQUNLKTtcbiAgICAgICAgY29uc3QgY29udHJvbGxlciA9IG5ldyBQbGF5Q29udHJvbGxlcihlbmdpbmUsIGJvYXJkKTtcbiAgICAgICAgY29udHJvbGxlci5zZXRJc1NlbGZQbGF5KGNvbmRpdGlvbi5jb2xvciA9PT0gJ3NlbGYtcGxheScpO1xuICAgICAgICBib2FyZC5hZGRPYnNlcnZlcihjb250cm9sbGVyKTtcbiAgICAgICAgJCgnI3Bhc3MnKS5vbignY2xpY2snLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIGNvbnRyb2xsZXIucGFzcygpO1xuICAgICAgICB9KTtcbiAgICAgICAgJCgnI3Jlc2lnbicpLm9uKCdjbGljaycsIGFzeW5jIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgYXdhaXQgZW5naW5lLnN0b3BQb25kZXIoKTtcbiAgICAgICAgICAgICQoZG9jdW1lbnQuYm9keSkuYWRkQ2xhc3MoJ2VuZCcpO1xuICAgICAgICB9KTtcbiAgICAgICAgJCgnI3JldHJ5Jykub25lKCdjbGljaycsIGFzeW5jIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgJCgnI3Bhc3MnKS5vZmYoJ2NsaWNrJyk7XG4gICAgICAgICAgICAkKCcjcmVzaWduJykub2ZmKCdjbGljaycpO1xuICAgICAgICAgICAgYm9hcmQuZGVzdHJveSgpO1xuICAgICAgICAgICAgZW5naW5lLmNsZWFyKCk7XG4gICAgICAgICAgICAkKGRvY3VtZW50LmJvZHkpLnJlbW92ZUNsYXNzKCdlbmQnKTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQobWFpbiwgMCk7XG4gICAgICAgIH0pO1xuICAgIH0sIDApO1xufVxuXG5jb25zdCB3b3JrZXIgPSBuZXcgV29ya2VyKCdqcy93b3JrZXIuanMnKTtcbmNvbnN0IG5uID0gbmV3IF9uZXVyYWxfbmV0d29yay5OZXVyYWxOZXR3b3JrKHdvcmtlcik7XG5jb25zdCBlbmdpbmUgPSBuZXcgQTlFbmdpbmUobm4sIHdvcmtlcik7XG5tYWluKCk7IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG4vKiBnbG9iYWwgV2ViRE5OIGFkZFByb2NlZHVyZUxpc3RlbmVyICovXG5cbmlmICghQXJyYXlCdWZmZXIucHJvdG90eXBlLnNsaWNlKSB7XG4gICAgQXJyYXlCdWZmZXIucHJvdG90eXBlLnNsaWNlID0gZnVuY3Rpb24gKHN0YXJ0LCBlbmQpIHtcbiAgICAgICAgdmFyIHRoYXQgPSBuZXcgVWludDhBcnJheSh0aGlzKTtcbiAgICAgICAgaWYgKGVuZCA9PSB1bmRlZmluZWQpIGVuZCA9IHRoYXQubGVuZ3RoO1xuICAgICAgICB2YXIgcmVzdWx0ID0gbmV3IEFycmF5QnVmZmVyKGVuZCAtIHN0YXJ0KTtcbiAgICAgICAgdmFyIHJlc3VsdEFycmF5ID0gbmV3IFVpbnQ4QXJyYXkocmVzdWx0KTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCByZXN1bHRBcnJheS5sZW5ndGg7IGkrKykgcmVzdWx0QXJyYXlbaV0gPSB0aGF0W2kgKyBzdGFydF07XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbn1cblxuY2xhc3MgTmV1cmFsTmV0d29yayB7XG4gICAgY29uc3RydWN0b3Iod29ya2VyKSB7XG4gICAgICAgIHRoaXMubm4gPSBudWxsO1xuICAgICAgICBhZGRQcm9jZWR1cmVMaXN0ZW5lcih3b3JrZXIsIHRoaXMpO1xuICAgIH1cblxuICAgIGFzeW5jIGxvYWQoKSB7XG4gICAgICAgIGlmICh0aGlzLm5uKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5ubiA9IGF3YWl0IFdlYkROTi5sb2FkKCcuL291dHB1dCcsIHsgYmFja2VuZE9yZGVyOiBbJ3dlYmdwdScsICd3ZWJnbCddIH0pO1xuICAgIH1cblxuICAgIGFzeW5jIGV2YWx1YXRlKGZlYXR1cmUpIHtcbiAgICAgICAgY29uc3Qgdmlld3MgPSB0aGlzLm5uLmdldElucHV0Vmlld3MoKTtcbiAgICAgICAgdmlld3NbMF0uc2V0KGZlYXR1cmUpO1xuICAgICAgICBhd2FpdCB0aGlzLm5uLnJ1bigpO1xuICAgICAgICBjb25zdCByZXN1bHQgPSB0aGlzLm5uLmdldE91dHB1dFZpZXdzKCkubWFwKGUgPT4gZS50b0FjdHVhbCgpKTtcbiAgICAgICAgcmVzdWx0LnB1c2god2luZG93LlBPTkRFUl9TVE9QKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG59XG5leHBvcnRzLk5ldXJhbE5ldHdvcmsgPSBOZXVyYWxOZXR3b3JrOyJdfQ==
