# Mapping: mazelib (Python) → mazelib-ts-tx (TypeScript)

The public API table is in the README. This file records the internal mapping and the semantic gaps that mattered for exact parity.

## Modules
| Python | TypeScript |
|---|---|
| `random` (module global, `from random import choice, randrange, random, shuffle, randint`) | `src/random/pyrandom.ts` `PyRandom`; global `pyRandom` in `src/random/index.ts` |
| `numpy.random` legacy global (`from numpy.random import shuffle`, `np.random.seed`) | `src/random/nprandom.ts` `NpRandomState`; global `npRandom` |
| MT19937 (both of the above) | `src/random/mt19937.ts` |
| `set` / `frozenset` order, `hash(tuple)` | `src/pyset.ts` `PySet`, `pyHash` |
| `np.empty((H, W), dtype=np.int8)` grids | `src/grid.ts` `Grid` (Uint8Array, NumPy-style negative indices, IndexError) |
| `mazelib/mazelib.py` `Maze` | `src/maze.ts` `Maze` (`tostring` → `render`, `__str__` → `toString`) |
| `mazelib/generate/*.py` | `src/generate/*.ts` (`_find_neighbors` → `findNeighbors`) |
| `DungeonRooms`/`Perturbation` `_find_all_passages`, `_join_intersecting_sets`, `_fix_disjoint_passages` | `src/passages.ts` (shared) |
| `mazelib/solve/*.py` | `src/solve/*.ts` (`_solve` → `solveImpl`, `prune_solutions` → `pruneSolutions`) |
| `mazelib/transmute/*.py` | `src/transmute/*.ts` (`_transmute` → `transmuteImpl`) |
| Python exception classes | `PyError` with `kind` (`src/errors.ts`), `assert` → `pyAssert` |
| goldens `adapters/python_original.py` | `adapter/run.ts` (+ `adapter/adapter.ts` stdio loop) |

## Semantic gaps and how they were closed
| Gap | Where | Resolution |
|---|---|---|
| Which RNG a module uses | every algorithm | Followed each file's imports exactly. `_find_neighbors`/`_find_unblocked_neighbors` shuffle with NumPy, **except** `DungeonRooms._find_unblocked_neighbors`, which imports `shuffle` from `random`. Kruskal shuffles edges with NumPy. |
| `_randbelow` is `getrandbits`-based (k = n.bit_length()) | `randrange`, `choice`, `shuffle` | Ported; widths ≥ 2^32 use BigInt `getrandbits` with little-endian 32-bit words. |
| `random.seed(int)` uses `init_by_array(abs(n))`; `np.random.seed` uses `init_genrand` and rejects seeds outside [0, 2^32-1] | `Maze.set_seed` | Ported; Python stream is seeded before NumPy raises `ValueError`. |
| NumPy legacy `shuffle` = `random_interval` (masked rejection on 32-bit draws), same for lists and 1-d arrays | everywhere | Ported. |
| `list(set(...))` order | Prims frontier, DungeonRooms/Perturbation `choice(list(passage))`, ShortestPath(s) dedupe | `PySet`: CPython 3.13 table (LINEAR_PROBES 9, PERTURB_SHIFT 5, fill*5 ≥ mask*3 → resize to used*4, `set_merge` fast paths for `union`/`copy`) and xxHash-based `tuplehash`, `hash(None)` constant. |
| Python `%` / `//` on negatives | DungeonRooms room/door math, midpoints | `pymod`, `Math.floor`, `>> 1` (floors). |
| NumPy negative indexing / IndexError | DungeonRooms user rooms (errors are swallowed per room) | `Grid.get/set` wrap negatives and throw `IndexError`. |
| `int8` set ids overflow | Ellers | `Int32Array`; deviation (known bug). |
| CellularAutomaton mutates `complexity`/`density` on first `generate()` | Monte Carlo repeats | Kept the mutation. |
| `max(..., key=)` / `min(..., key=)` return the first extreme; `sorted` is stable | Maze Monte Carlo, Chain | Same tie-breaking (JS sort is stable). |
| Recursion in `generate_entrances` | Maze | Loop (same draws). |
