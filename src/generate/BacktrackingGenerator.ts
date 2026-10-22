import { type Cell, Grid } from "../grid.js";
import { pyRandom } from "../random/index.js";
import { MazeGenAlgo } from "./MazeGenAlgo.js";

/**
 * The recursive-backtracking algorithm.
 *
 * 1. Randomly choose a starting cell.
 * 2. Open a passage to a random unvisited neighbor; it becomes the current cell.
 * 3. If all neighbors have been visited, back up to the previous cell.
 * 4. Stop when the algorithm has backed all the way up to the starting cell.
 */
export class BacktrackingGenerator extends MazeGenAlgo {
  generate(): Grid {
    const grid = Grid.filled(this.H, this.W, 1);

    const crow = pyRandom.randrange(1, this.H, 2);
    const ccol = pyRandom.randrange(1, this.W, 2);
    const track: Cell[] = [[crow, ccol]];
    grid.set(crow, ccol, 0);

    while (track.length > 0) {
      const [r, c] = track[track.length - 1];
      const neighbors = this.findNeighbors(r, c, grid, true);

      if (neighbors.length === 0) {
        track.pop();
      } else {
        const [nrow, ncol] = neighbors[0];
        grid.set(nrow, ncol, 0);
        grid.set((nrow + r) >> 1, (ncol + c) >> 1, 0);
        track.push([nrow, ncol]);
      }
    }

    return grid;
  }
}
