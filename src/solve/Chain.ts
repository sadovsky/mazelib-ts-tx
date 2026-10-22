import { PyError } from "../errors.js";
import { type Cell, cellIndex, midpoint } from "../grid.js";
import { pyRandom } from "../random/index.js";
import { MazeSolveAlgo, type Solution } from "./MazeSolveAlgo.js";

export interface ChainOptions {
  /** `"right"` (default) or `"left"`. */
  turn?: string;
}

/**
 * The Chain solver.
 *
 * 1. Draw a straight-ish guiding line from start to end, ignoring walls.
 * 2. Follow it; when a wall is in the way, send backtracking robots out of the
 *    open directions until one reaches the next point on the line.
 * 3. Repeat until the end is reached.
 */
export class Chain extends MazeSolveAlgo {
  readonly directions: Cell[];

  constructor(options: ChainOptions = {}) {
    super();
    this.directions =
      options.turn === "left"
        ? [[-2, 0], [0, -2], [2, 0], [0, 2]]
        : [[-2, 0], [0, 2], [2, 0], [0, -2]];
  }

  protected solveImpl(): Solution[] {
    const guidingLine = this.drawGuidingLine();
    let current = 0;
    const solution: Cell[] = [guidingLine[0]];

    while (current < guidingLine.length - 1) {
      if (this.tryDirectMove(solution, guidingLine, current)) current += 1;
      else current = this.sendOutRobots(solution, guidingLine, current);
    }

    return [solution];
  }

  /** Send a backtracking robot down each open direction; keep the shortest robot path. */
  private sendOutRobots(solution: Cell[], guidingLine: Cell[], i: number): number {
    const from = guidingLine[i];
    const robotPaths = this.findUnblockedNeighbors(from).map((n) => [from, midpoint(from, n), n]);

    for (let j = 0; j < robotPaths.length; j++) {
      robotPaths[j] = this.backtrackingSolve(robotPaths[j], guidingLine[i + 1]);
    }

    if (robotPaths.length === 0) throw new PyError("ValueError", "min() iterable argument is empty");
    let shortest = robotPaths[0];
    for (const path of robotPaths) if (path.length < shortest.length) shortest = path;

    solution.push(...shortest.slice(1));
    const k = cellIndex(solution[solution.length - 1], guidingLine);
    if (k < 0) throw new PyError("ValueError", "robot path does not end on the guiding line");
    return k;
  }

  private backtrackingSolve(start: Cell[], goal: Cell): Cell[] {
    const path = start.slice();
    while (!this.withinOne(path[path.length - 1], goal)) {
      const last = path[path.length - 1];
      const ns = this.findUnblockedNeighbors(last);
      if (ns.length > 1 && path.length > 2) {
        const k = cellIndex(path[path.length - 3], ns);
        if (k >= 0) ns.splice(k, 1);
      }
      const next = pyRandom.choice(ns);
      path.push(midpoint(last, next));
      path.push(next);
    }
    return path;
  }

  /** If the way to the next point on the guiding line is open, take it. */
  private tryDirectMove(solution: Cell[], guidingLine: Cell[], i: number): boolean {
    const g = this.grid;
    const [r, c] = guidingLine[i];
    const next = guidingLine[i + 1];
    const rdiff = next[0] - r;
    const cdiff = next[1] - c;
    const rh = Math.floor(rdiff / 2);
    const ch = Math.floor(cdiff / 2);

    if (rdiff === 0 || cdiff === 0) {
      if (g.get(r + rh, c + ch) === 0) {
        solution.push([r + rh, c + ch], [r + rdiff, c + cdiff]);
        return true;
      }
    } else if (g.get(r + rh, c) === 0 && g.get(r + rdiff, c + ch) === 0) {
      solution.push([r + rh, c], [r + rdiff, c], [r + rdiff, c + ch], [r + rdiff, c + cdiff]);
      return true;
    } else if (g.get(r, c + ch) === 0 && g.get(r + rh, c + cdiff) === 0) {
      solution.push([r, c + ch], [r, c + cdiff], [r + rh, c + cdiff], [r + rdiff, c + cdiff]);
      return true;
    }
    return false;
  }

  /** A (mostly) straight, possibly diagonal, line from start to end. */
  private drawGuidingLine(): Cell[] {
    const [r2, c2] = this.end;
    let current = this.onEdge(this.start) ? this.pushEdge(this.start) : this.start;
    const path: Cell[] = [current];
    while (!this.withinOne(current, this.end)) {
      const [r1, c1] = current;
      let rdiff = 0;
      let cdiff = 0;
      if (Math.abs(r1 - r2) > 1) rdiff = r1 < r2 ? 2 : -2;
      if (Math.abs(c1 - c2) > 1) cdiff = c1 < c2 ? 2 : -2;
      current = [r1 + rdiff, c1 + cdiff];
      path.push(current);
    }
    return path;
  }
}
