import { type Cell, Grid } from "../grid.js";
import { pyRandom } from "../random/index.js";
import { MazeGenAlgo } from "./MazeGenAlgo.js";

const VERTICAL = 0;
const HORIZONTAL = 1;

/**
 * The Recursive Division algorithm.
 *
 * 1. Start with an empty grid.
 * 2. Build a wall that bisects the grid, with a single passage through it.
 * 3. Repeat step 2 with the areas on either side of the wall, until the
 *    passages are the desired resolution.
 */
export class Division extends MazeGenAlgo {
  generate(): Grid {
    const grid = Grid.filled(this.H, this.W, 0);
    for (let c = 0; c < this.W; c++) {
      grid.set(0, c, 1);
      grid.set(this.H - 1, c, 1);
    }
    for (let r = 0; r < this.H; r++) {
      grid.set(r, 0, 1);
      grid.set(r, this.W - 1, 1);
    }

    const regionStack: [Cell, Cell][] = [[[1, 1], [this.H - 2, this.W - 2]]];

    while (regionStack.length > 0) {
      const [[minY, minX], [maxY, maxX]] = regionStack.pop()!;
      const height = maxY - minY + 1;
      const width = maxX - minX + 1;

      if (height <= 1 || width <= 1) continue;

      let cutDirection: number;
      if (width < height) {
        cutDirection = HORIZONTAL;
      } else if (width > height) {
        cutDirection = VERTICAL;
      } else {
        if (width === 2) continue;
        cutDirection = pyRandom.randrange(2);
      }

      // the cut can't be on the edge of the region
      const cutLength = [height, width][(cutDirection + 1) % 2];
      if (cutLength < 3) continue;
      const cutPosi = pyRandom.randrange(1, cutLength, 2);
      const doorPosi = pyRandom.randrange(0, [height, width][cutDirection], 2);

      if (cutDirection === VERTICAL) {
        for (let row = minY; row <= maxY; row++) grid.set(row, minX + cutPosi, 1);
        grid.set(minY + doorPosi, minX + cutPosi, 0);
        regionStack.push([[minY, minX], [maxY, minX + cutPosi - 1]]);
        regionStack.push([[minY, minX + cutPosi + 1], [maxY, maxX]]);
      } else {
        for (let col = minX; col <= maxX; col++) grid.set(minY + cutPosi, col, 1);
        grid.set(minY + cutPosi, minX + doorPosi, 0);
        regionStack.push([[minY, minX], [minY + cutPosi - 1, maxX]]);
        regionStack.push([[minY + cutPosi + 1, minX], [maxY, maxX]]);
      }
    }

    return grid;
  }
}
