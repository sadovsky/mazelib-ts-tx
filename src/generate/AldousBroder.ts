import { Grid } from "../grid.js";
import { pyRandom } from "../random/index.js";
import { MazeGenAlgo } from "./MazeGenAlgo.js";

/**
 * The Aldous-Broder algorithm.
 *
 * 1. Choose a random cell.
 * 2. Choose a random neighbor of the current cell and visit it. If the neighbor
 *    has not yet been visited, add the traveled edge to the spanning tree.
 * 3. Repeat step 2 until all cells have been visited.
 */
export class AldousBroder extends MazeGenAlgo {
  generate(): Grid {
    const grid = Grid.filled(this.H, this.W, 1);

    let crow = pyRandom.randrange(1, this.H, 2);
    let ccol = pyRandom.randrange(1, this.W, 2);
    grid.set(crow, ccol, 0);
    let numVisited = 1;

    while (numVisited < this.h * this.w) {
      const neighbors = this.findNeighbors(crow, ccol, grid, true);

      // no unvisited neighbors: move to a random visited one
      if (neighbors.length === 0) {
        [crow, ccol] = pyRandom.choice(this.findNeighbors(crow, ccol, grid));
        continue;
      }

      for (const [nrow, ncol] of neighbors) {
        if (grid.get(nrow, ncol) > 0) {
          // open the wall to the new neighbor, and visit it
          grid.set((nrow + crow) >> 1, (ncol + ccol) >> 1, 0);
          grid.set(nrow, ncol, 0);
          numVisited += 1;
          crow = nrow;
          ccol = ncol;
          break;
        }
      }
    }

    return grid;
  }
}
