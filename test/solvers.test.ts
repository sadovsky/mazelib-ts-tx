import { describe, expect, it } from "vitest";
import {
  BacktrackingSolver,
  type Cell,
  Chain,
  Collision,
  Maze,
  type MazeSolveAlgo,
  Prims,
  RandomMouse,
  ShortestPath,
  ShortestPaths,
  type Solution,
  Tremaux,
} from "../src/index.js";
import { cellsEqual } from "./helpers.js";

/** Check that one cell is exactly one move from another. */
function oneAway(cell1: Cell, cell2: Cell): boolean {
  const [r1, c1] = cell1;
  const [r2, c2] = cell2;

  if (r1 === r2 && Math.abs(c1 - c2) === 1) return true;
  else if (c1 === c2 && Math.abs(r1 - r2) === 1) return true;

  return false;
}

/** No cell should appear twice in the same maze solution. */
function duplicatesInSolution(solution: Solution): boolean {
  for (let i = 0; i < solution.length - 1; i++) {
    if (solution.slice(i + 1).some((c) => cellsEqual(c, solution[i]))) return true;
  }
  return false;
}

/** Verify that each cell in a solution path is next to the previous cell. */
function solutionIsSane(solution: Solution): boolean {
  expect(solution.length).toBeGreaterThan(0);

  for (let i = 1; i < solution.length; i++) {
    if (!oneAway(solution[i - 1], solution[i])) return false;
  }

  return true;
}

/** Create a maze with entrances inside/outside. */
function createMazeWithVariedEntrances(startOuter = true, endOuter = true, seed = 0): Maze {
  if (!seed) {
    // Python: `seed = 4444 + 1 if start_outer else 0 + 3 if end_outer else 0`
    seed = startOuter ? 4444 + 1 : endOuter ? 0 + 3 : 0;
  }

  const m = new Maze(seed);
  m.generator = new Prims(6, 7);
  m.generate();

  if (startOuter && endOuter) m.generateEntrances();
  else if (!startOuter && !endOuter) m.generateEntrances(false, false);
  else if (startOuter) m.generateEntrances(true, false);
  else m.generateEntrances(false, true);

  return m;
}

/** Assertions shared by every solver test. */
function checkSolutions(m: Maze): void {
  expect(m.solutions).not.toBeNull();
  for (const sol of m.solutions!) {
    expect(duplicatesInSolution(sol)).toBe(false);
    expect(oneAway(m.start!, sol[0])).toBe(true);
    expect(oneAway(m.end!, sol[sol.length - 1])).toBe(true);
    expect(solutionIsSane(sol)).toBe(true);
  }
}

/** Access the solver's protected pruning helper and entrances (Python's `_prune_solution`). */
type PrunerInternals = { start: Cell; end: Cell; pruneSolution(s: Solution): Solution };
function internals(solver: MazeSolveAlgo): PrunerInternals {
  return solver as unknown as PrunerInternals;
}

function repeat<T>(xs: T[], n: number): T[] {
  const out: T[] = [];
  for (let i = 0; i < n; i++) out.push(...xs);
  return out;
}

