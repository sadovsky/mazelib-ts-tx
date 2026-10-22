import { type Cell, cellIndex, midpoint } from "../grid.js";
import { pyRandom } from "../random/index.js";
import { MazeSolveAlgo, type Solution } from "./MazeSolveAlgo.js";

/**
 * The Backtracking solver: walk in a random direction, and only turn back at
 * a dead end.
 */
export class BacktrackingSolver extends MazeSolveAlgo {
  protected solveImpl(): Solution[] {
    const solution: Cell[] = [];
    // a first move has to be made
    solution.push(this.onEdge(this.start) ? this.pushEdge(this.start) : this.start);

    while (!this.withinOne(solution[solution.length - 1], this.end)) {
      const last = solution[solution.length - 1];
      const ns = this.findUnblockedNeighbors(last);
      // don't go back where you've just been
      if (ns.length > 1 && solution.length > 2) {
        const k = cellIndex(solution[solution.length - 3], ns);
        if (k >= 0) ns.splice(k, 1);
      }
      const next = pyRandom.choice(ns);
      solution.push(midpoint(last, next));
      solution.push(next);
    }

    return [solution];
  }
}
