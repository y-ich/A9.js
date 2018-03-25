export const WHITE = 0;
export const BLACK = 1;

export function opponentOf(color) {
    switch (color) {
        case WHITE: return BLACK;
        case BLACK: return WHITE;
    }
}

export const EMPTY = 2;
export const EXTERIOR = 3;
