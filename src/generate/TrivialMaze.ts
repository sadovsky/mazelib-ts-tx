import { type Cell, Grid, cellIn, midpoint } from "../grid.js";
import { pyRandom } from "../random/index.js";
import { MazeGenAlgo } from "./MazeGenAlgo.js";

const SERPENTINE = 1;
const SPIRAL = 2;

export interface TrivialMazeOptions {
  /** `"spiral"` (default) or `"serpentine"`. */
  mazeType?: string;
}

/** Simple unicursal mazes (no dead ends): a serpentine or a spiral. */
export class TrivialMaze extends MazeGenAlgo {
  private readonly mazeType: number;

  constructor(h: number, w: number, options: TrivialMazeOptions = {}) {
    const mazeType = (options.mazeType ?? "spiral").toLowerCase().trim() === "serpentine" ? SERPENTINE : SPIRAL;
    super(h, w);
    this.mazeType = mazeType;
  }

  generate(): Grid {
    const grid = Grid.filled(this.H, this.W, 1);
    return this.mazeType === SERPENTINE ? this.serpentine(grid) : this.spiral(grid);
  }

  private serpentine(grid: Grid): Grid {
    const verticalSkew = pyRandom.randint(0, 1);
    const height = grid.height;
    const width = grid.width;

    if (verticalSkew) {
      for (let row = 1; row < height - 1; row++) {
        for (let col = 1; col < width - 1; col += 2) grid.set(row, col, 0);
      }
      // add minor passages
      for (let col = 2; col < width - 1; col += 4) grid.set(1, col, 0);
      for (let col = 4; col < width - 1; col += 4) grid.set(height - 2, col, 0);
    } else {
      for (let row = 1; row < height - 1; row += 2) {
        for (let col = 1; col < width - 1; col++) grid.set(row, col, 0);
      }
      for (let row = 2; row < height - 1; row += 4) grid.set(row, 1, 0);
      for (let row = 4; row < height - 1; row += 4) grid.set(row, width - 2, 0);
    }

    return grid;
  }

  private spiral(grid: Grid): Grid {
    const clockwise = pyRandom.randint(0, 1);
    const directions: Cell[] =
      clockwise === 1
        ? [[0, -2], [2, 0], [0, 2], [-2, 0]]
        : [[-2, 0], [0, 2], [2, 0], [0, -2]];

    let current: Cell = [1, 1];
    grid.set(1, 1, 0);
    let nextDir = 0;
    for (;;) {
      const next: Cell = [current[0] + directions[nextDir][0], current[1] + directions[nextDir][1]];
      const ns = this.findNeighbors(current[0], current[1], grid, true);
      if (cellIn(next, ns)) {
        const mid = midpoint(current, next);
        grid.set(mid[0], mid[1], 0);
        grid.set(next[0], next[1], 0);
        current = next;
      } else if (ns.length === 0) {
        break;
      } else {
        nextDir = (nextDir + 1) % 4;
      }
    }

    return grid;
  }
}
