import { describe, expect, it } from "vitest";
import { type Cell, Collision, Ellers, Grid, Maze } from "../src/index.js";

/** Breadth-first distance (in grid squares) from start to end through open squares. */
function bfsDistance(grid: Grid, start: Cell, end: Cell): number | null {
  const seen = new Set([`${start}`]);
  let frontier: Cell[] = [start];
  for (let d = 0; frontier.length > 0; d++) {
    const next: Cell[] = [];
    for (const [r, c] of frontier) {
      if (r === end[0] && c === end[1]) return d;
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n: Cell = [r + dr, c + dc];
        if (n[0] < 0 || n[1] < 0 || n[0] >= grid.height || n[1] >= grid.width) continue;
        if (grid.get(n[0], n[1]) && !(n[0] === end[0] && n[1] === end[1])) continue;
        if (seen.has(`${n}`)) continue;
        seen.add(`${n}`);
        next.push(n);
      }
    }
    frontier = next;
  }
  return null;
}

function isValidPath(grid: Grid, start: Cell, end: Cell, path: Cell[]): boolean {
  const full = [start, ...path, end];
  for (let i = 1; i < full.length; i++) {
    const [a, b] = [full[i - 1], full[i]];
    if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) !== 1) return false;
  }
  return path.every(([r, c]) => grid.get(r, c) === 0);
}

describe("known bugs in the original", () => {
  it("Ellers returns a maze where the original overflows int8 set ids", () => {
    Maze.setSeed(0);
    const grid = new Ellers(12, 17, { xskew: 0.9, yskew: 0.1 }).generate();
    expect(grid.height).toBe(25);
    expect(grid.width).toBe(35);
    for (let r = 1; r < 25; r += 2) for (let c = 1; c < 35; c += 2) expect(grid.get(r, c)).toBe(0);
  });

  it("Collision solves a maze with loops (the original raises TypeError)", () => {
    const grid = Grid.fromRows([
      "#############",
      "#...........#",
      "#.###.###.###",
      "#.#...#.#...#",
      "#.#.###.###.#",
      "#.#.#.......#",
      "###.#####.###",
      "#.......#...#",
      "###.###.###.#",
      "#.#.......#.#",
      "#.#######.#.#",
      "#.........#.#",
      "#############",
    ]);
    const start: Cell = [12, 9];
    const end: Cell = [0, 9];
    Maze.setSeed(0);
    const solutions = new Collision().solve(grid, start, end);
    expect(solutions.length).toBeGreaterThan(0);
    const best = bfsDistance(grid, start, end)!;
    for (const path of solutions) {
      expect(isValidPath(grid, start, end, path)).toBe(true);
      expect(path.length).toBe(best - 1);
    }
  });
});
