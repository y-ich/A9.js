import { BSIZE, EBSIZE, BVCNT, PASS } from './constants.js';

export const X_LABELS = '@ABCDEFGHJKLMNOPQRST';

export function move2xy(s) {
    const OFFSET = 'a'.charCodeAt(0) - 1;
    return [s.charCodeAt(0) - OFFSET, BSIZE + 1 - (s.charCodeAt(1) - OFFSET)];
}

export function ev2xy(ev) {
    return [ev % EBSIZE, Math.floor(ev / EBSIZE)];
}

export function xy2ev(x, y) {
    return y * EBSIZE + x;
}

export function rv2ev(rv) {
    return rv === BVCNT ? PASS : rv % BSIZE + 1 + Math.floor(rv / BSIZE + 1) * EBSIZE;
}

export function ev2rv(ev) {
    return ev === PASS ? BVCNT : ev % EBSIZE - 1 + Math.floor(ev / EBSIZE - 1) * BSIZE;
}

export function ev2str(ev) {
    if (ev >= PASS) {
        return 'pass';
    } else {
        const [x, y] = ev2xy(ev);
        return X_LABELS.charAt(x) + y.toString();
    }
}

export function str2ev(v) {
    const vStr = v.toUpperCase();
    if (vStr === 'PASS' || vStr === 'RESIGN') {
        return PASS;
    } else {
        const x = X_LABELS.indexOf(vStr.charAt(0));
        const y = parseInt(vStr.slice(1));
        return xy2ev(x, y);
    }
}
