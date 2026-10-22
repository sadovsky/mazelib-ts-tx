/**
 * Emulation of CPython 3.13's `set` iteration order.
 *
 * mazelib turns sets back into lists (`list(set(...))`) and then draws from
 * them or returns them, so the result depends on the order of CPython's
 * open-addressing hash table. This module reproduces that table (probing,
 * resizing and the `set_merge` fast paths from Objects/setobject.c) and
 * CPython's hashes for ints, `None` and tuples (Objects/tupleobject.c).
 * Deletion is not needed by mazelib and is not supported.
 */

/** A Python value that mazelib puts in a set: an int, `None`, or a tuple. */
export type PyValue = number | null | readonly PyValue[];

const MASK64 = (1n << 64n) - 1n;
const XXPRIME_1 = 11400714785074694791n;
const XXPRIME_2 = 14029467366897019727n;
const XXPRIME_5 = 2870177450012600261n;
const MODULUS = (1n << 61n) - 1n;
/** `hash(None)` on 64-bit CPython 3.12+. */
const NONE_HASH = 0xfca86420n;

function hashInt(n: number): bigint {
  // Python reduces ints modulo 2**61 - 1, keeping the sign; -1 becomes -2.
  let h: bigint;
  if (Number.isSafeInteger(n) && Math.abs(n) < 2 ** 52) {
    h = BigInt(n);
  } else {
    const b = BigInt(n);
    h = b < 0n ? -(-b % MODULUS) : b % MODULUS;
  }
  return h === -1n ? -2n : h;
}

/** CPython's `hash(x)` as a signed 64-bit value. */
export function pyHash(x: PyValue): bigint {
  if (x === null) return NONE_HASH;
  if (typeof x === "number") return hashInt(x);
  let acc = XXPRIME_5;
  for (const item of x) {
    const lane = BigInt.asUintN(64, pyHash(item));
    acc = (acc + lane * XXPRIME_2) & MASK64;
    acc = ((acc << 31n) | (acc >> 33n)) & MASK64;
    acc = (acc * XXPRIME_1) & MASK64;
  }
  acc = (acc + (BigInt(x.length) ^ (XXPRIME_5 ^ 3527539n))) & MASK64;
  if (acc === MASK64) return 1546275796n;
  return BigInt.asIntN(64, acc);
}

/** Python `==` on PyValues (structural). */
export function pyEquals(a: PyValue, b: PyValue): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a === "number" || typeof b === "number") return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (!pyEquals(a[i], b[i])) return false;
  return true;
}

const PYSET_MINSIZE = 8;
const LINEAR_PROBES = 9;
const PERTURB_SHIFT = 5n;

/** A set of PyValues whose iteration order matches CPython's. */
export class PySet<T extends PyValue> implements Iterable<T> {
  private keys: (T | undefined)[] = new Array(PYSET_MINSIZE).fill(undefined);
  private hashes: bigint[] = new Array(PYSET_MINSIZE).fill(0n);
  private mask = PYSET_MINSIZE - 1;
  private fill = 0;
  private used = 0;

  /** `set(iterable)` for a non-set iterable (items are added in order). */
  static from<T extends PyValue>(items: Iterable<T>): PySet<T> {
    const s = new PySet<T>();
    for (const item of items) s.add(item);
    return s;
  }

  get size(): number {
    return this.used;
  }

  /** Index of `key` in the table, or -1. */
  private lookup(key: T, hash: bigint): number {
    const mask = this.mask;
    let i = Number(BigInt.asUintN(64, hash) & BigInt(mask));
    let perturb = BigInt.asUintN(64, hash);
    for (;;) {
      let probes = i + LINEAR_PROBES <= mask ? LINEAR_PROBES : 0;
      let j = i;
      do {
        const k = this.keys[j];
        if (k === undefined) return -1;
        if (this.hashes[j] === hash && pyEquals(k, key)) return j;
        j++;
      } while (probes-- > 0);
      perturb >>= PERTURB_SHIFT;
      i = (i * 5 + 1 + Number(perturb & BigInt(mask))) & mask;
    }
  }

  has(key: T): boolean {
    return this.lookup(key, pyHash(key)) >= 0;
  }

