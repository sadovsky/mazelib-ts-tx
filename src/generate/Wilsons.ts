import { type Cell, Grid } from "../grid.js";
import { pyRandom } from "../random/index.js";
import type { HuntOptions } from "./HuntAndKill.js";
import { MazeGenAlgo } from "./MazeGenAlgo.js";

const RANDOM = 1;
const SERPENTINE = 2;

/**
 * Wilson's algorithm (loop-erased random walks).
 *
 * 1. Add a random cell to the Uniform Spanning Tree (UST).
 * 2. From a cell not in the UST, random-walk until you hit a cell that is.
 * 3. Add the cells and walls of the (loop-erased) walk to the UST.
 * 4. Repeat 2 and 3 until all cells are in the UST.
 */
export class Wilsons extends MazeGenAlgo {
  private readonly huntOrder: number;

  constructor(h: number, w: number, options: HuntOptions = {}) {
    super(h, w);
    this.huntOrder = (options.huntOrder ?? "random").toLowerCase().trim() === "serpentine" ? SERPENTINE : RANDOM;
  }

  generate(): Grid {
    const grid = Grid.filled(this.H, this.W, 1);

    const r0 = pyRandom.randrange(1, this.H, 2);
    const c0 = pyRandom.randrange(1, this.W, 2);
    grid.set(r0, c0, 0);
    let numVisited = 1;
    let [row, col] = this.hunt(grid, numVisited);

    while (row !== -1 && col !== -1) {
      const walk = this.randomWalk(grid, [row, col]);
      numVisited += this.solveRandomWalk(grid, walk, [row, col]);
      [row, col] = this.hunt(grid, numVisited);
    }

    return grid;
  }

  private hunt(grid: Grid, count: number): Cell {
    if (this.huntOrder === SERPENTINE) return this.huntSerpentine(grid);
    if (count >= this.h * this.w) return [-1, -1];
    return [pyRandom.randrange(1, this.H, 2), pyRandom.randrange(1, this.W, 2)];
  }

  private huntSerpentine(grid: Grid): Cell {
    let row = 1;
    let col = -1;
    for (;;) {
      col += 2;
      if (col > this.W - 2) {
        row += 2;
        col = 1;
        if (row > this.H - 2) return [-1, -1];
      }
      if (grid.get(row, col) !== 0) return [row, col];
    }
  }

  /** Walk randomly until a visited cell is hit; remembers the last direction taken from each cell. */
  private randomWalk(grid: Grid, start: Cell): Map<string, Cell> {
    const walk = new Map<string, Cell>();
    let direction = this.randomDir(start);
    walk.set(`${start[0]},${start[1]}`, direction);
    let current: Cell = [start[0] + direction[0], start[1] + direction[1]];

    while (grid.get(current[0], current[1]) === 1) {
      direction = this.randomDir(current);
      walk.set(`${current[0]},${current[1]}`, direction);
      current = [current[0] + direction[0], current[1] + direction[1]];
    }

    return walk;
  }

  private randomDir([r, c]: Cell): Cell {
    const options: number[] = [];
    if (r > 1) options.push(0); // North
    if (r < this.H - 2) options.push(1); // South
    if (c > 1) options.push(2); // West
    if (c < this.W - 2) options.push(3); // East

    switch (pyRandom.choice(options)) {
      case 0:
        return [-2, 0];
      case 1:
        return [2, 0];
      case 2:
        return [0, -2];
      default:
        return [0, 2];
    }
  }

  /** Follow the walk from the start, visiting cells and opening walls; returns the number of cells added. */
  private solveRandomWalk(grid: Grid, walk: Map<string, Cell>, start: Cell): number {
    let visits = 0;
    let current = start;

    while (grid.get(current[0], current[1]) !== 0) {
      grid.set(current[0], current[1], 0);
      const d = walk.get(`${current[0]},${current[1]}`)!;
      const next: Cell = [current[0] + d[0], current[1] + d[1]];
      grid.set((next[0] + current[0]) >> 1, (next[1] + current[1]) >> 1, 0);
      visits += 1;
      current = next;
    }

    return visits;
  }
}
