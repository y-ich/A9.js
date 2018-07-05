// import jssgf from './jssgf.js';

const JGO = window.JGO;
const FIELD_MAP = {
    'handicap': 'HA',
    'annotator': 'AN',
    'copyright': 'CP',
    'date': 'DT',
    'event': 'EV',
    'gameName': 'GN',
    'overtime': 'OT',
    'round': 'RO',
    'result': 'RE',
    'rules': 'RU',
    'source': 'SO',
    'time': 'TM',
    'location': 'PC',
    'black': 'PB',
    'white': 'PW',
    'blackRank': 'BR',
    'whiteRank': 'WR',
    'blackTeam': 'BT',
    'whiteTeam': 'WT',
    'komi': 'KM',
    'comment': 'C',
    'gameComment': 'GC',
    'play': 'PL',
    'appName': 'AP'
};


function coord2point(str) {
    const offset = 'a'.charCodeAt(0);
    return [str.charCodeAt(0) - offset, str.charCodeAt(1) - offset];
}

/** info objectをSGF文字列にします
 * @param info ノードのinfoプロパティ
 */
function info2sgf(info) {
    let result = '';
    for (let k in info) {
        const v = info[k];
        if (FIELD_MAP[k]) {
            result += `${FIELD_MAP[k]}[${v}]`;
        }
    }
    return result;
}

JGO.Node.prototype.isEmpty = function() {
    return Object.keys(this).filter(e => /^[A-Z]{2}$/.test(e)).length == 0;
}
/** 自身と子ノードのSGFを出力します */
JGO.Node.prototype.toSgf = function(recursive) {
    let result = ';';

    if (!this.parent) { // ルートノード
        result += 'FF[4]GM[1]';
        result += info2sgf(this.info);
        result += `SZ[${this.jboard.width}]`;
        const blacks = [];
        const whites = [];
        for (let change of this.changes) {
            switch (change.type) {
            case JGO.INTERSECTION.BLACK:
                blacks.push(change.c);
                break;
            case JGO.INTERSECTION.WHITE:
                whites.push(change.c);
                break;
            }
        }
        if (blacks.length > 0) {
            result += 'AB';
            for (let c of blacks) {
                result += `[${c.toString()}]`;
            }
        }
        if (whites.length > 0) {
            result += 'AW';
            for (let c of whites) {
                result += `[${c.toString()}]`;
            }
        }
    } else {
        let turn = null;
        for (let change of this.changes) {
            switch (change.type) {
            case JGO.INTERSECTION.BLACK:
                result += `B[${change.c.toString()}]`;
                turn = 'W';
                break;
            case JGO.INTERSECTION.WHITE:
                result += `W[${change.c.toString()}]`;
                turn = 'B';
                break;
            }
            /*
            if (change.mark) {
                result += `LB[${change.c.toString()}:${change.mark}]`;
            }
            */
        }
        result += info2sgf(this.info);
    }
    if (recursive) {
        switch (this.children.length) {
        case 0:
            break;
        case 1:
            result += this.children[0].toSgf(true);
            break;
        default:
            for (let child of this.children) {
                result += `(${child.toSgf(true)})`;
            }
        }
    }
    return result;
};

/** 自身のSGFを出力します
 * @param {string} ap アプリ名
 */
JGO.Record.prototype.toSgf = function(ap) {
    const node = this.getRootNode();
    if (ap)
        node.info.appName = ap;
    return `(${node.toSgf(true)})`;
};

/** 現局面までのSGFを出力します
 */
JGO.Record.prototype.toSgfUntilCurrent = function() {
    const current = this.getCurrentNode();
    let result = current.toSgf();
    let node = current.parent;
    while (node) {
        result = node.toSgf() + result;
        node = node.parent;
    }
    return `(${result})`;
}

/** 主進行で碁石が存在する部分領域を抽出します */
/*
JGO.getView = function(sgf) {
    const collection = jssgf.parse(sgf);
    const sz = collection[0].SZ || '19';
    let width, height;
    const match = sz.match(/([0-9]+):([0-9]+)/);
    if (match) {
        width = parseInt(match[1]);
        height = parseInt(match[2]);
    } else {
        width = height = parseInt(sz);
    }

    const xs = [];
    const ys = [];
    for (let e of (collection[0].AB || []).concat(collection[0].AW || [])) {
        const p = coord2point(e);
        xs.push(p[0]);
        ys.push(p[1]);
    }
    let node = collection[0];
    while (node._children.length > 0) {
        node = node._children[0];
        const c = node.B || node.W;
        if (c) {
            const p = coord2point(c);
            xs.push(p[0]);
            ys.push(p[1]);
        }
    }

    const xoffset = Math.max(0, Math.min.apply(null, xs) - 2);
    const yoffset = Math.max(0, Math.min.apply(null, ys) - 2);
    const xmax = Math.min(width - 1, Math.max.apply(null, xs) + 2);
    const ymax = Math.min(height - 1, Math.max.apply(null, ys) + 2);
    return {
        edge: {
            top: yoffset <= 0,
            bottom: ymax >= height - 1,
            left: xoffset <= 0,
            right: xmax >= width - 1
        },
        view: {
            xOffset: xoffset,
            yOffset: yoffset,
            width: (xmax - xoffset) + 1,
            height: (ymax - yoffset) + 1
        }
    };
};
*/

JGO.opponentOf = function(color) {
    switch (color) {
        case JGO.BLACK: return JGO.WHITE;
        case JGO.WHITE: return JGO.BLACK;
        default: throw new Error('illegal argument');
    }
}