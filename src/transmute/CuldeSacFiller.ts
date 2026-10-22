import { type Cell, cellEq } from "../grid.js";
import { MazeTransmuteAlgo } from "./MazeTransmuteAlgo.js";

/**
 * The Cul-de-sac Filler (really a loop breaker).
 *
 * 1. Find cells with passages in exactly two directions.
 * 2. From each, travel both ways to the first intersection.
 * 3. If both ways reach the same intersection, it's a loop: wall off the cell.
 */
export class CuldeSacFiller extends MazeTransmuteAlgo {
  protected transmuteImpl(): void {
    const g = this.grid;
    for (let r = 1; r < g.height; r += 2) {
      for (let c = 1; c < g.width; c += 2) {
        const cell: Cell = [r, c];
        // don't block off an exit
        if (cellEq(cell, this.start) || cellEq(cell, this.end)) continue;
        if (g.get(r, c) === 1) continue;

        const ns = this.findUnblockedNeighbors(cell);
        if (ns.length !== 2) continue;

        const end1 = this.findNextIntersection(cell, ns[0]);
        const end2 = this.findNextIntersection(cell, ns[1]);
        if (cellEq(end1, end2)) g.set(r, c, 1);
      }
    }
  }

  /** Follow a corridor from `first` through `next` to the next intersection or dead end. */
  private findNextIntersection(first: Cell, next: Cell): Cell {
    let previous = first;
    let current = next;
    let ns = this.findUnblockedNeighbors(current);
    while (ns.length === 2) {
      // travel away from where you came from
      if (cellEq(ns[0], previous)) {
        previous = current;
        current = ns[1];
      } else {
        previous = current;
        current = ns[0];
      }
      // looped without finding any intersection
      if (cellEq(current, first)) return previous;
      ns = this.findUnblockedNeighbors(current);
    }
    return current;
  }
}
