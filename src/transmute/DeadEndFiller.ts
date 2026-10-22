import type { Cell } from "../grid.js";
import { MazeTransmuteAlgo } from "./MazeTransmuteAlgo.js";

export interface DeadEndFillerOptions {
  /** How many passes to make; values <= 0 mean 100 (default 1). */
  iterations?: number;
}

/**
 * The Dead-End Filler: fill in every dead end, and the dead-end corridors
 * behind it. Repeated passes on a perfect maze leave only the solution open.
 */
export class DeadEndFiller extends MazeTransmuteAlgo {
  readonly iterations: number;

  constructor(options: DeadEndFillerOptions = {}) {
    super();
    const iterations = options.iterations ?? 1;
    this.iterations = iterations > 0 ? Math.trunc(iterations) : 100;
  }

  protected transmuteImpl(): void {
    const g = this.grid;
    const start = this.start!;
    const end = this.end!;
    // make sure we don't block off the entrances
    const startSave = g.get(start[0], start[1]);
    g.set(start[0], start[1], 0);
    const endSave = g.get(end[0], end[1]);
    g.set(end[0], end[1], 0);

    let found = true;
    let i = 0;
    while (found && i < this.iterations) {
      i += 1;
      found = this.fillDeadEnds();
    }

    g.set(start[0], start[1], startSave);
    g.set(end[0], end[1], endSave);
  }

  private fillDeadEnds(): boolean {
    let deadEnd = this.findDeadEnd();
    let found = false;
    while (!(deadEnd[0] === -1 && deadEnd[1] === -1)) {
      found = true;
      this.fillDeadEnd(deadEnd);
      // from the dead end, travel one cell
      const ns = this.findUnblockedNeighbors(deadEnd);
      if (ns.length === 0) break;
      // if the next cell is a dead end too, keep going from there
      if (ns.length === 1 && this.isDeadEnd(ns[0])) {
        deadEnd = ns[0];
        continue;
      }
      deadEnd = this.findDeadEnd();
    }
    return found;
  }

  private fillDeadEnd([r, c]: Cell): void {
    const g = this.grid;
    g.set(r, c, 1);
    g.set(r - 1, c, 1);
    g.set(r + 1, c, 1);
    g.set(r, c - 1, 1);
    g.set(r, c + 1, 1);
  }

  /** The first dead end in reading order (not next to an entrance), or [-1, -1]. */
  private findDeadEnd(): Cell {
    const g = this.grid;
    for (let r = 1; r < g.height; r += 2) {
      for (let c = 1; c < g.width; c += 2) {
        const cell: Cell = [r, c];
        if (this.withinOne(cell, this.start) || this.withinOne(cell, this.end)) continue;
        if (this.isDeadEnd(cell)) return cell;
      }
    }
    return [-1, -1];
  }

  /** An open cell with zero or one open neighbors. */
  private isDeadEnd(cell: Cell): boolean {
    const ns = this.findUnblockedNeighbors(cell);
    if (this.grid.get(cell[0], cell[1]) === 1) return false;
    return ns.length < 2;
  }
}
