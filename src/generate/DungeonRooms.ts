import { PyError, pyAssert } from "../errors.js";
import { type Cell, Grid, pymod } from "../grid.js";
import { findAllPassages, fixDisjointPassages, type PassageOps } from "../passages.js";
import { pyRandom } from "../random/index.js";
import { MazeGenAlgo } from "./MazeGenAlgo.js";

const RANDOM = 1;
const SERPENTINE = 2;

/** A room: top-left and bottom-right grid coordinates (ideally odd). */
export type Room = readonly [readonly [number, number], readonly [number, number]];

export interface DungeonRoomsOptions {
  /** Rooms to carve out before the maze is grown. Invalid rooms are ignored. */
  rooms?: readonly (readonly (readonly number[])[])[] | null;
  /** A pre-built grid (with rooms); its shape overrides `h` and `w`. */
  grid?: Grid | null;
  /** `"random"` (default) or `"serpentine"`. */
  huntOrder?: string;
}

/** Fetch `seq[i]` with Python's IndexError for a missing element. */
function at(seq: readonly number[], i: number): number {
  const v = seq[i < 0 ? seq.length + i : i];
  if (v === undefined) throw new PyError("IndexError", "tuple index out of range");
  return v;
}

/**
 * The Dungeon Rooms algorithm: Hunt-and-Kill on a grid that has rooms carved
 * out of it, then any disconnected passages are reconnected.
 */
export class DungeonRooms extends MazeGenAlgo {
  grid: Grid | null;
  readonly rooms: DungeonRoomsOptions["rooms"];
  private readonly backupGrid: Grid;
  private readonly huntOrder: number;

  constructor(h0: number, w0: number, options: DungeonRoomsOptions = {}) {
    const { grid = null, rooms = null, huntOrder = "random" } = options;
    // a user-provided grid overrides h & w
    let h: number;
    let w: number;
    let backup: Grid;
    if (grid) {
      h = Math.floor((grid.height - 1) / 2);
      w = Math.floor((grid.width - 1) / 2);
      backup = grid.copy();
    } else {
      h = h0;
      w = w0;
      backup = Grid.filled(2 * h + 1, 2 * w + 1, 1);
    }
    super(h, w);
    this.backupGrid = backup;
    this.grid = grid;
    this.rooms = rooms;
    this.huntOrder = huntOrder.toLowerCase().trim() === "serpentine" ? SERPENTINE : RANDOM;
  }

  generate(): Grid {
    const grid = this.backupGrid.copy();
    this.grid = grid;
    this.carveRooms(grid);

    // select start position for algorithm
    let current = this.chooseStart(grid);
    grid.set(current[0], current[1], 0);

    // perform many random walks, to fill the maze
    let numTrials = 0;
    while (!(current[0] === -1 && current[1] === -1)) {
      this.walk(grid, current);
      current = this.hunt(grid, numTrials);
      numTrials += 1;
    }

    // fix any unconnected wall sections
    this.reconnectMaze(grid);

    return grid;
  }

  private carveRooms(grid: Grid): void {
    if (!this.rooms) return;
    for (const room of this.rooms) {
      try {
        if (room.length !== 2) throw new PyError("ValueError", "a room needs exactly two corners");
        const [topLeft, bottomRight] = room;
        this.carveRoom(grid, topLeft, bottomRight);
        this.carveDoor(grid, topLeft, bottomRight);
      } catch {
        // an invalid room is simply ignored (but any carving already done stays)
      }
    }
  }

  private carveRoom(grid: Grid, topLeft: readonly number[], bottomRight: readonly number[]): void {
    for (let row = at(topLeft, 0); row < at(bottomRight, 0) + 1; row++) {
      for (let col = at(topLeft, 1); col < at(bottomRight, 1) + 1; col++) {
        grid.set(row, col, 0);
      }
    }
  }

