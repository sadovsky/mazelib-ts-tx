import { type Cell, midpoint } from "../grid.js";
import { pyRandom } from "../random/index.js";
import { MazeSolveAlgo, type Solution } from "./MazeSolveAlgo.js";

/** The Random Mouse solver: wander at random until the end is found. */
export class RandomMouse extends MazeSolveAlgo {
  protected solveImpl(): Solution[] {
    const solution: Cell[] = [];
    solution.push(this.onEdge(this.start) ? this.pushEdge(this.start) : this.start);

    while (!this.withinOne(solution[solution.length - 1], this.end)) {
      const last = solution[solution.length - 1];
      const next = pyRandom.choice(this.findUnblockedNeighbors(last));
      solution.push(midpoint(last, next));
      solution.push(next);
    }

    return [solution];
  }
}
