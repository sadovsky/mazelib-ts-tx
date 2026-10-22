import { PyError } from "../errors.js";
import { MT19937 } from "./mt19937.js";

/**
 * A port of NumPy's legacy `numpy.random.RandomState` (the parts mazelib
 * uses): `seed(int)` and `shuffle`, bit for bit.
 */
export class NpRandomState {
  private readonly mt = new MT19937();

  constructor(seed?: number) {
    this.seed(seed ?? 0);
  }

  /** `np.random.seed(n)` for an integer `n` in [0, 2**32 - 1]. */
  seed(seed: number | bigint): void {
    const n = BigInt(seed);
    if (n > 0xffffffffn || n < 0n) {
      throw new PyError("ValueError", "Seed must be between 0 and 2**32 - 1");
    }
    this.mt.initGenrand(Number(n));
  }

  /** `random_interval(max)`: a uniform integer in [0, max] by masked rejection. */
  randomInterval(max: number): number {
    if (max === 0) return 0;
    if (max > 0xffffffff) {
      throw new PyError("NotImplementedError", "random_interval above 2**32 - 1 is not supported");
    }
    let mask = max;
    mask |= mask >>> 1;
    mask |= mask >>> 2;
    mask |= mask >>> 4;
    mask |= mask >>> 8;
    mask |= mask >>> 16;
    mask >>>= 0;
    let value: number;
    while ((value = (this.mt.nextUint32() & mask) >>> 0) > max);
    return value;
  }

  /** `shuffle(x)`, in place (both the ndarray and the sequence paths). */
  shuffle<T>(x: T[]): void {
    for (let i = x.length - 1; i > 0; i--) {
      const j = this.randomInterval(i);
      const t = x[i];
      x[i] = x[j];
      x[j] = t;
    }
  }
}