  /** Open a single door in a room, unless the room already has a whole wall of doors. */
  private carveDoor(grid: Grid, topLeft: readonly number[], bottomRight: readonly number[]): void {
    if ([...topLeft, ...bottomRight].some((i) => pymod(i, 2) === 0)) return;

    const tl0 = at(topLeft, 0);
    const tl1 = at(topLeft, 1);
    const br0 = at(bottomRight, 0);
    const br1 = at(bottomRight, 1);
    const oddRows: number[] = [];
    for (let i = tl0 - 1; i < br0 + 2; i++) if (pymod(i, 2) === 1) oddRows.push(i);
    const oddCols: number[] = [];
    for (let i = tl1 - 1; i < br1 + 2; i++) if (pymod(i, 2) === 1) oddCols.push(i);

    // possible doors on all sides of the room (the original pairs rows with rows here)
    const doors: Cell[] = [];
    if (tl0 > 2) for (const r of oddRows) doors.push([tl0 - 1, r]);
    if (tl1 > 2) for (const c of oddCols) doors.push([c, tl1 - 1]);
    if (br0 < grid.height - 2) for (const r of oddRows) doors.push([br0 + 1, r]);
    if (br1 < grid.width - 2) for (const c of oddCols) doors.push([c, br1 + 1]);

    const door = pyRandom.choice(doors);
    grid.set(door[0], door[1], 0);
  }

  /** A random walk from a visited cell, until the current cell has no unvisited neighbors. */
  private walk(grid: Grid, start: Cell): void {
    if (grid.get(start[0], start[1]) !== 0) return;
    let current = start;
    let unvisited = this.findNeighbors(current[0], current[1], grid, true);
    while (unvisited.length > 0) {
      const neighbor = pyRandom.choice(unvisited);
      grid.set(neighbor[0], neighbor[1], 0);
      grid.set((neighbor[0] + current[0]) >> 1, (neighbor[1] + current[1]) >> 1, 0);
      current = neighbor;
      unvisited = this.findNeighbors(current[0], current[1], grid, true);
    }
  }

  private hunt(grid: Grid, count: number): Cell {
    return this.huntOrder === SERPENTINE ? this.huntSerpentine(grid) : this.huntRandom(count);
  }

  private huntRandom(count: number): Cell {
    if (count >= this.H * this.W) return [-1, -1];
    return [pyRandom.randrange(1, this.H, 2), pyRandom.randrange(1, this.W, 2)];
  }

  private huntSerpentine(grid: Grid): Cell {
    let row = 1;
    let col = 1;
    for (;;) {
      col += 2;
      if (col > this.W - 2) {
        row += 2;
        col = 1;
        if (row > this.H - 2) return [-1, -1];
      }
      if (grid.get(row, col) === 0 && this.findNeighbors(row, col, grid, true).length > 0) {
        return [row, col];
      }
    }
  }

  /** A random cell that is not already inside a room. */
  private chooseStart(grid: Grid): Cell {
    let current: Cell = [pyRandom.randrange(1, this.H, 2), pyRandom.randrange(1, this.W, 2)];
    const LIMIT = this.H * this.W * 2;
    let numTries = 1;

    // keep looping until you find an unvisited cell
    while (numTries < LIMIT) {
      current = [pyRandom.randrange(1, this.H, 2), pyRandom.randrange(1, this.W, 2)];
      if (grid.get(current[0], current[1]) === 1) break;
      numTries += 1;
    }

    pyAssert(numTries < LIMIT, "The grid input to DungeonRooms was invalid.");
    return current;
  }

  /** If the maze is not fully connected, open up walls until it is. */
  reconnectMaze(grid: Grid = this.grid!): void {
    const ops: PassageOps = {
      grid,
      unblockedNeighbors: ([r, c]) => {
        const ns: Cell[] = [];
        if (r > 1 && !grid.get(r - 1, c) && !grid.get(r - 2, c)) ns.push([r - 2, c]);
        if (r < grid.height - 2 && !grid.get(r + 1, c) && !grid.get(r + 2, c)) ns.push([r + 2, c]);
        if (c > 1 && !grid.get(r, c - 1) && !grid.get(r, c - 2)) ns.push([r, c - 2]);
        if (c < grid.width - 2 && !grid.get(r, c + 1) && !grid.get(r, c + 2)) ns.push([r, c + 2]);
        // this one module shuffles with Python's `random`, not NumPy
        pyRandom.shuffle(ns);
        return ns;
      },
      openNeighbors: (r, c) => this.findNeighbors(r, c, grid, false),
    };
    fixDisjointPassages(ops, findAllPassages(ops));
  }
}
