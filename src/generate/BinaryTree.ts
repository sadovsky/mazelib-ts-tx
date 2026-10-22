import { type Cell, Grid } from "../grid.js";
import { pyRandom } from "../random/index.js";
import { MazeGenAlgo } from "./MazeGenAlgo.js";

export type BinaryTreeSkew = "NW" | "NE" | "SW" | "SE";

const SKEWS: Record<BinaryTreeSkew, Cell[]> = {
  NW: [[1, 0], [0, -1]],
  NE: [[1, 0], [0, 1]],
  SW: [[-1, 0], [0, -1]],
  SE: [[-1, 0], [0, 1]],
};

export interface BinaryTreeOptions {
  /** Which two directions to carve; a random one is drawn if missing or unknown. */
  skew?: string | null;
}

/** The Binary Tree algorithm: for every cell, knock down a wall in one of two fixed directions. */
export class BinaryTree extends MazeGenAlgo {
  readonly skew: Cell[];

  constructor(h: number, w: number, options: BinaryTreeOptions = {}) {
    super(h, w);
    const { skew } = options;
    if (typeof skew === "string" && Object.hasOwn(SKEWS, skew)) {
      this.skew = SKEWS[skew as BinaryTreeSkew];
    } else {
      this.skew = SKEWS[pyRandom.choice(Object.keys(SKEWS) as BinaryTreeSkew[])];
    }
  }

  generate(): Grid {
    const grid = Grid.filled(this.H, this.W, 1);

    for (let row = 1; row < this.H; row += 2) {
      for (let col = 1; col < this.W; col += 2) {
        grid.set(row, col, 0);
        const [nrow, ncol] = this.findNeighbor(row, col);
        grid.set(nrow, ncol, 0);
      }
    }

    return grid;
  }

  /** A random wall square next to the cell, in the skewed directions (or the cell itself). */
  private findNeighbor(row: number, col: number): Cell {
    const neighbors: Cell[] = [];
    for (const [br, bc] of this.skew) {
      const nr = row + br;
      const nc = col + bc;
      if (nr > 0 && nr < this.H - 1 && nc > 0 && nc < this.W - 1) neighbors.push([nr, nc]);
    }
    return neighbors.length === 0 ? [row, col] : pyRandom.choice(neighbors);
  }
}
