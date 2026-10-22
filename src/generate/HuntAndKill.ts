import { type Cell, Grid } from "../grid.js";
import { pyRandom } from "../random/index.js";
import { MazeGenAlgo } from "./MazeGenAlgo.js";

const RANDOM = 1;
const SERPENTINE = 2;

export interface HuntOptions {
  /** How to pick the next cell to walk from: `"random"` (default) or `"serpentine"`. */
  huntOrder?: string;
}

/**
 * The Hunt-and-Kill algorithm.
 *
 * 1. Randomly choose a starting cell.
 * 2. Random-walk from the current cell, carving passages to unvisited
 *    neighbors, until the current cell has none.
 * 3. Select a new cell; if it has been visited, walk from it.
 * 4. Repeat 2 and 3 until (very probably, for random hunting) every cell is visited.
 */
export class HuntAndKill extends MazeGenAlgo {
  private readonly huntOrder: number;

  constructor(h: number, w: number, options: HuntOptions = {}) {
    super(h, w);
    this.huntOrder = (options.huntOrder ?? "random").toLowerCase().trim() === "serpentine" ? SERPENTINE : RANDOM;
  }

  generate(): Grid {
    const grid = Grid.filled(this.H, this.W, 1);

    let [row, col] = [pyRandom.randrange(1, this.H, 2), pyRandom.randrange(1, this.W, 2)];
    grid.set(row, col, 0);

    let numTrials = 0;
    while (!(row === -1 && col === -1)) {
      this.walk(grid, row, col);
      [row, col] = this.hunt(grid, numTrials);
      numTrials += 1;
    }

    return grid;
  }

  private walk(grid: Grid, row: number, col: number): void {
    if (grid.get(row, col) !== 0) return;
    let r = row;
    let c = col;
    let unvisited = this.findNeighbors(r, c, grid, true);
    while (unvisited.length > 0) {
      const n = pyRandom.choice(unvisited);
      grid.set(n[0], n[1], 0);
      grid.set((n[0] + r) >> 1, (n[1] + c) >> 1, 0);
      [r, c] = n;
      unvisited = this.findNeighbors(r, c, grid, true);
    }
  }

  private hunt(grid: Grid, count: number): Cell {
    if (this.huntOrder === SERPENTINE) return this.huntSerpentine(grid);
    if (count >= this.H * this.W) return [-1, -1];
    return [pyRandom.randrange(1, this.H, 2), pyRandom.randrange(1, this.W, 2)];
  }

  private huntSerpentine(grid: Grid): Cell {
    let row = 1;
    let col = 1;
    for (;;) {
      col += 2;
      if (col > this.W - 2) {
        row += 2;
        col = 1;
        if (row > this.H - 2) return [-1, -1];
      }
      if (grid.get(row, col) === 0 && this.findNeighbors(row, col, grid, true).length > 0) return [row, col];
    }
  }
}
