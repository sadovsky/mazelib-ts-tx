import { Grid } from "../grid.js";
import { pyRandom } from "../random/index.js";
import { MazeGenAlgo } from "./MazeGenAlgo.js";

export interface CellularAutomatonOptions {
  /** Wall length; values <= 1 are scaled by `h + w` (default 1.0). */
  complexity?: number;
  /** Number of walls; values <= 1 are scaled by `h * w` (default 1.0). */
  density?: number;
}

/**
 * The Cellular Automaton algorithm: grow random walls from the border and
 * from random points. Cells survive with one to four neighbours; a cell with
 * exactly three neighbours is born.
 */
export class CellularAutomaton extends MazeGenAlgo {
  complexity: number;
  density: number;

  constructor(h: number, w: number, options: CellularAutomatonOptions = {}) {
    super(h, w);
    this.complexity = options.complexity ?? 1.0;
    this.density = options.density ?? 1.0;
  }

  generate(): Grid {
    const H = this.H;
    const W = this.W;
    const grid = Grid.filled(H, W, 0);
    for (let c = 0; c < W; c++) {
      grid.set(0, c, 1);
      grid.set(H - 1, c, 1);
    }
    for (let r = 0; r < H; r++) {
      grid.set(r, 0, 1);
      grid.set(r, W - 1, 1);
    }

    // adjust complexity and density relative to maze size (sticks across calls, like the original)
    if (this.complexity <= 1.0) this.complexity = this.complexity * (this.h + this.w);
    if (this.density <= 1.0) this.density = this.density * (this.h * this.w);

    const walls = Math.trunc(2 * this.density);
    const steps = Math.trunc(this.complexity);
    for (let i = 0; i < walls; i++) {
      let x: number;
      let y: number;
      if (i < this.density) {
        // make sure many walls touch the outside of the maze
        if (pyRandom.choice([0, 1])) {
          y = pyRandom.choice([0, H - 1]);
          x = pyRandom.randrange(0, W, 2);
        } else {
          x = pyRandom.choice([0, W - 1]);
          y = pyRandom.randrange(0, H, 2);
        }
      } else {
        // fill in any voids left in the maze
        y = pyRandom.randrange(0, H, 2);
        x = pyRandom.randrange(0, W, 2);
      }

      // build a wall through the maze
      grid.set(y, x, 1);
      for (let j = 0; j < steps; j++) {
        let neighbors = this.findNeighbors(y, x, grid, true);
        if (neighbors.length > 0 && neighbors.length < 4) {
          neighbors = this.findNeighbors(y, x, grid, false);
          if (neighbors.length === 0) continue;
          const [r, c] = pyRandom.choice(neighbors);
          if (grid.get(r, c) === 0) {
            grid.set(r, c, 1);
            grid.set(r + Math.floor((y - r) / 2), c + Math.floor((x - c) / 2), 1);
            x = c;
            y = r;
          }
        }
      }
    }

    return grid;
  }
}
