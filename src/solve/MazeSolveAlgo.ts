import { pyAssert } from "../errors.js";
import { type Cell, type Grid, cellEq, cellIndex } from "../grid.js";
import { npRandom } from "../random/index.js";

/** A path through a maze: the cells strictly between start and end (after pruning). */
export type Solution = Cell[];

/** Base class for maze solvers. */
export abstract class MazeSolveAlgo {
  protected grid!: Grid;
  protected start!: Cell;
  protected end!: Cell;

  /** Solve a maze; the grid is copied, never modified. */
  solve(grid: Grid, start: Cell, end: Cell): Solution[] {
    this.solvePreprocessor(grid, start, end);
    return this.solveImpl();
  }

  private solvePreprocessor(grid: Grid, start: Cell, end: Cell): void {
    pyAssert(grid !== null && grid !== undefined, "Maze grid is not set.");
    this.grid = grid.copy();
    this.start = start;
    this.end = end;
    pyAssert(start != null && end != null, "Entrances are not set.");
    pyAssert(start[0] >= 0 && start[0] < grid.height, "Entrance is outside the grid.");
    pyAssert(start[1] >= 0 && start[1] < grid.width, "Entrance is outside the grid.");
    pyAssert(end[0] >= 0 && end[0] < grid.height, "Entrance is outside the grid.");
    pyAssert(end[1] >= 0 && end[1] < grid.width, "Entrance is outside the grid.");
  }

  protected abstract solveImpl(): Solution[];

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

  protected onEdge([r, c]: Cell): boolean {
    return r === 0 || r === this.grid.height - 1 || c === 0 || c === this.grid.width - 1;
  }

  /** The cell just inside an entrance on the edge. */
  protected pushEdge([r, c]: Cell): Cell {
    if (r === 0) return [1, c];
    if (r === this.grid.height - 1) return [r - 1, c];
    if (c === 0) return [r, 1];
    return [r, c - 1];
  }

  /** True if `cell` is within one move (or half move) of `desire`. */
  protected withinOne(cell: Cell | null | undefined, desire: Cell | null | undefined): boolean {
    if (!cell || !desire) return false;
    if (cell[0] === desire[0]) return Math.abs(cell[1] - desire[1]) < 2;
    if (cell[1] === desire[1]) return Math.abs(cell[0] - desire[0]) < 2;
    return false;
  }

  /** Remove the detours (anything between two visits of the same cell) and the entrances. */
  protected pruneSolution(solution: Solution): Solution {
    let found = true;
    let attempt = 0;
    const maxAttempt = solution.length;

    while (found && solution.length > 2 && attempt < maxAttempt) {
      found = false;
      attempt += 1;
      let firstI = 0;
      let lastI = 0;
      for (let i = 0; i < solution.length - 1; i++) {
        const j = cellIndex(solution[i], solution, i + 1);
        if (j >= 0) {
          firstI = i;
          lastI = j;
          found = true;
          break;
        }
      }
      if (found) solution = solution.slice(0, firstI).concat(solution.slice(lastI));
    }

    // solutions do not include the entrances
    if (solution.length > 1) {
      if (cellEq(solution[0], this.start)) solution = solution.slice(1);
      if (cellEq(solution[solution.length - 1], this.end)) solution = solution.slice(0, -1);
    }

    return solution;
  }

  /** Prune every solution (see `pruneSolution`). */
  pruneSolutions(solutions: Solution[]): Solution[] {
    return solutions.map((s) => this.pruneSolution(s));
  }
}
