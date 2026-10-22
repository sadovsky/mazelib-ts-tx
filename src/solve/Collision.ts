import { PyError } from "../errors.js";
import { type Cell, cellEq, cellIndex, midpoint } from "../grid.js";
import { MazeSolveAlgo, type Solution } from "./MazeSolveAlgo.js";

const END: Cell = [-999, -9];
const DEAD_END: Cell = [-9, -999];

/** A robot's path; a trailing `null` marks a robot stopped by a collision. */
type Path = (Cell | null)[];

function isMarker(c: Cell | null): boolean {
  return cellEq(c, END) || cellEq(c, DEAD_END);
}

function pathsKey(paths: Path[]): Set<string> {
  return new Set(paths.map((p) => JSON.stringify(p)));
}

/**
 * The Collision solver.
 *
 * 1. Flood the maze from the start, moving all robots one cell per step.
 * 2. Where two robots meet, build a wall and stop them both.
 * 3. Robots stop at dead ends, and at the end.
 * 4. Re-flood until the result stops changing.
 *
 * The original crashes (TypeError) on the step after any collision, so it
 * only works on mazes without loops. Here collided robots are dropped, as the
 * algorithm intends, which gives a result on every maze.
 */
export class Collision extends MazeSolveAlgo {
  protected solveImpl(): Solution[] {
    const start = this.onEdge(this.start) ? this.pushEdge(this.start) : this.start;

    // flood the maze twice, and compare the results
    let paths = this.floodMaze(start);
    let tempPaths = this.floodMaze(start);
    // re-flood the maze until there are no more changes
    while (this.differs(paths, tempPaths)) {
      paths = tempPaths;
      tempPaths = this.floodMaze(start);
    }

    return this.fixEntrances(paths);
  }

  /** Python `set(map(tuple, a)) - set(map(tuple, b))` is non-empty. */
  private differs(a: Path[], b: Path[]): boolean {
    const keys = pathsKey(b);
    return a.some((p) => !keys.has(JSON.stringify(p)));
  }

  private floodMaze(start: Cell): Path[] {
    let paths = this.oneTimeStep([[start]]);
    if (paths === null) throw new PyError("TypeError", "'NoneType' object is not iterable");
    let temp: Path[] | null = paths;
    while (temp !== null) {
      paths = temp;
      temp = this.oneTimeStep(paths);
    }
    return paths;
  }

  /** Move every running robot forward one cell; null if none could move. */
  private oneTimeStep(paths: Path[]): Path[] | null {
    const temp: Path[] = [];
    let stepMade = false;

    for (const path of paths) {
      const last = path[path.length - 1];
      if (last === null || cellEq(last, DEAD_END)) continue;
      if (cellEq(last, END)) {
        temp.push(path);
        continue;
      }

      const ns = this.findUnblockedNeighbors(last);
      if (path.length > 2) {
        const k = cellIndex(path[path.length - 3], ns);
        if (k >= 0) ns.splice(k, 1);
      }

      stepMade = true;
      if (ns.length === 0) {
        temp.push(path.concat([DEAD_END]));
      } else {
        for (const neighbor of ns) {
          const mid = midpoint(last, neighbor);
          if (this.withinOne(neighbor, this.end)) temp.push(path.concat([mid, neighbor, END]));
          else temp.push(path.concat([mid, neighbor]));
        }
      }
    }

    if (!stepMade) return null;
    return this.fixCollisions(temp);
  }

  /** Where robots meet, build a wall and stop all of them. */
  private fixCollisions(paths: Path[]): Path[] {
    const n = paths.length;
    for (let i = 0; i < n - 1; i++) {
      const here = paths[i][paths[i].length - 1];
      if (here === null || isMarker(here)) continue;
      let collided = false;
      for (let j = i + 1; j < n; j++) {
        const there = paths[j][paths[j].length - 1];
        if (there === null || isMarker(there)) continue;
        if (cellEq(here, there)) {
          paths[j][paths[j].length - 1] = null;
          collided = true;
        }
      }
      if (collided) {
        this.grid.set(here[0], here[1], 1);
        paths[i][paths[i].length - 1] = null;
      }
    }
    return paths;
  }

  /** Keep the robots that reached the end, and trim the entrances off their paths. */
  private fixEntrances(paths: Path[]): Solution[] {
    let out = paths
      .filter((p) => {
        const last = p[p.length - 1];
        return last !== null && !cellEq(last, DEAD_END);
      })
      .map((p) => p.slice(0, -1) as Cell[]);
    if (!this.onEdge(this.start)) out = out.map((p) => p.slice(1));
    if (!this.onEdge(this.end)) out = out.map((p) => p.slice(0, -1));
    return out;
  }
}
