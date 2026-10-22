import type { Cell, Grid } from "../grid.js";
import { npRandom } from "../random/index.js";

/** Base class for maze transmuters, which modify a maze grid in place. */
export abstract class MazeTransmuteAlgo {
  protected grid!: Grid;
  protected start: Cell | null = null;
  protected end: Cell | null = null;

  /** Transmute `grid` in place. */
  transmute(grid: Grid, start: Cell | null, end: Cell | null): void {
    this.grid = grid;
    this.start = start;
    this.end = end;
    this.transmuteImpl();
  }

  protected abstract transmuteImpl(): void;

  /** Open cells reachable in one move, in random (NumPy-shuffled) order. */
  protected findUnblockedNeighbors([r, c]: Cell): Cell[] {
    const g = this.grid;
    const ns: Cell[] = [];
    if (r > 1 && !g.get(r - 1, c) && !g.get(r - 2, c)) ns.push([r - 2, c]);
    if (r < g.height - 2 && !g.get(r + 1, c) && !g.get(r + 2, c)) ns.push([r + 2, c]);
    if (c > 1 && !g.get(r, c - 1) && !g.get(r, c - 2)) ns.push([r, c - 2]);
    if (c < g.width - 2 && !g.get(r, c + 1) && !g.get(r, c + 2)) ns.push([r, c + 2]);
    npRandom.shuffle(ns);
    return ns;
  }

  /** Cells two squares away that are walls (or open), ignoring what's in between, NumPy-shuffled. */
  protected findNeighbors(r: number, c: number, isWall = false): Cell[] {
    const g = this.grid;
    const want = isWall ? 1 : 0;
    const ns: Cell[] = [];
    if (r > 1 && g.get(r - 2, c) === want) ns.push([r - 2, c]);
    if (r < g.height - 2 && g.get(r + 2, c) === want) ns.push([r + 2, c]);
    if (c > 1 && g.get(r, c - 2) === want) ns.push([r, c - 2]);
    if (c < g.width - 2 && g.get(r, c + 2) === want) ns.push([r, c + 2]);
    npRandom.shuffle(ns);
    return ns;
  }

  protected withinOne(cell: Cell | null | undefined, desire: Cell | null | undefined): boolean {
    if (!cell || !desire) return false;
    if (cell[0] === desire[0]) return Math.abs(cell[1] - desire[1]) < 2;
    if (cell[1] === desire[1]) return Math.abs(cell[0] - desire[0]) < 2;
    return false;
  }
}
