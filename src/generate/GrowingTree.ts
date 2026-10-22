import { type Cell, Grid, cellEq } from "../grid.js";
import { pyRandom } from "../random/index.js";
import { MazeGenAlgo } from "./MazeGenAlgo.js";

export interface GrowingTreeOptions {
  /** Chance of continuing from the newest cell (backtracking) rather than a random one (Prim's). Default 1.0. */
  backtrackChance?: number;
}

/**
 * The Growing Tree algorithm.
 *
 * 1. Let C be a list of cells, initially one random cell.
 * 2. Choose a cell from C and carve a passage to any unvisited neighbor,
 *    adding that neighbor to C. If there are none, remove the cell from C.
 * 3. Repeat step 2 until C is empty.
 */
export class GrowingTree extends MazeGenAlgo {
  readonly backtrackChance: number;

  constructor(h: number, w: number, options: GrowingTreeOptions = {}) {
    super(h, w);
    this.backtrackChance = options.backtrackChance ?? 1.0;
  }

  generate(): Grid {
    const grid = Grid.filled(this.H, this.W, 1);

    let current: Cell = [pyRandom.randrange(1, this.H, 2), pyRandom.randrange(1, this.W, 2)];
    grid.set(current[0], current[1], 0);
    let active: Cell[] = [current];

    while (active.length > 0) {
      if (pyRandom.random() < this.backtrackChance) current = active[active.length - 1];
      else current = pyRandom.choice(active);

      const next = this.findNeighbors(current[0], current[1], grid, true);
      if (next.length === 0) {
        const done = current;
        active = active.filter((a) => !cellEq(a, done));
        continue;
      }

      const [nr, nc] = pyRandom.choice(next);
      active.push([nr, nc]);
      grid.set(nr, nc, 0);
      grid.set((current[0] + nr) >> 1, (current[1] + nc) >> 1, 0);
    }

    return grid;
  }
}
