import { type Cell, Grid } from "../grid.js";
import { PySet } from "../pyset.js";
import { pyRandom } from "../random/index.js";
import { MazeGenAlgo } from "./MazeGenAlgo.js";

/**
 * Prim's algorithm.
 *
 * 1. Choose an arbitrary cell and add it to the visited set V.
 * 2. Randomly select a frontier cell (a neighbor of V not in V).
 * 3. Connect it to a random visited neighbor and add it to V.
 * 4. Repeat until V includes every cell.
 *
 * The frontier is rebuilt with `list(set(...))` each step, so its order
 * follows CPython's set layout (see `PySet`).
 */
export class Prims extends MazeGenAlgo {
  generate(): Grid {
    const grid = Grid.filled(this.H, this.W, 1);

    let row = pyRandom.randrange(1, this.H, 2);
    let col = pyRandom.randrange(1, this.W, 2);
    grid.set(row, col, 0);

    let neighbors = this.findNeighbors(row, col, grid, true);
    let visited = 1;

    while (visited < this.h * this.w) {
      const nn = pyRandom.randrange(neighbors.length);
      [row, col] = neighbors[nn];
      visited += 1;
      grid.set(row, col, 0);
      neighbors = neighbors.slice(0, nn).concat(neighbors.slice(nn + 1));
      // connect it to a random visited neighbor
      const [n0, n1] = this.findNeighbors(row, col, grid)[0];
      grid.set((row + n0) >> 1, (col + n1) >> 1, 0);

      // add its unvisited neighbors to the frontier
      const unvisited = this.findNeighbors(row, col, grid, true);
      neighbors = PySet.from<Cell>(neighbors.concat(unvisited)).toList();
    }

    return grid;
  }
}
