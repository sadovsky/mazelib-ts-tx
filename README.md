# mazelib-ts-tx

A TypeScript port of [mazelib](https://github.com/john-science/mazelib) (Python, v0.9.17 @ `56cd882`): maze generation, solving and transmutation. Node 22, ESM, strict TypeScript, zero runtime dependencies.

It's the **transpile** arm of the slopfork mazelib experiment: the Python source was translated directly, and the port matches the original **exactly**. The same seed gives the same maze, the same entrances and the same solutions. To get there it reimplements, bit for bit:

- CPython's `random` (MT19937, `getrandbits`-based `randrange`/`choice`/`shuffle`, 53-bit `random()`),
- NumPy's legacy `RandomState` (`seed`, `shuffle`),
- CPython's `set` iteration order and tuple hashing, because mazelib draws from and returns `list(set(...))`.

See [NOTICE](NOTICE) for attribution. mazelib is © 2014 John Stilley, MIT.

## Usage

```ts
import { Maze, Prims, ShortestPaths } from "mazelib-ts";

const m = new Maze(42);            // seeds both random streams, like Maze(42) in Python
m.generator = new Prims(8, 10);    // 8 x 10 cells -> a 17 x 21 grid
m.generate();
m.generateEntrances();
m.solver = new ShortestPaths();
m.solve();
console.log(m.toString());         // walls, S/E, and the first solution as +
```

`Grid` is a 0/1 grid (1 = wall) over a row-major `Uint8Array`: `grid.get(r, c)`, `grid.set(r, c, v)`, `grid.height`, `grid.width`, `Grid.fromRows(["###", ...])`, `grid.toRows()`. Cells are `[row, col]`.

## Python → TypeScript API

| Python | TypeScript | Notes |
|---|---|---|
| `Maze(seed=None)` | `new Maze(seed?)` | |
| `Maze.set_seed(seed)` | `Maze.setSeed(seed)` (or `setSeed`) | seeds `pyRandom` and `npRandom` |
| `m.generator`, `m.grid`, `m.start`, `m.end`, `m.solver`, `m.transmuters`, `m.solutions`, `m.prune` | same names | `grid` is a `Grid`; cells are `[r, c]` |
| `m.generate()` | `m.generate()` | |
| `m.generate_entrances(start_outer, end_outer)` | `m.generateEntrances(startOuter, endOuter)` | |
| `m.generate_monte_carlo(repeat, entrances, difficulty, reducer)` | `m.generateMonteCarlo(repeat, entrances, difficulty, reducer)` | `reducer(solution) => number` |
| `m.transmute()` | `m.transmute()` | |
| `m.solve()` | `m.solve()` | |
| `m.tostring(entrances, solutions)` | `m.render(entrances, solutions)` | |
| `str(m)` / `repr(m)` | `m.toString()` / `String(m)` | `render(true, true)` |
| `AldousBroder(h, w)`, `BacktrackingGenerator`, `Division`, `Kruskal`, `Prims` | `new AldousBroder(h, w)`, … | |
| `BinaryTree(h, w, skew=None)` | `new BinaryTree(h, w, { skew })` | |
| `CellularAutomaton(h, w, complexity=1.0, density=1.0)` | `new CellularAutomaton(h, w, { complexity, density })` | |
| `DungeonRooms(h, w, rooms=None, grid=None, hunt_order="random")` | `new DungeonRooms(h, w, { rooms, grid, huntOrder })` | `grid` is a `Grid` |
| `Ellers(h, w, xskew=0.5, yskew=0.5)` | `new Ellers(h, w, { xskew, yskew })` | |
| `GrowingTree(h, w, backtrack_chance=1.0)` | `new GrowingTree(h, w, { backtrackChance })` | |
| `HuntAndKill(h, w, hunt_order="random")` | `new HuntAndKill(h, w, { huntOrder })` | |
| `Sidewinder(h, w, skew=0.5)` | `new Sidewinder(h, w, { skew })` | |
| `TrivialMaze(h, w, maze_type="spiral")` | `new TrivialMaze(h, w, { mazeType })` | |
| `Wilsons(h, w, hunt_order="random")` | `new Wilsons(h, w, { huntOrder })` | |
| `generator.generate()` | `generator.generate()` | returns a `Grid` |
| `BacktrackingSolver()`, `Collision()`, `RandomMouse()`, `ShortestPath()`, `ShortestPaths()`, `Tremaux()` | `new BacktrackingSolver()`, … | |
| `Chain(turn="right")` | `new Chain({ turn })` | |
| `solver.solve(grid, start, end)` | `solver.solve(grid, start, end)` | |
| `solver.prune_solutions(solutions)` | `solver.pruneSolutions(solutions)` | |
| `CuldeSacFiller()` | `new CuldeSacFiller()` | |
| `DeadEndFiller(iterations=1)` | `new DeadEndFiller({ iterations })` | |
| `Perturbation(repeat=1, new_walls=1)` | `new Perturbation({ repeat, newWalls })` | |
| `transmuter.transmute(grid, start, end)` | `transmuter.transmute(grid, start, end)` | modifies `grid` in place |
| Python exceptions | `PyError` with `kind` = the Python class name | e.g. `"AssertionError"` |
| `random.*` (module global) | `pyRandom` (`PyRandom`) | |
| `numpy.random.*` (module global) | `npRandom` (`NpRandomState`) | |

## Differences from the original

The port returns a valid result in two places where the original crashes on valid input (see the goldens' `KNOWN_BUGS.json`):

- **Ellers** stores set ids as int8 and raises `OverflowError` once a maze needs more than 127 of them. The port uses 32-bit ids.
- **Collision** raises `TypeError` on any maze where two flood robots meet (mazes with loops or rooms). The port runs the original algorithm unchanged until a collision, then finishes with a flood in which meeting robots merge and never re-enter flooded cells, so it returns a shortest solution.

Everything else, including the original's quirks (e.g. `ShortestPath` decides whether the end is on the edge by looking at the start), is reproduced as is.

## Development

```
npm ci
npx tsc --noEmit
npx vitest run
npx tsx adapter/adapter.ts < cases.jsonl   # goldens protocol adapter
```

The goldens live in [slopfork-mazelib-goldens](https://github.com/sadovsky/slopfork-mazelib-goldens); CI runs `diff_harness.py compare` and `check` on all seven case sets with profile `tx`. `scripts/gen_fixtures.py` re-records the RNG and set-order unit-test fixtures from CPython and NumPy.
