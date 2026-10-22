/**
 * Case runner for the slopfork-mazelib-goldens protocol (PROTOCOL.md): one
 * case object in, one result envelope out. `adapter.ts` wires it to stdio.
 */
import {
  AldousBroder,
  BacktrackingGenerator,
  BacktrackingSolver,
  BinaryTree,
  type Cell,
  CellularAutomaton,
  Chain,
  Collision,
  CuldeSacFiller,
  DeadEndFiller,
  Division,
  DungeonRooms,
  Ellers,
  Grid,
  GrowingTree,
  HuntAndKill,
  Kruskal,
  Maze,
  type MazeGenAlgo,
  type MazeSolveAlgo,
  type MazeTransmuteAlgo,
  Perturbation,
  Prims,
  PyError,
  RandomMouse,
  ShortestPath,
  ShortestPaths,
  Sidewinder,
  type Solution,
  Tremaux,
  TrivialMaze,
  Wilsons,
  npRandom,
  pyRandom,
} from "../src/index.js";

type Json = any; // eslint-disable-line @typescript-eslint/no-explicit-any

const GENERATORS: Record<string, (h: number, w: number, p: Json) => MazeGenAlgo> = {
  AldousBroder: (h, w) => new AldousBroder(h, w),
  BacktrackingGenerator: (h, w) => new BacktrackingGenerator(h, w),
  BinaryTree: (h, w, p) => new BinaryTree(h, w, { skew: p.skew }),
  CellularAutomaton: (h, w, p) => new CellularAutomaton(h, w, { complexity: p.complexity, density: p.density }),
  Division: (h, w) => new Division(h, w),
  DungeonRooms: (h, w, p) =>
    new DungeonRooms(h, w, {
      rooms: p.rooms ?? null,
      grid: p.grid == null ? null : Grid.fromRows(p.grid),
      huntOrder: p.hunt_order,
    }),
  Ellers: (h, w, p) => new Ellers(h, w, { xskew: p.xskew, yskew: p.yskew }),
  GrowingTree: (h, w, p) => new GrowingTree(h, w, { backtrackChance: p.backtrack_chance }),
  HuntAndKill: (h, w, p) => new HuntAndKill(h, w, { huntOrder: p.hunt_order }),
  Kruskal: (h, w) => new Kruskal(h, w),
  Prims: (h, w) => new Prims(h, w),
  Sidewinder: (h, w, p) => new Sidewinder(h, w, { skew: p.skew }),
  TrivialMaze: (h, w, p) => new TrivialMaze(h, w, { mazeType: p.maze_type }),
  Wilsons: (h, w, p) => new Wilsons(h, w, { huntOrder: p.hunt_order }),
};

const SOLVERS: Record<string, (p: Json) => MazeSolveAlgo> = {
  BacktrackingSolver: () => new BacktrackingSolver(),
  Chain: (p) => new Chain({ turn: p.turn }),
  Collision: () => new Collision(),
  RandomMouse: () => new RandomMouse(),
  ShortestPath: () => new ShortestPath(),
  ShortestPaths: () => new ShortestPaths(),
  Tremaux: () => new Tremaux(),
};

const TRANSMUTERS: Record<string, (p: Json) => MazeTransmuteAlgo> = {
  CuldeSacFiller: () => new CuldeSacFiller(),
  DeadEndFiller: (p) => new DeadEndFiller({ iterations: p.iterations }),
  Perturbation: (p) => new Perturbation({ repeat: p.repeat, newWalls: p.new_walls }),
};

function lookup<T>(table: Record<string, T>, name: string): T {
  if (!Object.hasOwn(table, name)) throw new PyError("ModuleNotFoundError", `No module named '${name}'`);
  return table[name];
}

const cellIn = (c: Json): Cell | null => (c == null ? null : [Number(c[0]), Number(c[1])]);
const cellOut = (c: Cell | null): Json => (c == null ? null : [c[0], c[1]]);
const solutionsOut = (s: Solution[] | null): Json => (s == null ? null : s.map((p) => p.map(cellOut)));

