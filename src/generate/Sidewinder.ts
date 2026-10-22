import { type Cell, Grid } from "../grid.js";
import { pyRandom } from "../random/index.js";
import { MazeGenAlgo } from "./MazeGenAlgo.js";

export interface SidewinderOptions {
  /** Below 0.5 skews the maze East-West, above 0.5 North-South (default 0.5). */
  skew?: number;
}

/**
 * The Sidewinder algorithm: work row by row, carving East at random; when not
 * carving East, carve North from a random cell of the current run.
 */
export class Sidewinder extends MazeGenAlgo {
  readonly skew: number;

  constructor(h: number, w: number, options: SidewinderOptions = {}) {
    super(h, w);
    this.skew = options.skew ?? 0.5;
  }

  generate(): Grid {
    const grid = Grid.filled(this.H, this.W, 1);

    // the first row is always open, because you can't carve North
    for (let col = 1; col < this.W - 1; col++) grid.set(1, col, 0);

    for (let row = 3; row < this.H; row += 2) {
      let run: Cell[] = [];
      for (let col = 1; col < this.W; col += 2) {
        grid.set(row, col, 0);
        run.push([row, col]);

        const carveEast = pyRandom.random() > this.skew;
        // carve East or North (can't carve East into the East wall)
        if (carveEast && col < this.W - 2) {
          grid.set(row, col + 1, 0);
        } else {
          const north = pyRandom.choice(run);
          grid.set(north[0] - 1, north[1], 0);
          run = [];
        }
      }
    }

    return grid;
  }
}
