import { pyAssert } from "../errors.js";
import type { Cell, Grid } from "../grid.js";
import { npRandom } from "../random/index.js";

/** Base class for maze generators. */
export abstract class MazeGenAlgo {
  /** Height in cells (hallways). */
  readonly h: number;
  /** Width in cells (hallways). */
  readonly w: number;
  /** Height in grid squares (cells + walls): `2h + 1`. */
  readonly H: number;
  /** Width in grid squares (cells + walls): `2w + 1`. */
  readonly W: number;

  constructor(h: number, w: number) {
    pyAssert(w >= 3 && h >= 3, "Mazes cannot be smaller than 3x3.");
    this.h = h;
    this.w = w;
    this.H = 2 * h + 1;
    this.W = 2 * w + 1;
  }

  /** Generate a new maze grid. */
  abstract generate(): Grid;

  /** Neighbor cells (two squares away) that are walls, or open, in random (NumPy-shuffled) order. */
  protected findNeighbors(r: number, c: number, grid: Grid, isWall = false): Cell[] {
    const want = isWall ? 1 : 0;
    const ns: Cell[] = [];
    if (r > 1 && grid.get(r - 2, c) === want) ns.push([r - 2, c]);
    if (r < this.H - 2 && grid.get(r + 2, c) === want) ns.push([r + 2, c]);
    if (c > 1 && grid.get(r, c - 2) === want) ns.push([r, c - 2]);
    if (c < this.W - 2 && grid.get(r, c + 2) === want) ns.push([r, c + 2]);
    npRandom.shuffle(ns);
    return ns;
  }
}
