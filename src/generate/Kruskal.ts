import { type Cell, Grid, cellIn } from "../grid.js";
import { npRandom } from "../random/index.js";
import { MazeGenAlgo } from "./MazeGenAlgo.js";

/** Kruskal's algorithm: knock down walls in a random (NumPy-shuffled) order when they join two trees. */
export class Kruskal extends MazeGenAlgo {
  generate(): Grid {
    const grid = Grid.filled(this.H, this.W, 1);

    let forest: Cell[][] = [];
    for (let row = 1; row < this.H - 1; row += 2) {
      for (let col = 1; col < this.W - 1; col += 2) {
        forest.push([[row, col]]);
        grid.set(row, col, 0);
      }
    }

    const edges: Cell[] = [];
    for (let row = 2; row < this.H - 1; row += 2) {
      for (let col = 1; col < this.W - 1; col += 2) edges.push([row, col]);
    }
    for (let row = 1; row < this.H - 1; row += 2) {
      for (let col = 2; col < this.W - 1; col += 2) edges.push([row, col]);
    }

    npRandom.shuffle(edges);

    // the original sums the indices of the trees containing a cell (exactly one does)
    const treeOf = (cell: Cell): number => {
      let sum = 0;
      forest.forEach((tree, i) => {
        if (cellIn(cell, tree)) sum += i;
      });
      return sum;
    };

    let e = 0;
    while (forest.length > 1) {
      const [row, col] = edges[e++];
      let tree1: number;
      let tree2: number;
      if (row % 2 === 0) {
        // even-numbered row: vertical wall
        tree1 = treeOf([row - 1, col]);
        tree2 = treeOf([row + 1, col]);
      } else {
        // odd-numbered row: horizontal wall
        tree1 = treeOf([row, col - 1]);
        tree2 = treeOf([row, col + 1]);
      }

      if (tree1 !== tree2) {
        const newTree = forest[tree1].concat(forest[tree2]);
        forest = forest.filter((_, i) => i !== tree1 && i !== tree2);
        forest.push(newTree);
        grid.set(row, col, 0);
      }
    }

    return grid;
  }
}