function makeGenerator(spec: Json): MazeGenAlgo {
  return lookup(GENERATORS, spec.algo)(spec.h, spec.w, spec.params ?? {});
}

function makeSolver(spec: Json): MazeSolveAlgo {
  return lookup(SOLVERS, spec.algo)(spec.params ?? {});
}

const OPS: Record<string, (a: Json) => Json> = {
  generate: (a) => ({ grid: makeGenerator(a).generate().toRows() }),

  entrances: (a) => {
    const m = new Maze();
    m.grid = Grid.fromRows(a.grid);
    m.generateEntrances(a.start_outer, a.end_outer);
    return { start: cellOut(m.start), end: cellOut(m.end) };
  },

  solve: (a) => {
    const m = new Maze();
    m.grid = Grid.fromRows(a.grid);
    m.start = cellIn(a.start);
    m.end = cellIn(a.end);
    m.solver = makeSolver(a);
    m.prune = a.prune ?? true;
    m.solve();
    return { solutions: solutionsOut(m.solutions) };
  },

  transmute: (a) => {
    const m = new Maze();
    m.grid = Grid.fromRows(a.grid);
    m.start = cellIn(a.start);
    m.end = cellIn(a.end);
    m.transmuters = [lookup(TRANSMUTERS, a.algo)(a.params ?? {})];
    m.transmute();
    return { grid: m.grid.toRows() };
  },

  tostring: (a) => {
    const m = new Maze();
    m.grid = Grid.fromRows(a.grid);
    m.start = cellIn(a.start);
    m.end = cellIn(a.end);
    m.solutions = a.solutions == null ? null : a.solutions.map((p: Json[]) => p.map((c) => cellIn(c)!));
    return { text: m.render(a.entrances, a.show_solutions) };
  },

  monte_carlo: (a) => {
    const m = new Maze();
    m.generator = makeGenerator(a.generator);
    m.solver = makeSolver(a.solver);
    m.generateMonteCarlo(a.repeat, a.entrances, a.difficulty);
    return { grid: m.grid!.toRows(), start: cellOut(m.start), end: cellOut(m.end), solutions: solutionsOut(m.solutions) };
  },

  rng: (a) => {
    const out: Json[] = [];
    for (const [fn, ...args] of a.calls as [string, ...number[]][]) {
      switch (fn) {
        case "random":
          out.push(pyRandom.random());
          break;
        case "randrange":
          out.push(pyRandom.randrange(args[0], args[1], args[2]));
          break;
        case "randint":
          out.push(pyRandom.randint(args[0], args[1]));
          break;
        case "choice":
          out.push(pyRandom.choice([...Array(args[0]).keys()]));
          break;
        case "shuffle": {
          const x = [...Array(args[0]).keys()];
          pyRandom.shuffle(x);
          out.push(x);
          break;
        }
        case "np_shuffle": {
          const x = [...Array(args[0]).keys()];
          npRandom.shuffle(x);
          out.push(x);
          break;
        }
        default:
          throw new PyError("ValueError", `unknown rng call ${fn}`);
      }
    }
    return { out };
  },
};

export function run(c: Json): Json {
  try {
    if (c.seed !== null && c.seed !== undefined) Maze.setSeed(c.seed);
    const op = OPS[c.op];
    if (!op) throw new PyError("KeyError", String(c.op));
    return { ok: true, value: op(c.args) };
  } catch (e) {
    if (e instanceof PyError) return { ok: false, error: { kind: e.kind, message: e.message.slice(0, 200) } };
    if (e instanceof RangeError && /call stack/.test(e.message)) {
      return { ok: false, error: { kind: "RecursionError", message: e.message.slice(0, 200) } };
    }
    const err = e as Error;
    return { ok: false, error: { kind: `JS${err?.name ?? "Error"}`, message: String(err?.message ?? e).slice(0, 200) } };
  }
}

