import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NpRandomState, PyRandom } from "../src/index.js";

// Recorded from CPython 3.13 and NumPy 2.x by scripts/gen_fixtures.py.
const fixtures = JSON.parse(readFileSync(new URL("./fixtures/rng.json", import.meta.url), "utf8"));

describe("PyRandom matches CPython's random", () => {
  for (const f of fixtures) {
    it(`seed ${f.seed}`, () => {
      const r = new PyRandom(BigInt(f.seed));
      expect([...Array(5)].map(() => r.random())).toEqual(f.random);
      for (const [k, v] of f.getrandbits) expect(r.getrandbits(k).toString()).toBe(v);
      for (const [a, b, s, v] of f.randrange) expect(r.randrange(a, b, s)).toBe(v);
      const x = [...Array(20).keys()];
      r.shuffle(x);
      expect(x).toEqual(f.shuffle20);
      expect([1, 2, 3, 100].map((n) => r.choice([...Array(n).keys()]))).toEqual(f.choice);
    });
  }

  it("raises Python's errors", () => {
    const r = new PyRandom(0);
    expect(() => r.randrange(0)).toThrow(expect.objectContaining({ kind: "ValueError" }));
    expect(() => r.randrange(5, 5)).toThrow(expect.objectContaining({ kind: "ValueError" }));
    expect(() => r.randrange(0, 10, 0)).toThrow(expect.objectContaining({ kind: "ValueError" }));
    expect(() => r.choice([])).toThrow(expect.objectContaining({ kind: "IndexError" }));
  });
});

describe("NpRandomState matches NumPy's legacy RandomState", () => {
  for (const f of fixtures.filter((f: { np_shuffle40?: number[] }) => f.np_shuffle40)) {
    it(`seed ${f.seed}`, () => {
      const r = new NpRandomState(f.seed);
      const y = [...Array(40).keys()];
      r.shuffle(y);
      expect(y).toEqual(f.np_shuffle40);
      const z = [...Array(1000).keys()];
      r.shuffle(z);
      expect(z.slice(0, 20)).toEqual(f.np_shuffle1000_head);
    });
  }

  it("rejects seeds outside [0, 2**32 - 1]", () => {
    expect(() => new NpRandomState(-1)).toThrow(expect.objectContaining({ kind: "ValueError" }));
    expect(() => new NpRandomState(2 ** 32)).toThrow(expect.objectContaining({ kind: "ValueError" }));
  });
});
