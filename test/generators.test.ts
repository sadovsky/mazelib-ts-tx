import { describe, expect, it } from "vitest";
import {
  AldousBroder,
  BacktrackingGenerator,
  BinaryTree,
  CellularAutomaton,
  Division,
  DungeonRooms,
  Ellers,
  Grid,
  GrowingTree,
  HuntAndKill,
  Kruskal,
  Maze,
  Prims,
  PyError,
  Sidewinder,
  TrivialMaze,
  Wilsons,
} from "../src/index.js";
import { allCornersComplete, allPassagesOpen, boundaryIsSolid, gridFromArrays } from "./helpers.js";

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

function grid(m: Maze): Grid {
  expect(m.grid).not.toBeNull();
  return m.grid!;
}

describe("generators", () => {
  it("abstract constructor", () => {
    // example 1 of maze dimension definitions
    const m = new Maze(723);
    m.generator = new Prims(3, 3);
    expect(m.generator.h).toBe(3);
    expect(m.generator.w).toBe(3);
    expect(m.generator.H).toBe(7);
    expect(m.generator.W).toBe(7);

    // example 2 of maze dimension definitions
    m.generator = new Prims(24, 12);
    expect(m.generator.h).toBe(24);
    expect(m.generator.w).toBe(12);
    expect(m.generator.H).toBe(49);
    expect(m.generator.W).toBe(25);

    // ensure assertions are failed when invalid maze dimensions are provided
    expectAssertionError(() => new Prims(2, 2));
    expectAssertionError(() => new Prims(0, 2));
    expectAssertionError(() => new Prims(-2, 3));
    expectAssertionError(() => new Prims(224, -2));
  });

  it("aldous broder", () => {
    const m = new Maze(143);
    m.generator = new AldousBroder(4, 5);
    m.generate();

    expect(boundaryIsSolid(grid(m))).toBe(true);
    expect(allPassagesOpen(grid(m))).toBe(true);
    expect(allCornersComplete(grid(m))).toBe(true);
  });

  it("backtracking generator", () => {
    const m = new Maze(23);
    m.generator = new BacktrackingGenerator(4, 5);
    m.generate();

    expect(boundaryIsSolid(grid(m))).toBe(true);
    expect(allPassagesOpen(grid(m))).toBe(true);
    expect(allCornersComplete(grid(m))).toBe(true);
  });

  it("binary tree", () => {
    // try without a skew parameter
    let m = new Maze(163);
    m.generator = new BinaryTree(4, 5);
    m.generate();

    expect(boundaryIsSolid(grid(m))).toBe(true);
    expect(allPassagesOpen(grid(m))).toBe(true);
    expect(allCornersComplete(grid(m))).toBe(true);

    // try with a skew parameter
    m = new Maze(1298);
    m.generator = new BinaryTree(4, 5, { skew: "NW" });
    m.generate();

    expect(boundaryIsSolid(grid(m))).toBe(true);
    expect(allPassagesOpen(grid(m))).toBe(true);
    expect(allCornersComplete(grid(m))).toBe(true);
  });

  it("cellular automaton", () => {
    const m = new Maze(183);
    m.generator = new CellularAutomaton(4, 5);
    m.generate();

    expect(boundaryIsSolid(grid(m))).toBe(true);
    expect(allPassagesOpen(grid(m))).toBe(true);
  });

  it("division", () => {
    const m = new Maze(653);
    m.generator = new Division(4, 5);
    m.generate();

    expect(boundaryIsSolid(grid(m))).toBe(true);
    expect(allPassagesOpen(grid(m))).toBe(true);
    expect(allCornersComplete(grid(m))).toBe(true);
  });

  it("dungeon rooms grid", () => {
    const g = gridFromArrays([
      [1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1],
      [1, 1, 0, 0, 0, 1, 1],
      [1, 1, 0, 0, 0, 1, 1],
      [1, 1, 0, 0, 0, 1, 1],
      [1, 1, 1, 1, 1, 1, 1],
    ]);

    const m = new Maze(1293);
    m.generator = new DungeonRooms(4, 4, { grid: g });
    m.generate();

    expect(boundaryIsSolid(grid(m))).toBe(true);
    expect(allPassagesOpen(grid(m))).toBe(true);
  });

  it("dungeon reconnect maze", () => {
    const g = gridFromArrays([
      [1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 1, 0, 1],
      [1, 0, 0, 0, 1, 0, 1],
      [1, 0, 0, 0, 1, 0, 1],
      [1, 1, 1, 1, 1, 1, 1],
    ]);

    const m = new Maze(865);
    const gen = new DungeonRooms(4, 4, { grid: g });
    m.generator = gen;
    gen.reconnectMaze();

    expect(boundaryIsSolid(gen.grid!)).toBe(true);
    expect(allPassagesOpen(gen.grid!)).toBe(true);
  });

  it("dungeon rooms random rooms", () => {
    for (let i = 0; i < 20; i++) {
      const m = new Maze(900 + i);
      m.generator = new DungeonRooms(4, 4, {
        rooms: [
          [
            [1, 1],
            [3, 3],
          ],
        ],
        huntOrder: "random",
      });
      m.generate();

      expect(boundaryIsSolid(grid(m))).toBe(true);
      expect(allPassagesOpen(grid(m))).toBe(true);
    }
  });

  it("dungeon rooms serpentine rooms", () => {
    const m = new Maze(443);
    m.generator = new DungeonRooms(4, 4, {
      rooms: [
        [
          [1, 1],
          [3, 3],
        ],
      ],
      huntOrder: "serpentine",
    });
    m.generate();

    expect(boundaryIsSolid(grid(m))).toBe(true);
    expect(allPassagesOpen(grid(m))).toBe(true);
  });

  it("ellers", () => {
    const m = new Maze(563);
    m.generator = new Ellers(4, 5);
    m.generate();

    expect(boundaryIsSolid(grid(m))).toBe(true);
    expect(allPassagesOpen(grid(m))).toBe(true);
    expect(allCornersComplete(grid(m))).toBe(true);
  });

  it("growing tree", () => {
    const m = new Maze(743);
    m.generator = new GrowingTree(4, 5);
    m.generate();

    expect(boundaryIsSolid(grid(m))).toBe(true);
    expect(allPassagesOpen(grid(m))).toBe(true);
    expect(allCornersComplete(grid(m))).toBe(true);
  });

  it("hunt and kill random order", () => {
    const m = new Maze(8888);
    m.generator = new HuntAndKill(4, 5, { huntOrder: "random" });
    m.generate();

    expect(boundaryIsSolid(grid(m))).toBe(true);
    expect(allPassagesOpen(grid(m))).toBe(true);
    expect(allCornersComplete(grid(m))).toBe(true);
  });

  it("hunt and kill serpentine order", () => {
    const m = new Maze(808);
    m.generator = new HuntAndKill(4, 5, { huntOrder: "serpentine" });
    m.generate();

    expect(boundaryIsSolid(grid(m))).toBe(true);
    expect(allPassagesOpen(grid(m))).toBe(true);
    expect(allCornersComplete(grid(m))).toBe(true);
  });

  it("kruskal", () => {
    const m = new Maze(314);
    m.generator = new Kruskal(4, 5);
    m.generate();

    expect(boundaryIsSolid(grid(m))).toBe(true);
    expect(allPassagesOpen(grid(m))).toBe(true);
    expect(allCornersComplete(grid(m))).toBe(true);
  });

  it("prims", () => {
    const m = new Maze(159);
    m.generator = new Prims(4, 5);
    m.generate();

    expect(boundaryIsSolid(grid(m))).toBe(true);
    expect(allPassagesOpen(grid(m))).toBe(true);
    expect(allCornersComplete(grid(m))).toBe(true);
  });

  it("sidewinder", () => {
    const m = new Maze(26);
    m.generator = new Sidewinder(4, 5);
    m.generate();

    expect(boundaryIsSolid(grid(m))).toBe(true);
    expect(allPassagesOpen(grid(m))).toBe(true);
    expect(allCornersComplete(grid(m))).toBe(true);
  });

  it("trivial maze spiral", () => {
    const m = new Maze(535);
    m.generator = new TrivialMaze(4, 5);
    m.generate();

    expect(boundaryIsSolid(grid(m))).toBe(true);
    expect(allPassagesOpen(grid(m))).toBe(true);
    expect(allCornersComplete(grid(m))).toBe(true);
    expect(allCornersComplete(grid(m))).toBe(true);
  });

  it("trivial maze serpentine", () => {
    // run this test enough times to trip the different skewness parameters
    for (let i = 0; i < 20; i++) {
      const m = new Maze(1967 + i);
      m.generator = new TrivialMaze(4, 5, { mazeType: "serpentine" });
      m.generate();

      expect(boundaryIsSolid(grid(m))).toBe(true);
      expect(allPassagesOpen(grid(m))).toBe(true);
      expect(allCornersComplete(grid(m))).toBe(true);
    }
  });

  it("wilsons random order", () => {
    const m = new Maze(432);
    m.generator = new Wilsons(4, 5, { huntOrder: "random" });
    m.generate();

    expect(boundaryIsSolid(grid(m))).toBe(true);
    expect(allPassagesOpen(grid(m))).toBe(true);
    expect(allCornersComplete(grid(m))).toBe(true);
  });

  it("wilsons serpentine order", () => {
    const m = new Maze(12345);
    m.generator = new Wilsons(4, 5, { huntOrder: "serpentine" });
    m.generate();

    expect(boundaryIsSolid(grid(m))).toBe(true);
    expect(allPassagesOpen(grid(m))).toBe(true);
    expect(allCornersComplete(grid(m))).toBe(true);
  });
});
