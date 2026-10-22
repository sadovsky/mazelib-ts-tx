import { PyError } from "./errors.js";

/** A maze position: `[row, col]`, 0-based, row 0 at the top. */
export type Cell = [number, number];

/** A 0/1 maze grid (1 = wall), stored row-major in a `Uint8Array`. */
export class Grid {
  readonly height: number;
  readonly width: number;
  readonly data: Uint8Array;

  constructor(height: number, width: number, data?: Uint8Array) {
    if (height < 0 || width < 0) throw new PyError("ValueError", "negative dimensions are not allowed");
    this.height = height;
    this.width = width;
    this.data = data ?? new Uint8Array(height * width);
    if (this.data.length !== height * width) throw new PyError("ValueError", "grid data does not match its shape");
  }

  /** A `height` x `width` grid with every square set to `value`. */
  static filled(height: number, width: number, value: number): Grid {
    const g = new Grid(height, width);
    if (value) g.data.fill(value);
    return g;
  }

  /** Parse rows of `#` (wall) and anything else (open). */
  static fromRows(rows: readonly string[]): Grid {
    const height = rows.length;
    const width = height ? rows[0].length : 0;
    const g = new Grid(height, width);
    rows.forEach((row, r) => {
      if (row.length !== width) throw new PyError("ValueError", "grid rows must all have the same length");
      for (let c = 0; c < width; c++) g.data[r * width + c] = row[c] === "#" ? 1 : 0;
    });
    return g;
  }

  /** Rows of `#` (wall) and `.` (open). */
  toRows(): string[] {
    const rows: string[] = [];
    for (let r = 0; r < this.height; r++) {
      let s = "";
      for (let c = 0; c < this.width; c++) s += this.data[r * this.width + c] ? "#" : ".";
      rows.push(s);
    }
    return rows;
  }

  private index(r: number, c: number): number {
    // Python/NumPy indexing: negative indices count from the end.
    const rr = r < 0 ? r + this.height : r;
    const cc = c < 0 ? c + this.width : c;
    if (rr < 0 || rr >= this.height || cc < 0 || cc >= this.width || !Number.isInteger(rr) || !Number.isInteger(cc)) {
      throw new PyError("IndexError", `index (${r}, ${c}) is out of bounds for grid of shape (${this.height}, ${this.width})`);
    }
    return rr * this.width + cc;
  }

  get(r: number, c: number): number {
    return this.data[this.index(r, c)];
  }

  set(r: number, c: number, value: number): void {
    this.data[this.index(r, c)] = value;
  }

  copy(): Grid {
    return new Grid(this.height, this.width, this.data.slice());
  }

  equals(other: Grid): boolean {
    if (this.height !== other.height || this.width !== other.width) return false;
    for (let i = 0; i < this.data.length; i++) if (this.data[i] !== other.data[i]) return false;
    return true;
  }
}

/** True if two cells are equal (Python tuple `==`). */
export function cellEq(a: Cell | null | undefined, b: Cell | null | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a[0] === b[0] && a[1] === b[1];
}

/** Python `cell in cells`. */
export function cellIn(cell: Cell | null | undefined, cells: readonly (Cell | null)[]): boolean {
  return cellIndex(cell, cells) >= 0;
}

/** Python `cells.index(cell)`, or -1. */
export function cellIndex(cell: Cell | null | undefined, cells: readonly (Cell | null)[], from = 0): number {
  for (let i = from; i < cells.length; i++) if (cellEq(cells[i], cell)) return i;
  return -1;
}

/** The wall square between two cells. */
export function midpoint(a: Cell, b: Cell): Cell {
  return [Math.floor((a[0] + b[0]) / 2), Math.floor((a[1] + b[1]) / 2)];
}

/** Python's `%` (result takes the sign of the divisor). */
export function pymod(a: number, b: number): number {
  const m = a % b;
  return m !== 0 && (m < 0) !== (b < 0) ? m + b : m;
}
