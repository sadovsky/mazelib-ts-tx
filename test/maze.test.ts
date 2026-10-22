import { describe, expect, it } from "vitest";
import { type Cell, Collision, Grid, Maze, Prims, PyError, type Solution } from "../src/index.js";
import { gridFromArrays } from "./helpers.js";

/** Is this cell on the edge of the maze? */
function onEdge(grid: Grid, cell: Cell): boolean {
  const [r, c] = cell;

  if (r === 0 || r === grid.height - 1) return true;
  else if (c === 0 || c === grid.width - 1) return true;

  return false;
}

/** Count the number of turns in a path. */
function numTurns(path: Solution): number {
  if (path.length < 3) return 0;

  let num = 0;
  for (let i = 1; i < path.length - 1; i++) {
    const sameCol = path[i - 1][0] === path[i][0] && path[i][0] === path[i + 1][0];
    const sameRow = path[i - 1][1] === path[i][1] && path[i][1] === path[i + 1][1];
    if (!sameRow && !sameCol) num += 1;
  }

  return num;
}

function expectAssertionError(fn: () => unknown): void {
  let err: unknown;
  try {
    fn();
  } catch (e) {
    err = e;
  }
  expect(err).toBeInstanceOf(PyError);
  expect((err as PyError).kind).toBe("AssertionError");
}

describe("maze", () => {
  it("grid size", () => {
    const h = 4;
    const w = 5;
    const H = 2 * h + 1;
    const W = 2 * w + 1;

    const m = new Maze(1337);
    m.generator = new Prims(h, w);
    m.generate();

    expect(m.grid!.height).toBe(H);
    expect(m.grid!.width).toBe(W);
  });

  it("inner entrances", () => {
    const h = 4;
    const w = 5;

    for (let i = 0; i < 10; i++) {
      const m = new Maze(999 + i);
      m.generator = new Prims(h, w);
      m.generate();
      m.generateEntrances(false, false);

      expect(onEdge(m.grid!, m.start!)).toBe(false);
      expect(onEdge(m.grid!, m.end!)).toBe(false);
    }
  });

  it("outer entrances", () => {
    const h = 3;
    const w = 3;

    for (let i = 0; i < 10; i++) {
      // the original uses `1200 + 1` (not `+ i`) here
      const m = new Maze(1200 + 1);
      m.generator = new Prims(h, w);
      m.generate();
      m.generateEntrances();

      expect(onEdge(m.grid!, m.start!)).toBe(true);
      expect(onEdge(m.grid!, m.end!)).toBe(true);
    }
  });

  it("generator wipe", () => {
    const h = 4;
    const w = 5;

    for (let i = 0; i < 10; i++) {
      // the original uses `1033 + 1` (not `+ i`) here
      const m = new Maze(1033 + 1);
      m.generator = new Prims(h, w);
      m.generate();
      m.generateEntrances();
      m.generate();

      expect(m.start).toBeNull();
      expect(m.end).toBeNull();
      expect(m.solutions).toBeNull();
    }
  });

  it("monte carlo", () => {
    const h = 4;
    const w = 5;
    const H = 2 * h + 1;
    const W = 2 * w + 1;

    const m = new Maze(104);
    m.generator = new Prims(h, w);
    m.solver = new Collision();
    m.generateMonteCarlo(3);

    // grid size
    expect(m.grid!.height).toBe(H);
    expect(m.grid!.width).toBe(W);

    // test entrances are outer
    expect(onEdge(m.grid!, m.start!)).toBe(true);
    expect(onEdge(m.grid!, m.end!)).toBe(true);
  });

  it("monte carlo reducer", () => {
    const h = 4;
    const w = 5;
    const H = 2 * h + 1;
    const W = 2 * w + 1;

    const m = new Maze(105);
    m.generator = new Prims(h, w);
    m.solver = new Collision();
    m.generateMonteCarlo(3, undefined, undefined, numTurns);

    // grid size
    expect(m.grid!.height).toBe(H);
    expect(m.grid!.width).toBe(W);

    // test entrances are outer
    expect(onEdge(m.grid!, m.start!)).toBe(true);
    expect(onEdge(m.grid!, m.end!)).toBe(true);
  });

  it("maze to string", () => {
    const m = new Maze(106);
    m.generator = new Prims(3, 3);

    // fake some maze results, to test against
    m.grid = gridFromArrays([
      [1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 0, 1, 1, 1],
      [1, 0, 1, 0, 0, 0, 1],
      [1, 1, 1, 0, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1],
    ]);
    m.start = [5, 0];
    m.end = [3, 6];
    m.solutions = [[[5, 1], [5, 2], [5, 3], [5, 4], [5, 5], [4, 5], [3, 5]]];

    const s = m.toString().split("\n");

    expect(s[0].trim()).toBe("#######");
    expect(s[2].trim()).toBe("# # ###");
    expect(s[3].trim()).toBe("# #  +E");
    expect(s[5].trim()).toBe("S+++++#");
    expect(s[6].trim()).toBe("#######");
  });

  it("invalid inputs", () => {
    const m = new Maze(107);

    // should not be able to generate or solve if neither algorithm was set
    expectAssertionError(() => m.generate());
    expectAssertionError(() => m.solve());

    // even if the generator algorithm is set, you have to run it
    m.generator = new Prims(3, 3);
    expectAssertionError(() => m.solve());

    // the pretty-print, string formats should fail gracefully
    m.start = [1, 1];
    m.end = [3, 3];
    expect(m.toString()).toBe("");
    // Python's repr(m) is the same as str(m)
    expect(String(m)).toBe("");

    // the Monte Carlo method has a special zero-to-one input scalar
    // (the original passes `True` as `repeat`, i.e. 1)
    expectAssertionError(() => m.generateMonteCarlo(1, 3, -1.0));
    expectAssertionError(() => m.generateMonteCarlo(1, 3, 10.0));
  });

  it("set seed", () => {
    let m = new Maze(9090);
    m.generator = new Prims(7, 7);
    m.generate();
    const grid0 = m.toString();

    m = new Maze(9090);
    m.generator = new Prims(7, 7);
    m.generate();
    const grid1 = m.toString();

    expect(grid0).toBe(grid1);

    m.generator = new Prims(7, 7);
    m.generate();
    const grid2 = m.toString();

    expect(grid0).not.toBe(grid2);
  });
});
