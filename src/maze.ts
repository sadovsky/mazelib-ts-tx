import { PyError, pyAssert } from "./errors.js";
import type { MazeGenAlgo } from "./generate/MazeGenAlgo.js";
import type { Cell, Grid } from "./grid.js";
import { pyRandom, setSeed } from "./random/index.js";
import type { MazeSolveAlgo, Solution } from "./solve/MazeSolveAlgo.js";
import type { MazeTransmuteAlgo } from "./transmute/MazeTransmuteAlgo.js";

interface Candidate {
  grid: Grid;
  start: Cell;
  end: Cell;
  solutions: Solution[];
}

/**
 * A rectangular 2D maze: the grid, the algorithms that generate, transmute
 * and solve it, its entrances, and its solutions.
 */
export class Maze {
  generator: MazeGenAlgo | null = null;
  grid: Grid | null = null;
  start: Cell | null = null;
  end: Cell | null = null;
  transmuters: MazeTransmuteAlgo[] = [];
  solver: MazeSolveAlgo | null = null;
  solutions: Solution[] | null = null;
  /** Prune solutions after solving (default true). */
  prune = true;

  constructor(seed: number | bigint | null = null) {
    Maze.setSeed(seed);
  }

  /**
   * Seed the two global random streams (Python-`random`-compatible and
   * NumPy-legacy-compatible) that every algorithm draws from.
   */
  static setSeed(seed: number | bigint | null | undefined): void {
    setSeed(seed);
  }

  /** Generate a new grid, and clear the entrances and solutions. */
  generate(): void {
    pyAssert(this.generator !== null, "No maze-generation algorithm has been set.");
    this.grid = this.generator.generate();
    this.start = null;
    this.end = null;
    this.solutions = null;
  }

  /** Pick entrances, on the outer walls or inside the maze. */
  generateEntrances(startOuter = true, endOuter = true): void {
    for (;;) {
      if (startOuter && endOuter) {
        this.generateOuterEntrances();
      } else if (!startOuter && !endOuter) {
        this.generateInnerEntrances();
      } else if (startOuter) {
        [this.start, this.end] = this.generateOppositeEntrances();
      } else {
        [this.end, this.start] = this.generateOppositeEntrances();
      }

      // the start and end shouldn't be right next to each other
      const [s, e] = [this.start!, this.end!];
      if (Math.abs(s[0] - e[0]) + Math.abs(s[1] - e[1]) >= 2) return;
    }
  }

  private shape(): [number, number] {
    pyAssert(this.grid !== null, "No maze grid has been set.");
    return [this.grid.height, this.grid.width];
  }

  private generateOuterEntrances(): void {
    const [H, W] = this.shape();
    const side = pyRandom.randrange(4);

    // the entrances are on opposite sides of the maze
    if (side === 0) {
      this.start = [0, pyRandom.randrange(1, W, 2)]; // North
      this.end = [H - 1, pyRandom.randrange(1, W, 2)];
    } else if (side === 1) {
      this.start = [H - 1, pyRandom.randrange(1, W, 2)]; // South
      this.end = [0, pyRandom.randrange(1, W, 2)];
    } else if (side === 2) {
      this.start = [pyRandom.randrange(1, H, 2), 0]; // West
      this.end = [pyRandom.randrange(1, H, 2), W - 1];
    } else {
      this.start = [pyRandom.randrange(1, H, 2), W - 1]; // East
      this.end = [pyRandom.randrange(1, H, 2), 0];
    }
  }

  private generateInnerEntrances(): void {
    const [H, W] = this.shape();
    const start: Cell = [pyRandom.randrange(1, H, 2), pyRandom.randrange(1, W, 2)];
    this.start = start;
    let end: Cell = [pyRandom.randrange(1, H, 2), pyRandom.randrange(1, W, 2)];
    // the start and end can't be the same
    while (end[0] === start[0] && end[1] === start[1]) {
      end = [pyRandom.randrange(1, H, 2), pyRandom.randrange(1, W, 2)];
    }
    this.end = end;
  }

  /** One entrance on an outer wall, one inside the maze. */
  private generateOppositeEntrances(): [Cell, Cell] {
    const [H, W] = this.shape();
    const side = pyRandom.randrange(4);
    let first: Cell;
    if (side === 0) first = [0, pyRandom.randrange(1, W, 2)];
    else if (side === 1) first = [H - 1, pyRandom.randrange(1, W, 2)];
    else if (side === 2) first = [pyRandom.randrange(1, H, 2), 0];
    else first = [pyRandom.randrange(1, H, 2), W - 1];
    const second: Cell = [pyRandom.randrange(1, H, 2), pyRandom.randrange(1, W, 2)];
    return [first, second];
  }