  /** `set_add_entry`. */
  add(key: T, hash: bigint = pyHash(key)): void {
    const mask = this.mask;
    let i = Number(BigInt.asUintN(64, hash) & BigInt(mask));
    let perturb = BigInt.asUintN(64, hash);
    for (;;) {
      let probes = i + LINEAR_PROBES <= mask ? LINEAR_PROBES : 0;
      let j = i;
      do {
        const k = this.keys[j];
        if (k === undefined) {
          this.fill++;
          this.used++;
          this.keys[j] = key;
          this.hashes[j] = hash;
          if (this.fill * 5 < mask * 3) return;
          this.resize(this.used > 50000 ? this.used * 2 : this.used * 4);
          return;
        }
        if (this.hashes[j] === hash && pyEquals(k, key)) return;
        j++;
      } while (probes-- > 0);
      perturb >>= PERTURB_SHIFT;
      i = (i * 5 + 1 + Number(perturb & BigInt(mask))) & mask;
    }
  }

  /** `set_insert_clean`: insert a key known to be absent, without resizing. */
  private static insertClean<T>(keys: (T | undefined)[], hashes: bigint[], mask: number, key: T, hash: bigint): void {
    let i = Number(BigInt.asUintN(64, hash) & BigInt(mask));
    let perturb = BigInt.asUintN(64, hash);
    for (;;) {
      if (keys[i] === undefined) {
        keys[i] = key;
        hashes[i] = hash;
        return;
      }
      if (i + LINEAR_PROBES <= mask) {
        for (let j = 1; j <= LINEAR_PROBES; j++) {
          if (keys[i + j] === undefined) {
            keys[i + j] = key;
            hashes[i + j] = hash;
            return;
          }
        }
      }
      perturb >>= PERTURB_SHIFT;
      i = (i * 5 + 1 + Number(perturb & BigInt(mask))) & mask;
    }
  }

  /** `set_table_resize`. */
  private resize(minused: number): void {
    let newsize = PYSET_MINSIZE;
    while (newsize <= minused) newsize *= 2;
    if (newsize === PYSET_MINSIZE && this.keys.length === PYSET_MINSIZE) {
      // Same small table and no dummies: nothing to do.
      return;
    }
    const oldKeys = this.keys;
    const oldHashes = this.hashes;
    const keys: (T | undefined)[] = new Array(newsize).fill(undefined);
    const hashes: bigint[] = new Array(newsize).fill(0n);
    const mask = newsize - 1;
    for (let j = 0; j < oldKeys.length; j++) {
      const k = oldKeys[j];
      if (k !== undefined) PySet.insertClean(keys, hashes, mask, k, oldHashes[j]);
    }
    this.keys = keys;
    this.hashes = hashes;
    this.mask = mask;
    this.fill = this.used;
  }

  /** `set_merge`: add every element of `other`, in `other`'s table order. */
  private merge(other: PySet<T>): void {
    if (other === this || other.used === 0) return;
    if ((this.fill + other.used) * 5 >= this.mask * 3) {
      this.resize((this.used + other.used) * 2);
    }
    if (this.fill === 0 && this.mask === other.mask) {
      // Empty table of the same size and no dummies: copy slot for slot.
      this.keys = other.keys.slice();
      this.hashes = other.hashes.slice();
      this.fill = other.fill;
      this.used = other.used;
      return;
    }
    if (this.fill === 0) {
      this.fill = other.used;
      this.used = other.used;
      for (let j = 0; j <= other.mask; j++) {
        const k = other.keys[j];
        if (k !== undefined) PySet.insertClean(this.keys, this.hashes, this.mask, k, other.hashes[j]);
      }
      return;
    }
    for (let j = 0; j <= other.mask; j++) {
      const k = other.keys[j];
      if (k !== undefined) this.add(k, other.hashes[j]);
    }
  }

  /** `set.copy()`. */
  copy(): PySet<T> {
    const s = new PySet<T>();
    s.merge(this);
    return s;
  }

  /** `self.union(other)`: a copy of self, then other merged in. */
  union(other: PySet<T>): PySet<T> {
    const s = this.copy();
    if (other !== this) s.merge(other);
    return s;
  }

  /** True if the sets share an element (`len(a.intersection(b)) > 0`). */
  intersects(other: PySet<T>): boolean {
    const [small, big] = this.used <= other.used ? [this, other] : [other, this];
    for (const k of small) if (big.has(k)) return true;
    return false;
  }

  *[Symbol.iterator](): Iterator<T> {
    for (let j = 0; j <= this.mask; j++) {
      const k = this.keys[j];
      if (k !== undefined) yield k;
    }
  }

  /** `list(s)`. */
  toList(): T[] {
    return [...this];
  }
}
