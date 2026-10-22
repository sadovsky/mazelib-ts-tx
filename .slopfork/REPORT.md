# Slopfork report: mazelib (Python) → mazelib-ts-tx (TypeScript)

- Source: https://github.com/john-science/mazelib@56cd88294a36746bbd324c2c9f7e4ab26095deb3 (MIT, © 2014 John Stilley)
- Mode: transpile · Target profile: `tx` · Date: 2026-10-22

## Parity
| Module | Target level | Reached | Cases (pass/total) | Deviations |
|---|---|---|---|---|
| RNG: Python `random`, NumPy legacy `RandomState` | L2 | L2 exact | rng 63/63 | — |
| CPython set order / tuple hash | L2 | L2 exact (via Prims, DungeonRooms, Perturbation, ShortestPath(s)) + 150 recorded set scenarios | — | — |
| Generators (14) | L2 | L2 exact | generate 1564/1564 exact + 8 invariant; 1572/1572 check | Ellers: 8 known-bug cases |
| Maze entrances | L2 | L2 exact | entrances 200/200 | — |
| Solvers (7, Chain in both turns) | L2 | L2 exact | solve 372/372 exact + 12 invariant; 384/384 check | Collision: 12 known-bug cases |
| Transmuters (3) | L2 | L2 exact | transmute 120/120 | — |
| Maze `tostring` | L2 | L2 exact | tostring 20/20 | — |
| Maze Monte Carlo | L2 | L2 exact | monte_carlo 37/37 | — |

Overall: 33/33 modules in `features.md` at their target level.

## Verification details
L0: `npx tsc --noEmit` clean (strict, NodeNext, zero runtime deps).
L1: 41/41 source unit tests ported (test_generators, test_solvers, test_transmuters, test_maze), 0 skipped; plus 32 new tests (RNG and set-order fixtures recorded from CPython 3.13/NumPy 2.5, known-bug fixes). 73/73 pass.
L2: 2,396 cases; exact 2,376/2,376, invariant-checked 2,396/2,396 (the 20 `tx: invariant` cases are the known bugs), distributional 0. Full run takes ~15 s.
L3/L4/L5: not applicable.

## Known deviations and unknowns
- **Ellers** (8 cases): the original stores set ids as `int8` and raises `OverflowError` past 127; the port uses `Int32Array` ids and returns a perfect maze. Wherever the original doesn't overflow, the two are identical.
- **Collision** (12 cases): any collision between flood robots makes the original raise `TypeError` on the next step. The port runs the original algorithm unchanged until a collision is detected, then restarts on a fresh copy of the grid with a flood where robots that meet merge and never re-enter flooded cells. The result is one shortest solution. A first attempt that just dropped collided robots (keeping the walls) failed `nonempty_when_reachable` on the CellularAutomaton mazes, because the wall built where two equal routes merge blocks the end.
- After those fallbacks the RNG state differs from where the original would have been, which is unobservable since the original crashed.
- The default (unseeded) state of both streams is seed 0, not OS entropy.

## Notable findings
- `DungeonRooms._find_unblocked_neighbors` shuffles with Python's `random.shuffle` (its module imports `shuffle` from `random`), while every other neighbor helper uses `numpy.random.shuffle`. Getting this wrong only showed up in 7 cases (rooms + 12x17, and Monte Carlo on DungeonRooms).
- Exact parity needed CPython's `set` layout: Prims rebuilds its frontier with `list(set(...))` and draws an index from it; DungeonRooms/Perturbation draw `choice(list(passage))`; ShortestPath(s) return solutions in `set` order (sorted stably by length). `PySet` ports `setobject.c` probing/resizing/`set_merge` and the xxHash-based `tuplehash`.

## Provenance
- Guard log: 26 entries in `.slopfork/provenance.jsonl`, all `allow` (transpile mode), 0 denied. Cleanroom repos were never read.
- Leak audit: not applicable (transpile mode; the output is a declared derivative work).

## License and attribution
mazelib is MIT. The port keeps the copyright notice in `NOTICE` and `LICENSE` and says it is a port of mazelib@56cd882. The CPython/NumPy RNG and set behaviour are reimplemented from their algorithms; no code from either is included. Not legal advice.
