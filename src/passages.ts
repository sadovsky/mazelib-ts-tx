import { type Cell, type Grid, midpoint } from "./grid.js";
import { PySet } from "./pyset.js";
import { pyRandom } from "./random/index.js";

/**
 * Shared "reconnect the maze" logic used by DungeonRooms and Perturbation.
 * Passages are CPython-ordered sets, because the original draws a random cell
 * from `list(passage)`.
 */
export interface PassageOps {
  grid: Grid;
  /** Open cells reachable in one move (NumPy-shuffled). */
  unblockedNeighbors(cell: Cell): Cell[];
  /** Open cells two squares away, ignoring walls in between (NumPy-shuffled). */
  openNeighbors(r: number, c: number): Cell[];
}

/** Group every cell into connected passages. Disjoint passages end up in different sets. */
export function findAllPassages(ops: PassageOps): PySet<Cell>[] {
  const passages: PySet<Cell>[] = [];
  const { height, width } = ops.grid;

  for (let r = 1; r < height; r += 2) {
    for (let c = 1; c < width; c += 2) {
      const ns = ops.unblockedNeighbors([r, c]);
      ns.push([r, c]);
      const current = PySet.from(ns);

      // determine which passage the current neighbors belong in
      let found = false;
      for (let i = 0; i < passages.length; i++) {
        if (current.intersects(passages[i])) {
          passages[i] = passages[i].union(current);
          found = true;
          break;
        }
      }

      // the current neighbors might be a disjoint set
      if (!found) passages.push(current);
    }
  }

  return joinIntersectingSets(passages);
}

/** Merge sets that share an element. */
export function joinIntersectingSets(sets: PySet<Cell>[]): PySet<Cell>[] {
  const list: (PySet<Cell> | null)[] = sets.slice();
  for (let i = 0; i < list.length - 1; i++) {
    if (list[i] === null) continue;
    for (let j = i + 1; j < list.length; j++) {
      const sj = list[j];
      if (sj === null) continue;
      if (list[i]!.intersects(sj)) {
        list[i] = list[i]!.union(sj);
        list[j] = null;
      }
    }
  }
  return list.filter((s): s is PySet<Cell> => s !== null);
}

/** Knock down walls until every passage is connected to the first one. */
export function fixDisjointPassages(ops: PassageOps, disjoint: PySet<Cell>[]): void {
  while (disjoint.length > 1) {
    let found = false;
    while (!found) {
      // randomly select a cell in the first passage
      const cell = pyRandom.choice(disjoint[0].toList());
      const neighbors = ops.openNeighbors(cell[0], cell[1]);
      // does that cell have a neighbor in any other passage?
      for (let p = 1; p < disjoint.length; p++) {
        const passage = disjoint[p];
        const intersect = neighbors.filter((n) => passage.has(n));
        if (intersect.length > 0) {
          // remove the dividing wall, and combine the two passages
          const mid = midpoint(intersect[0], cell);
          ops.grid.set(mid[0], mid[1], 0);
          disjoint[0] = disjoint[0].union(passage);
          disjoint.splice(p, 1);
          found = true;
          break;
        }
      }
    }
  }
}
