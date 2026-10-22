import { describe, expect, it } from "vitest";
import { CuldeSacFiller, DeadEndFiller, type Grid, Maze, Perturbation, Prims, TrivialMaze } from "../src/index.js";
import { allCornersComplete, allPassagesOpen, boundaryIsSolid, gridFromArrays } from "./helpers.js";

/**
 * A super-simple little maze with a loop in it.
 *
 *   #######
 *         #
 *   # # # #
 *   # #   #
 *   # #####
 *   #
 *   #######
 */
function exampleCulDeSacMaze(): Grid {
  return gridFromArrays([
    [1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1],
  ]);
}

describe("transmuters", () => {
  it("cul de sac filler", () => {
    const m = new Maze(8765);
    m.generator = new Prims(3, 3);
    m.generate();
    m.grid = exampleCulDeSacMaze();

    expect(m.grid.get(1, 5)).toBe(0);

    m.transmuters = [new CuldeSacFiller()];
    m.transmute();

    expect(m.grid.get(1, 5)).toBe(1);
    expect(boundaryIsSolid(m.grid)).toBe(true);
    expect(allCornersComplete(m.grid)).toBe(true);
  });

  it("dead end filler", () => {
    for (let i = 0; i < 10; i++) {
      const m = new Maze(678 + i);
      m.generator = new Prims(3, 3);
      m.generate();
      m.start = [1, 0];
      m.end = [5, 4];
      m.grid = exampleCulDeSacMaze();

      expect(m.grid.get(1, 5)).toBe(0);
      expect(m.grid.get(1, 2)).toBe(0);
      expect(m.grid.get(3, 3)).toBe(0);

      m.transmuters = [new CuldeSacFiller(), new DeadEndFiller({ iterations: 99 })];
      m.transmute();

      expect(m.grid.get(1, 5)).toBe(1);
      expect(m.grid.get(1, 2)).toBe(1);
      expect(m.grid.get(3, 3)).toBe(1);

      expect(boundaryIsSolid(m.grid)).toBe(true);
      expect(allCornersComplete(m.grid)).toBe(true);
    }
  });

  it("perturbation", () => {
    for (let i = 0; i < 10; i++) {
      const m = new Maze(9087 + i);
      m.generator = new TrivialMaze(4, 5);
      m.generate();

      m.transmuters = [new Perturbation()];
      m.transmute();

      const g = m.grid!;
      expect(boundaryIsSolid(g)).toBe(true);
      expect(allPassagesOpen(g)).toBe(true);
      expect(allCornersComplete(g)).toBe(true);
    }
  });
});
