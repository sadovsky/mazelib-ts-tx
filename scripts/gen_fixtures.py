#!/usr/bin/env python3
"""Record RNG and set-order fixtures from CPython 3.13 + NumPy for the unit tests.

Usage: python3 scripts/gen_fixtures.py  (writes test/fixtures/*.json)
"""
import json
import os
import random

import numpy as np

OUT = os.path.join(os.path.dirname(__file__), "..", "test", "fixtures")

rng = []
for seed in [0, 1, 7, 42, 2**31 - 1, 2**32 - 1, 2**32 + 5, 2**40 + 3, -99]:
    random.seed(seed)
    entry = {"seed": seed}
    entry["random"] = [random.random() for _ in range(5)]
    entry["getrandbits"] = [[k, str(random.getrandbits(k))] for k in (1, 7, 31, 32, 33, 53, 64, 100)]
    entry["randrange"] = [[a, b, s, random.randrange(a, b, s)] for (a, b, s) in
                          [(0, 10, 1), (1, 11, 2), (0, 2**40, 1), (-5, 5, 3), (10, 0, -2), (0, 2**32, 1), (0, 2**33 + 1, 1)]]
    x = list(range(20))
    random.shuffle(x)
    entry["shuffle20"] = x
    entry["choice"] = [random.choice(range(n)) for n in (1, 2, 3, 100)]
    if 0 <= seed < 2**32:
        np.random.seed(seed)
        y = np.arange(40)
        np.random.shuffle(y)
        entry["np_shuffle40"] = [int(v) for v in y]
        z = list(range(1000))
        np.random.shuffle(z)
        entry["np_shuffle1000_head"] = z[:20]
    rng.append(entry)

random.seed(2024)
sets = []
for _ in range(150):
    kind = random.choice(["list", "union", "nested", "chain"])
    cell = lambda: (random.randrange(0, 40), random.randrange(0, 40))  # noqa: E731
    if kind == "list":
        a = [cell() for _ in range(random.randint(0, 100))]
        sets.append({"kind": kind, "a": a, "out": list(set(a))})
    elif kind == "union":
        a = [cell() for _ in range(random.randint(0, 60))]
        b = [cell() for _ in range(random.randint(0, 60))]
        sets.append({"kind": kind, "a": a, "b": b, "out": list(set(a).union(set(b)))})
    elif kind == "nested":
        a = [tuple(cell() for _ in range(random.randint(0, 8))) for _ in range(random.randint(0, 40))]
        sets.append({"kind": kind, "a": a, "out": list(set(a))})
    else:
        lists = [[cell() for _ in range(random.randint(1, 6))] for _ in range(random.randint(1, 25))]
        acc = set(lists[0])
        for li in lists[1:]:
            acc = acc.union(set(li))
        sets.append({"kind": kind, "lists": lists, "out": list(acc)})



def to_tuple(v):
    return tuple(to_tuple(x) for x in v) if isinstance(v, list) else v


hashes = [[v, str(hash(to_tuple(v)))] for v in
          [0, 1, -1, -2, 2**40, None, [], [1, 2], [-1, -1], [[1, 2], [3, 4]], [None, 3]]]

with open(os.path.join(OUT, "rng.json"), "w") as f:
    json.dump(rng, f)
with open(os.path.join(OUT, "pyset.json"), "w") as f:
    json.dump({"sets": sets, "hashes": hashes}, f)
