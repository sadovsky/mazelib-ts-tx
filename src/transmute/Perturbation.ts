import { findAllPassages, fixDisjointPassages, type PassageOps } from "../passages.js";
import { pyRandom } from "../random/index.js";
import { MazeTransmuteAlgo } from "./MazeTransmuteAlgo.js";

export interface PerturbationOptions {
  /** How many rounds of new walls + repair (default 1). */
  repeat?: number;
  /** How many random walls to add per round (default 1). */
  newWalls?: number;
}

/**
 * Perturbation: add a few random walls, then reconnect the maze by opening
 * random walls between disconnected passages. Repeat.
 */
export class Perturbation extends MazeTransmuteAlgo {
  readonly repeat: number;
  readonly newWalls: number;

  constructor(options: PerturbationOptions = {}) {
    super();
    this.repeat = options.repeat ?? 1;
    this.newWalls = options.newWalls ?? 1;
  }

  protected transmuteImpl(): void {
    for (let i = 0; i < this.repeat; i++) {
      for (let j = 0; j < this.newWalls; j++) this.addRandomWall();
      this.reconnectMaze();
    }
  }

  private addRandomWall(): void {
    const g = this.grid;
    const limit = 2 * g.height * g.width;
    let tries = 0;
    for (;;) {
      const row = pyRandom.randrange(1, g.height - 1);
      const col = row % 2 === 0 ? pyRandom.randrange(1, g.width - 1, 2) : pyRandom.randrange(2, g.width - 1, 2);
      if (g.get(row, col) === 0) {
        g.set(row, col, 1);
        return;
      }
      tries += 1;
      // in case every wall in the maze is already filled
      if (tries > limit) return;
    }
  }

  private reconnectMaze(): void {
    const ops: PassageOps = {
      grid: this.grid,
      unblockedNeighbors: (cell) => this.findUnblockedNeighbors(cell),
      openNeighbors: (r, c) => this.findNeighbors(r, c),
    };
    fixDisjointPassages(ops, findAllPassages(ops));
  }
}
