# Feature inventory and parity matrix

Source: john-science/mazelib@56cd88294a36746bbd324c2c9f7e4ab26095deb3 · Target: TypeScript (Node 22, ESM, zero deps) · Mode: transpile

Status: `todo` → `spec` → `building` → `verified@Lx` (or `deviates` with a note).

| # | Module / feature | Public surface | Depends on | Level | Status | Level reached | Deviations |
|---|---|---|---|---|---|---|---|
| 1 | Python `random` (MT19937) | `PyRandom`: `seed`, `random`, `getrandbits`, `randrange`, `randint`, `choice`, `shuffle` | — | L2 | verified@L2 | L2 (exact) |  |
| 2 | NumPy legacy `RandomState` | `NpRandomState`: `seed`, `shuffle` | — | L2 | verified@L2 | L2 (exact) |  |
| 3 | CPython set / tuple hash emulation | `PySet` (insertion, union, iteration order) | — | L2 | verified@L2 | L2 (exact, via dependents) |  |
| 4 | Grid | `Grid` (Uint8Array, row-major) | — | L2 | verified@L2 | L2 (exact, via dependents) |  |
| 5 | MazeGenAlgo base | `findNeighbors` | 2, 4 | L2 | verified@L2 | L2 (exact, via dependents) |  |
| 6 | AldousBroder | generator | 1, 5 | L2 | verified@L2 | L2 (exact) |  |
| 7 | BacktrackingGenerator | generator | 1, 5 | L2 | verified@L2 | L2 (exact) |  |
| 8 | BinaryTree | generator (`skew`) | 1, 5 | L2 | verified@L2 | L2 (exact) |  |
| 9 | CellularAutomaton | generator (`complexity`, `density`) | 1, 5 | L2 | verified@L2 | L2 (exact) |  |
| 10 | Division | generator | 1, 5 | L2 | verified@L2 | L2 (exact) |  |
| 11 | DungeonRooms | generator (`rooms`, `grid`, `huntOrder`) | 1, 3, 5 | L2 | verified@L2 | L2 (exact) |  |
| 12 | Ellers | generator (`xskew`, `yskew`) | 1, 5 | L2 | verified@L2 | L2 (exact; invariant on known bugs) | Returns a maze where the original raises OverflowError (int8 set ids); 8 known-bug cases checked by invariants. |
| 13 | GrowingTree | generator (`backtrackChance`) | 1, 5 | L2 | verified@L2 | L2 (exact) |  |
| 14 | HuntAndKill | generator (`huntOrder`) | 1, 5 | L2 | verified@L2 | L2 (exact) |  |
| 15 | Kruskal | generator | 2, 5 | L2 | verified@L2 | L2 (exact) |  |
| 16 | Prims | generator | 1, 3, 5 | L2 | verified@L2 | L2 (exact) |  |
| 17 | Sidewinder | generator (`skew`) | 1, 5 | L2 | verified@L2 | L2 (exact) |  |
| 18 | TrivialMaze | generator (`mazeType`) | 1, 5 | L2 | verified@L2 | L2 (exact) |  |
| 19 | Wilsons | generator (`huntOrder`) | 1, 5 | L2 | verified@L2 | L2 (exact) |  |
| 20 | MazeSolveAlgo base | `solve`, `pruneSolutions`, helpers | 2, 4 | L2 | verified@L2 | L2 (exact, via dependents) |  |
| 21 | BacktrackingSolver | solver | 1, 20 | L2 | verified@L2 | L2 (exact) |  |
| 22 | Chain | solver (`turn`) | 1, 20 | L2 | verified@L2 | L2 (exact) |  |
| 23 | Collision | solver | 20 | L2 | verified@L2 | L2 (exact; invariant on known bugs) | Original crashes (TypeError) whenever robots meet; port switches to a merging flood there. 12 known-bug cases checked by invariants. |
| 24 | RandomMouse | solver | 1, 20 | L2 | verified@L2 | L2 (exact) |  |
| 25 | ShortestPath | solver | 3, 20 | L2 | verified@L2 | L2 (exact) |  |
| 26 | ShortestPaths | solver | 3, 20 | L2 | verified@L2 | L2 (exact) |  |
| 27 | Tremaux | solver | 1, 20 | L2 | verified@L2 | L2 (exact) |  |
| 28 | MazeTransmuteAlgo base | helpers | 2, 4 | L2 | verified@L2 | L2 (exact, via dependents) |  |
| 29 | CuldeSacFiller | transmuter | 28 | L2 | verified@L2 | L2 (exact) |  |
| 30 | DeadEndFiller | transmuter (`iterations`) | 28 | L2 | verified@L2 | L2 (exact) |  |
| 31 | Perturbation | transmuter (`repeat`, `newWalls`) | 1, 3, 28 | L2 | verified@L2 | L2 (exact) |  |
| 32 | Maze facade | `Maze`: `setSeed`, `generate`, `generateEntrances`, `generateMonteCarlo`, `transmute`, `solve`, `toString` | all | L2 | verified@L2 | L2 (exact) |  |
| 33 | Adapter | `adapter/adapter.ts` (goldens PROTOCOL.md) | 32 | L2 | verified@L2 | L2 (exact) |  |

## Cross-cutting decisions
| Concern | Source behavior | Target strategy |
|---|---|---|
| Randomness / RNG | Module-global `random` (MT19937, `getrandbits`-based `_randbelow`) and NumPy legacy global `RandomState` (MT19937, `random_interval` masked rejection for `shuffle`). Both seeded by `Maze.set_seed`. | Port both bit for bit as two module-global streams (`pyRandom`, `npRandom`), same call order as the original. `getrandbits(k>32)` and `randrange` widths above 2^32 use BigInt. |
| Set / dict iteration order | `list(set(...))` in Prims, `choice(list(set))` in DungeonRooms/Perturbation, `set(map(tuple, sols))` in ShortestPath(s) feed RNG draws or output order. Order depends on CPython's open-addressing set table and tuple hash (xxHash-based, 64-bit). | Emulate CPython 3.13 `setobject.c` (linear probes = 9, perturb shift 5, resize rules, `set_merge` fast paths) and `tuplehash` with BigInt. Dicts are insertion-ordered → JS `Map` with string keys. |
| Numeric types | Python unbounded ints; grids are `int8`; Ellers' set ids are `int8` and overflow (OverflowError) past 127. | Plain JS numbers (all values small). Ellers uses `Int32Array` set ids, so it returns a valid maze where the original crashes (known bug). |
| Errors | Python exceptions (`AssertionError`, `ValueError`, `IndexError`, `TypeError`). | `PyError` subclass carrying the Python class name as `kind`; adapter reports it. |
| I/O, time, concurrency | None (pure computation). | — |

## Source tests (L1)
| Source test | Target test | Status |
|---|---|---|
| test/test_generators.py | test/generators.test.ts (21 tests) | pass |
| test/test_solvers.py | test/solvers.test.ts (8 tests) | pass |
| test/test_transmuters.py | test/transmuters.test.ts (3 tests) | pass |
| test/test_maze.py | test/maze.test.ts (9 tests) | pass |
| — (new) | test/rng.test.ts, test/pyset.test.ts (fixtures from CPython 3.13 / NumPy 2.5) | pass |
| — (new) | test/known-bugs.test.ts | pass |
