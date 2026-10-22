import { PyError } from "../errors.js";
import { MT19937 } from "./mt19937.js";

const TWO_32 = 4294967296;

function bitLengthBig(n: bigint): number {
  return n === 0n ? 0 : n.toString(2).length;
}

function assertInt(x: number, what: string): void {
  if (!Number.isSafeInteger(x)) {
    throw new PyError("TypeError", `${what} must be an integer, got ${x}`);
  }
}

/**
 * A port of CPython 3.13's `random.Random` (the parts mazelib uses), bit for
 * bit: MT19937 core, `getrandbits`-based `_randbelow`, and 53-bit `random()`.
 */
export class PyRandom {
  private readonly mt = new MT19937();

  constructor(seed?: number | bigint) {
    this.seed(seed ?? 0);
  }

  /** `random.seed(n)` for an integer `n` (the absolute value is used). */
  seed(seed: number | bigint): void {
    let n = BigInt(seed);
    if (n < 0n) n = -n;
    const key: number[] = [];
    while (n > 0n) {
      key.push(Number(n & 0xffffffffn));
      n >>= 32n;
    }
    if (key.length === 0) key.push(0);
    this.mt.initByArray(key);
  }

  /** A float in [0, 1) with 53 bits of randomness. */
  random(): number {
    const a = this.mt.nextUint32() >>> 5;
    const b = this.mt.nextUint32() >>> 6;
    return (a * 67108864 + b) / 9007199254740992;
  }

  /** `getrandbits(k)` for k <= 32, as a number. */
  private getrandbits32(k: number): number {
    if (k === 0) return 0;
    return this.mt.nextUint32() >>> (32 - k);
  }

  /** `getrandbits(k)` for any k >= 0. */
  getrandbits(k: number): bigint {
    if (k < 0) throw new PyError("ValueError", "number of bits must be non-negative");
    if (k <= 32) return BigInt(this.getrandbits32(k));
    // Fill 32-bit words from least significant to most significant.
    let result = 0n;
    let shift = 0n;
    for (let left = k; left > 0; left -= 32) {
      let r = this.mt.nextUint32();
      if (left < 32) r >>>= 32 - left;
      result |= BigInt(r) << shift;
      shift += 32n;
    }
    return result;
  }

  /** `_randbelow(n)`: a uniform integer in [0, n), n > 0. */
  randbelow(n: number): number {
    if (n < TWO_32) {
      const k = 32 - Math.clz32(n);
      let r = this.getrandbits32(k);
      while (r >= n) r = this.getrandbits32(k);
      return r;
    }
    return Number(this.randbelowBig(BigInt(n)));
  }

  private randbelowBig(n: bigint): bigint {
    const k = bitLengthBig(n);
    let r = this.getrandbits(k);
    while (r >= n) r = this.getrandbits(k);
    return r;
  }

  /** `randrange(stop)` / `randrange(start, stop[, step])`. */
  randrange(start: number, stop?: number, step = 1): number {
    assertInt(start, "start");
    if (stop === undefined) {
      if (step !== 1) throw new PyError("TypeError", "Missing a non-None stop argument");
      if (start > 0) return this.randbelow(start);
      throw new PyError("ValueError", "empty range for randrange()");
    }
    assertInt(stop, "stop");
    assertInt(step, "step");
    const width = stop - start;
    if (step === 1) {
      if (width > 0) return start + this.randbelow(width);
      throw new PyError("ValueError", `empty range in randrange(${start}, ${stop})`);
    }
    let n: number;
    if (step > 0) n = Math.floor((width + step - 1) / step);
    else if (step < 0) n = Math.floor((width + step + 1) / step);
    else throw new PyError("ValueError", "zero step for randrange()");
    if (n <= 0) throw new PyError("ValueError", `empty range in randrange(${start}, ${stop}, ${step})`);
    return start + step * this.randbelow(n);
  }

  /** `randint(a, b)`: an integer in [a, b]. */
  randint(a: number, b: number): number {
    return this.randrange(a, b + 1);
  }

  /** `choice(seq)`. */
  choice<T>(seq: readonly T[]): T {
    if (seq.length === 0) throw new PyError("IndexError", "Cannot choose from an empty sequence");
    return seq[this.randbelow(seq.length)];
  }

  /** `shuffle(x)`, in place. */
  shuffle<T>(x: T[]): void {
    for (let i = x.length - 1; i > 0; i--) {
      const j = this.randbelow(i + 1);
      const t = x[i];
      x[i] = x[j];
      x[j] = t;
    }
  }
}