describe("solvers", () => {
  it("prune solution", () => {
    // build a test Maze and solver, just as placeholders
    const m = new Maze(1834);
    m.solver = new RandomMouse();
    const s = internals(m.solver);
    s.start = [0, 1];
    s.end = [0, 5];

    // test the pruner does nothing if nothing needs to be done
    let sol: Cell[] = [[1, 1], [1, 2], [1, 3], [1, 4], [1, 5]];
    expect(s.pruneSolution(sol)).toEqual(sol);

    // test the pruner correctly prunes one duplicate
    const sol1: Cell[] = [[1, 1], [1, 2], [1, 3], [1, 4], [2, 4], [3, 4], [2, 4], [1, 4], [1, 5]];
    expect(s.pruneSolution(sol1)).toEqual(sol);

    // test the pruner correctly prunes two duplicates
    const sol2: Cell[] = [
      [1, 1], [1, 2], [1, 3], [1, 4], [2, 4], [3, 4], [2, 4],
      [1, 4], [2, 4], [3, 4], [2, 4], [1, 4], [1, 5],
    ];
    expect(s.pruneSolution(sol2)).toEqual(sol);

    // test the pruner correctly prunes the end point from the solution
    const sol3: Cell[] = [[1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [0, 5]];
    expect(s.pruneSolution(sol3)).toEqual(sol);

    // test the pruner correctly prunes the start point from the solution
    const sol4: Cell[] = [[0, 1], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5]];
    expect(s.pruneSolution(sol4)).toEqual(sol);

    // test the pruner correctly prunes the start points and end points from the solution
    const sol5: Cell[] = [[0, 1], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [0, 5]];
    expect(s.pruneSolution(sol5)).toEqual(sol);

    // test the pruner correctly prunes multiple start points and end points from the solution
    const sol6: Cell[] = [[0, 1], [0, 1], [0, 1], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [0, 5], [0, 5]];
    expect(s.pruneSolution(sol6)).toEqual(sol);

    // test the pruner correctly prunes a complex mess of a solution
    const sol7: Cell[] = [
      [0, 1], [0, 1], [0, 1], [1, 1], [1, 2], [1, 3], [1, 4],
      [2, 4], [3, 4], [2, 4], [1, 4], [1, 5], [0, 5], [0, 5],
    ];
    expect(s.pruneSolution(sol7)).toEqual(sol);
    // bonus: let's test a long, and heavily redundant, solution
    expect(s.pruneSolution(repeat(sol7, 100))).toEqual(sol);

    // let's also test a couple edge cases
    sol = [];
    expect(s.pruneSolution(sol)).toEqual(sol);
    sol = [[1, 1]];
    expect(s.pruneSolution(sol)).toEqual(sol);
    sol = [[1, 1], [1, 2]];
    expect(s.pruneSolution(sol)).toEqual(sol);
    sol = [[1, 1], [1, 2]];
    expect(s.pruneSolution(repeat(sol, 100))).toEqual(sol);
  });

  it("backtracking solver", () => {
    let seed = 3456;
    for (const s of [true, false]) {
      for (const e of [true, false]) {
        seed += 13;
        const m = createMazeWithVariedEntrances(s, e, seed);
        m.solver = new BacktrackingSolver();
        m.solve();
        checkSolutions(m);
      }
    }
  });

  it("chain", () => {
    let seed = 1005;
    for (const s of [true, false]) {
      for (const e of [true, false]) {
        seed += 19;
        const m = createMazeWithVariedEntrances(s, e, seed);
        m.solver = new Chain();
        m.solve();
        checkSolutions(m);
      }
    }
  });

  it("collision", () => {
    // note: like the original, the seed is incremented but not passed on
    let seed = 238;
    for (const s of [true, false]) {
      for (const e of [true, false]) {
        seed += 2;
        const m = createMazeWithVariedEntrances(s, e);
        m.solver = new Collision();
        m.solve();
        checkSolutions(m);
      }
    }
  });

  it("random mouse", () => {
    let seed = 1074;
    for (const s of [true, false]) {
      for (const e of [true, false]) {
        seed += 27;
        const m = createMazeWithVariedEntrances(s, e);
        m.solver = new RandomMouse();
        m.solve();
        checkSolutions(m);
      }
    }
  });

  it("shortest path", () => {
    let seed = 4321;
    for (const s of [true, false]) {
      for (const e of [true, false]) {
        seed += 33;
        const m = createMazeWithVariedEntrances(s, e, seed);
        m.solver = new ShortestPath();
        m.solve();
        checkSolutions(m);
      }
    }
  });

  it("shortest paths", () => {
    let seed = 6109;
    for (const s of [true, false]) {
      for (const e of [true, false]) {
        seed += 11;
        const m = createMazeWithVariedEntrances(s, e);
        m.solver = new ShortestPaths();
        m.solve();
        checkSolutions(m);
      }
    }
  });

  it("tremaux", () => {
    let seed = 2121;
    for (const s of [true, false]) {
      for (const e of [true, false]) {
        seed += 21;
        const m = createMazeWithVariedEntrances(s, e);
        m.solver = new Tremaux();
        m.solve();
        checkSolutions(m);
      }
    }
  });
});
