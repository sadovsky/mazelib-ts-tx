import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PySet, type PyValue, pyHash } from "../src/index.js";

// Recorded from CPython 3.13 by scripts/gen_fixtures.py.
const fixtures = JSON.parse(readFileSync(new URL("./fixtures/pyset.json", import.meta.url), "utf8"));

describe("pyHash matches CPython's hash()", () => {
  for (const [value, hash] of fixtures.hashes) {
    it(JSON.stringify(value), () => expect(pyHash(value).toString()).toBe(hash));
  }
});

describe("PySet iterates in CPython's order", () => {
  it(`${fixtures.sets.length} recorded scenarios`, () => {
    for (const c of fixtures.sets) {
      let s: PySet<PyValue>;
      if (c.kind === "union") s = PySet.from<PyValue>(c.a).union(PySet.from<PyValue>(c.b));
      else if (c.kind === "chain") {
        s = PySet.from<PyValue>(c.lists[0]);
        for (const l of c.lists.slice(1)) s = s.union(PySet.from<PyValue>(l));
      } else s = PySet.from<PyValue>(c.a);
      expect(s.toList()).toEqual(c.out);
      expect(s.size).toBe(c.out.length);
    }
  });

  it("supports membership and intersection tests", () => {
    const a = PySet.from<PyValue>([[1, 1], [1, 3]]);
    const b = PySet.from<PyValue>([[1, 3], [5, 5]]);
    expect(a.has([1, 3])).toBe(true);
    expect(a.has([3, 1])).toBe(false);
    expect(a.intersects(b)).toBe(true);
    expect(a.intersects(PySet.from<PyValue>([[9, 9]]))).toBe(false);
  });
});
