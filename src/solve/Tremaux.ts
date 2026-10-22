import { PyError } from "../errors.js";
import { type Cell, cellIndex, midpoint } from "../grid.js";
import { pyRandom } from "../random/index.js";
import { MazeSolveAlgo, type Solution } from "./MazeSolveAlgo.js";

/**
 * Trémaux's algorithm: mark each cell as you visit it; prefer unmarked
 * passages, then passages marked once, and never take one marked twice
 * unless there is no choice.
 */
export class Tremaux extends MazeSolveAlgo {
  private visitedCells = new Map<string, number>();

  protected solveImpl(): Solution[] {
    this.visitedCells = new Map();
    const solution: Cell[] = [this.start];
    this.visit(this.start);

    // if you're on the edge, push in one
    if (this.onEdge(this.start)) {
      const current = this.pushEdge(this.start);
      solution.push(current);
      this.visit(current);
    }

    while (!this.withinOne(solution[solution.length - 1], this.end)) {
      const last = solution[solution.length - 1];
      const ns = this.findUnblockedNeighbors(last);
      const next = this.whatNext(ns, solution);
      solution.push(midpoint(last, next));
      solution.push(next);
      this.visit(next);
    }

    return [solution];
  }

  private visit(cell: Cell): void {
    const key = `${cell[0]},${cell[1]}`;
    this.visitedCells.set(key, (this.visitedCells.get(key) ?? 0) + 1);
  }

  private visitCount(cell: Cell): number {
    const n = this.visitedCells.get(`${cell[0]},${cell[1]}`) ?? 0;
    return n < 3 ? n : 2;
  }

  private whatNext(ns: Cell[], solution: Cell[]): Cell {
    if (ns.length <= 1) {
      if (ns.length === 0) throw new PyError("IndexError", "list index out of range");
      return ns[0];
    }

    // organize the neighbors by their visit count
    const byCount = new Map<number, Cell[]>();
    for (const n of ns) {
      const k = this.visitCount(n);
      const list = byCount.get(k);
      if (list) list.push(n);
      else byCount.set(k, [n]);
    }

    if (byCount.has(0)) return pyRandom.choice(byCount.get(0)!);
    const options = byCount.get(1) ?? byCount.get(2)!;
    // try not to backtrack, if you can
    if (options.length > 1 && solution.length > 2) {
      const k = cellIndex(solution[solution.length - 3], options);
      if (k >= 0) options.splice(k, 1);
    }
    return pyRandom.choice(options);
  }
}
