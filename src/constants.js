/// コミです。
export const KOMI = 7.0;

/// 碁盤のサイズです。
export const BSIZE = 9;

/// 外枠を持つ拡張碁盤のサイズです。
export const EBSIZE = BSIZE + 2;

/// 碁盤の交点の数です。
export const BVCNT = BSIZE * BSIZE;

/// 拡張碁盤の交点の数です。
export const EBVCNT = EBSIZE * EBSIZE;

/// パスを表す線形座標です。通常の着手は拡張碁盤の線形座標で表します。
// TODO - 着手のために列挙型を作ったほうが関数のシグニチャは読みやすい。
export const PASS = EBVCNT;

/// 線形座標のプレースホルダーの未使用を示す値です。
// TODO - 該当する場所にOption<usize>を使ったほうが関数のシグニチャは読みやすい。
export const VNULL = EBVCNT + 1;

/// NNへの入力に関する履歴の深さです。
export const KEEP_PREV_CNT = 2;

/// NNへの入力フィーチャーの数です。
export const FEATURE_CNT = KEEP_PREV_CNT * 2 + 3; // 7
