import { Grid } from "../grid.js";
import { pyRandom } from "../random/index.js";
import { MazeGenAlgo } from "./MazeGenAlgo.js";

export interface EllersOptions {
  /** Chance of merging horizontally, clamped to [0, 1] (default 0.5). */
  xskew?: number;
  /** Chance of extra vertical connections, clamped to [0, 1] (default 0.5). */
  yskew?: number;
}

function clamp01(x: number): number {
  return x < 0.0 ? 0.0 : x > 1.0 ? 1.0 : x;
}

/**
 * Eller's algorithm, one row at a time.
 *
 * 1. Put the cells of the first row each in their own set.
 * 2. Join adjacent cells, but not if they are already in the same set.
 * 3. For each set in the row, create at least one vertical connection down.
 * 4. Put any unconnected cells in the next row into their own set.
 * 5. Repeat until the last row, where all adjacent cells in different sets are joined.
 *
 * Set ids are 32-bit here. The original stores them as int8 and raises
 * OverflowError once a maze needs more than 127 of them (a known bug); this
 * port returns the maze instead.
 */
export class Ellers extends MazeGenAlgo {
  readonly xskew: number;
  readonly yskew: number;

  constructor(h: number, w: number, options: EllersOptions = {}) {
    super(h, w);
    this.xskew = clamp01(options.xskew ?? 0.5);
    this.yskew = clamp01(options.yskew ?? 0.5);
  }

  generate(): Grid {
    const sets = new Int32Array(this.H * this.W).fill(-1);
    let maxSetNumber = 0;

    // process all but the last row
    for (let r = 1; r < this.H - 1; r += 2) {
      maxSetNumber = this.initRow(sets, r, maxSetNumber);
      this.mergeOneRow(sets, r);
      this.mergeDownARow(sets, r);
    }

    // process last row
    this.initRow(sets, this.H - 2, maxSetNumber);
    this.processLastRow(sets);

    // translate grid cell sets into a maze
    const grid = Grid.filled(this.H, this.W, 0);
    for (let i = 0; i < sets.length; i++) if (sets[i] === -1) grid.data[i] = 1;
    return grid;
  }

  private initRow(sets: Int32Array, row: number, maxSetNumber: number): number {
    for (let c = 1; c < this.W; c += 2) {
      if (sets[row * this.W + c] < 0) {
        sets[row * this.W + c] = maxSetNumber;
        maxSetNumber += 1;
      }
    }
    return maxSetNumber;
  }

  /** Randomly merge adjacent cells within a row. */
  private mergeOneRow(sets: Int32Array, r: number): void {
    const W = this.W;
    for (let c = 1; c < W - 2; c += 2) {
      if (pyRandom.random() < this.xskew) {
        if (sets[r * W + c] !== sets[r * W + c + 2]) {
          sets[r * W + c + 1] = sets[r * W + c];
          this.mergeSets(sets, sets[r * W + c + 2], sets[r * W + c], r);
        }
      }
    }
  }

  /** Cut down at least one passage for each set in the row. */
  private mergeDownARow(sets: Int32Array, startRow: number): void {
    const W = this.W;
    if (startRow === this.H - 2) return;

    // which columns of the row belong to each set (in first-seen order)
    const setCounts = new Map<number, number[]>();
    for (let c = 1; c < W; c += 2) {
      const s = sets[startRow * W + c];
      const cols = setCounts.get(s);
      if (cols) cols.push(c);
      else setCounts.set(s, [c]);
    }

    // merge down randomly, but at least once per set
    for (const [s, cols] of setCounts) {
      const c = pyRandom.choice(cols);
      sets[(startRow + 1) * W + c] = s;
      sets[(startRow + 2) * W + c] = s;
    }

    for (let c = 1; c < W - 2; c += 2) {
      if (pyRandom.random() < this.yskew) {
        const s = sets[startRow * W + c];
        if (sets[(startRow + 1) * W + c] === -1) {
          sets[(startRow + 1) * W + c] = s;
          sets[(startRow + 2) * W + c] = s;
        }
      }
    }
  }

  /** Relabel `fromSet` as `toSet`, searching rows 1..maxRow. */
  private mergeSets(sets: Int32Array, fromSet: number, toSet: number, maxRow = -1): void {
    const W = this.W;
    if (maxRow < 0) maxRow = this.H - 1;
    for (let r = 1; r < maxRow + 1; r++) {
      for (let c = 1; c < W - 1; c++) {
        if (sets[r * W + c] === fromSet) sets[r * W + c] = toSet;
      }
    }
  }

  /** In the last row, join all adjacent cells that do not share a set. */
  private processLastRow(sets: Int32Array): void {
    const W = this.W;
    const r = this.H - 2;
    for (let c = 1; c < W - 2; c += 2) {
      if (sets[r * W + c] !== sets[r * W + c + 2]) {
        sets[r * W + c + 1] = sets[r * W + c];
        this.mergeSets(sets, sets[r * W + c + 2], sets[r * W + c]);
      }
    }
  }
}
