import { type Cell, Grid } from "../src/index.js";

/** Algorithms should generate a maze with a solid boundary of walls. */
export function boundaryIsSolid(grid: Grid): boolean {
  const H = grid.height;
  const W = grid.width;
  // first row
  for (let c = 0; c < W; c++) if (grid.get(0, c) === 0) return false;
  // other rows
  for (let r = 1; r < H - 1; r++) {
    if (grid.get(r, 0) === 0 || grid.get(r, W - 1) === 0) return false;
  }
  // last row
  for (let c = 0; c < W; c++) if (grid.get(H - 1, c) === 0) return false;
  return true;
}

/** All of the (odd, odd) grid cells in a maze should be passages. */
export function allPassagesOpen(grid: Grid): boolean {
  for (let r = 1; r < grid.height; r += 2) {
    for (let c = 1; c < grid.width; c += 2) {
      if (grid.get(r, c) === 1) return false;
    }
  }
  return true;
}

/** All of the (even, even) grid cells in a maze should be walls. */
export function allCornersComplete(grid: Grid): boolean {
  for (let r = 2; r < grid.height; r += 2) {
    for (let c = 2; c < grid.width; c += 2) {
      if (grid.get(r, c) === 0) return false;
    }
  }
  return true;
}

/** Build a Grid from rows of 0/1 numbers (numpy array literal). */
export function gridFromArrays(rows: number[][]): Grid {
  const g = new Grid(rows.length, rows[0].length);
  rows.forEach((row, r) => row.forEach((v, c) => g.set(r, c, v)));
  return g;
}

export function cellsEqual(a: Cell, b: Cell): boolean {
  return a[0] === b[0] && a[1] === b[1];
}
