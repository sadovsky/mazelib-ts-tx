import { pyAssert } from "../errors.js";
import { type Cell, cellEq, cellIn, midpoint } from "../grid.js";
import { PySet } from "../pyset.js";
import { MazeSolveAlgo, type Solution } from "./MazeSolveAlgo.js";

/** A partial path; `null` marks a path that has stopped. */
type Partial = (Cell | null)[];

/**
 * The Shortest Path solver: breadth-first, branching at every junction, and
 * stopping as soon as one branch reaches the end.
 *
 * Like the original, it decides whether the *end* is on the edge by looking
 * at the start, and it sometimes returns no solution where one exists.
 */
export class ShortestPath extends MazeSolveAlgo {
  protected startEdge = false;
  protected endEdge = false;

  protected solveImpl(): Solution[] {
    this.startEdge = this.onEdge(this.start);
    this.endEdge = this.onEdge(this.start);

    const start = this.startEdge ? this.pushEdge(this.start) : this.start;
    const startPosis = this.findUnblockedNeighbors(start);
    pyAssert(startPosis.length > 0, "Input maze is invalid.");

    // 1) create a solution for each starting position
    const solutions: Partial[] = startPosis.map((sp) =>
      this.startEdge ? [start, midpoint(start, sp), sp] : [midpoint(start, sp), sp],
    );

    // 2) extend every unfinished solution by one cell, branching at junctions
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
          // a solution reached the end
          if (!this.onEdge(this.end)) solutions[s] = sol.slice(0, -1);
          return this.cleanUp([solutions[s]]);
        } else if (last !== null) {
          // check whether we've gone past the endpoint
          if (sol.length > 1 && cellEq(midpoint(last, sol[sol.length - 2] as Cell), this.end)) {
            return this.cleanUp([sol.slice(0, -1)]);
          }
          const ns = this.findUnblockedNeighbors(last).filter((c) => !cellIn(c, sol));
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

    return this.cleanUp(solutions);
  }

  /** Drop incomplete solutions, trim the end cells, dedupe (CPython set order), and sort by length. */
  protected cleanUp(solutions: Partial[]): Solution[] {
    const kept: Partial[] = [];
    for (const sol of solutions) {
      let newSol: Partial | null = null;
      const penultimate = sol[sol.length - 2];
      if (this.endEdge) {
        const last = this.pushEdge(this.end);
        if (sol.length > 2 && this.withinOne(penultimate, this.end)) newSol = sol.slice(0, -1);
        else if (sol.length > 2 && this.withinOne(penultimate, last)) newSol = sol.slice(0, -1).concat([last]);
      } else if (sol.length > 2 && this.withinOne(penultimate, this.end)) {
        newSol = sol.slice(0, -1);
      }
      if (newSol && newSol.length > 0) {
        if (cellEq(newSol[newSol.length - 1], this.end)) newSol = newSol.slice(0, -1);
        kept.push(newSol);
      }
    }

    const unique = PySet.from(kept).toList() as Cell[][];
    return unique.map((s) => s.slice()).sort((a, b) => a.length - b.length);
  }
}
