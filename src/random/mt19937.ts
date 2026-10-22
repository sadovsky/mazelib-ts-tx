/**
 * The MT19937 Mersenne Twister, as used by both CPython's `random` module and
 * NumPy's legacy `RandomState`. All arithmetic is unsigned 32-bit.
 */
const N = 624;
const M = 397;
const MATRIX_A = 0x9908b0df;
const UPPER_MASK = 0x80000000;
const LOWER_MASK = 0x7fffffff;

export class MT19937 {
  private readonly mt = new Uint32Array(N);
  private mti = N + 1;

  /** `init_genrand`: seed from a single 32-bit word. */
  initGenrand(s: number): void {
    const mt = this.mt;
    mt[0] = s >>> 0;
    for (let i = 1; i < N; i++) {
      const prev = mt[i - 1];
      mt[i] = (Math.imul(1812433253, prev ^ (prev >>> 30)) + i) >>> 0;
    }
    this.mti = N;
  }

  /** `init_by_array`: seed from an array of 32-bit words. */
  initByArray(key: ArrayLike<number>): void {
    const mt = this.mt;
    this.initGenrand(19650218);
    let i = 1;
    let j = 0;
    const keyLength = key.length;
    for (let k = N > keyLength ? N : keyLength; k > 0; k--) {
      const prev = mt[i - 1];
      mt[i] = ((mt[i] ^ Math.imul(prev ^ (prev >>> 30), 1664525)) + key[j] + j) >>> 0;
      i++;
      j++;
      if (i >= N) {
        mt[0] = mt[N - 1];
        i = 1;
      }
      if (j >= keyLength) j = 0;
    }
    for (let k = N - 1; k > 0; k--) {
      const prev = mt[i - 1];
      mt[i] = ((mt[i] ^ Math.imul(prev ^ (prev >>> 30), 1566083941)) - i) >>> 0;
      i++;
      if (i >= N) {
        mt[0] = mt[N - 1];
        i = 1;
      }
    }
    mt[0] = 0x80000000;
    this.mti = N;
  }

  /** `genrand_uint32`: the next 32-bit output. */
  nextUint32(): number {
    const mt = this.mt;
    if (this.mti >= N) {
      if (this.mti === N + 1) this.initGenrand(5489);
      let kk = 0;
      let y: number;
      for (; kk < N - M; kk++) {
        y = (mt[kk] & UPPER_MASK) | (mt[kk + 1] & LOWER_MASK);
        mt[kk] = mt[kk + M] ^ (y >>> 1) ^ (y & 1 ? MATRIX_A : 0);
      }
      for (; kk < N - 1; kk++) {
        y = (mt[kk] & UPPER_MASK) | (mt[kk + 1] & LOWER_MASK);
        mt[kk] = mt[kk + (M - N)] ^ (y >>> 1) ^ (y & 1 ? MATRIX_A : 0);
      }
      y = (mt[N - 1] & UPPER_MASK) | (mt[0] & LOWER_MASK);
      mt[N - 1] = mt[M - 1] ^ (y >>> 1) ^ (y & 1 ? MATRIX_A : 0);
      this.mti = 0;
    }
    let y = mt[this.mti++];
    y ^= y >>> 11;
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= y >>> 18;
    return y >>> 0;
  }
}