  /**
   * Monte Carlo generation of a maze of a chosen difficulty: generate `repeat`
   * mazes, keep the entrances (of `entrances` tries) with the most solutions,
   * order the mazes by `reducer` of their first solution, and pick the one at
   * `difficulty` (0 = easiest, 1 = hardest).
   */
  generateMonteCarlo(
    repeat: number,
    entrances = 3,
    difficulty = 1.0,
    reducer: (solution: Solution) => number = (s) => s.length,
  ): void {
    pyAssert(difficulty >= 0.0 && difficulty <= 1.0, "Maze difficulty must be between 0 to 1.");

    let mazes: Candidate[] = [];
    for (let i = 0; i < repeat; i++) {
      this.generate();
      const thisMaze: Candidate[] = [];

      // for each maze, try different entrances, and solve
      for (let j = 0; j < entrances; j++) {
        this.generateEntrances();
        this.solve();
        thisMaze.push({ grid: this.grid!, start: this.start!, end: this.end!, solutions: this.solutions! });
      }

      // keep the entrances with the most solutions (the first, on ties)
      if (thisMaze.length === 0) throw new PyError("ValueError", "max() iterable argument is empty");
      let best = thisMaze[0];
      for (const m of thisMaze) if (m.solutions.length > best.solutions.length) best = m;
      mazes.push(best);
    }

    // sort the mazes by their first solution (stable)
    const keys = new Map(mazes.map((m) => [m, reducer(firstSolution(m))]));
    mazes = mazes.slice().sort((a, b) => keys.get(a)! - keys.get(b)!);

    // pick the maze of the requested difficulty
    const chosen = mazes[Math.trunc((mazes.length - 1) * difficulty)];
    if (chosen === undefined) throw new PyError("IndexError", "list index out of range");
    this.grid = chosen.grid;
    this.start = chosen.start;
    this.end = chosen.end;
    this.solutions = chosen.solutions;
  }

  /** Run every transmuter over the grid, in order. */
  transmute(): void {
    pyAssert(this.grid !== null, "No maze grid yet exists to transmute.");
    for (const t of this.transmuters) t.transmute(this.grid, this.start, this.end);
  }

  /** Solve the maze, pruning the solutions if `prune` is set. */
  solve(): void {
    pyAssert(this.solver !== null, "No maze-solving algorithm has been set.");
    pyAssert(this.start !== null && this.end !== null, "Start and end times must be set first.");
    pyAssert(this.grid !== null, "Maze grid is not set.");
    this.solutions = this.solver.solve(this.grid, this.start, this.end);
    if (this.prune) this.solutions = this.solver.pruneSolutions(this.solutions);
  }

  /**
   * Render the maze as text: `#` for walls, spaces for passages, plus `S`/`E`
   * at the entrances and `+` along the first solution, when asked for and set.
   */
  render(entrances = false, solutions = false): string {
    if (this.grid === null) return "";
    const g = this.grid;
    const rows: string[] = [];
    for (let r = 0; r < g.height; r++) {
      let s = "";
      for (let c = 0; c < g.width; c++) s += g.get(r, c) ? "#" : " ";
      rows.push(s);
    }

    const put = ([r, c]: Cell, ch: string): void => {
      const i = r < 0 ? r + rows.length : r;
      if (i < 0 || i >= rows.length) throw new RangeError(`row ${r} is outside the maze`);
      rows[i] = rows[i].slice(0, c) + ch + rows[i].slice(c + 1);
    };

    if (entrances && this.start && this.end) {
      put(this.start, "S");
      put(this.end, "E");
    }
    if (solutions && this.solutions && this.solutions.length > 0) {
      for (const cell of this.solutions[0]) put(cell, "+");
    }

    return rows.join("\n");
  }

  /** The maze with its entrances and first solution (Python's `str(maze)`). */
  toString(): string {
    return this.render(true, true);
  }
}

function firstSolution(m: Candidate): Solution {
  if (m.solutions.length === 0) throw new PyError("IndexError", "list index out of range");
  return m.solutions[0];
}
