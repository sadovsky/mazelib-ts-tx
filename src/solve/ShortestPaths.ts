import { pyAssert } from "../errors.js";
import { type Cell, cellEq, cellIn, midpoint } from "../grid.js";
import type { Solution } from "./MazeSolveAlgo.js";
import { ShortestPath } from "./ShortestPath.js";

type Partial = (Cell | null)[];

/**
 * The Shortest Paths solver: breadth-first like `ShortestPath`, but every
 * branch runs until it stops, so all shortest solutions are found.
 */
export class ShortestPaths extends ShortestPath {
  protected override solveImpl(): Solution[] {
    this.startEdge = this.onEdge(this.start);
    this.endEdge = this.onEdge(this.end);

    const start = this.startEdge ? this.pushEdge(this.start) : this.start;
    const startPosis = this.findUnblockedNeighbors(start);
    pyAssert(startPosis.length > 0, "Input maze is invalid.");

    const solutions: Partial[] = startPosis.map((sp) =>
      this.startEdge ? [start, midpoint(start, sp), sp] : [midpoint(start, sp), sp],
    );

    let numUnfinished = solutions.length;
    while (numUnfinished > 0) {
      const n = solutions.length;
      for (let s = 0; s < n; s++) {
        const sol = solutions[s];
        const last = sol[sol.length - 1];
        if (cellIn(last, sol.slice(0, -1))) {
          // stop solutions that have done a full loop
          sol.push(null);
        } else if (this.withinOne(last, this.end)) {
          // stop solutions that have reached the end
          sol.push(null);
        } else if (last !== null) {
          // check whether we've gone past the endpoint
          if (sol.length > 1 && cellEq(midpoint(last, sol[sol.length - 2] as Cell), this.end)) {
            sol.push(null);
            continue;
          }
          const ns = this.findUnblockedNeighbors(last).filter((c) => !cellIn(c, sol.slice(-2)));
          if (ns.length === 0) {
            sol.push(null);
          } else {
            for (let j = 1; j < ns.length; j++) {
              solutions.push(sol.concat([midpoint(ns[j], last), ns[j]]));
            }
            sol.push(midpoint(ns[0], last), ns[0]);
          }
        }
      }
      numUnfinished = solutions.filter((sol) => sol[sol.length - 1] !== null).length;
    }

    const cleaned = this.cleanUp(solutions);
    pyAssert(cleaned.length > 0 && cleaned[0].length > 0, "No valid solutions found.");
    return cleaned;
  }
}
