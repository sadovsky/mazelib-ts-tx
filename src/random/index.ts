import { NpRandomState } from "./nprandom.js";
import { PyRandom } from "./pyrandom.js";

export { MT19937 } from "./mt19937.js";
export { NpRandomState } from "./nprandom.js";
export { PyRandom } from "./pyrandom.js";

/**
 * The module-global streams the original draws from: Python's `random` module
 * and NumPy's global legacy `RandomState`. They are independent.
 */
export const pyRandom = new PyRandom();
export const npRandom = new NpRandomState();

/**
 * Seed both global streams, like `Maze.set_seed`. Python's `random` is seeded
 * first, so it stays seeded even if NumPy rejects the seed.
 */
export function setSeed(seed: number | bigint | null | undefined): void {
  if (seed === null || seed === undefined) return;
  pyRandom.seed(seed);
  npRandom.seed(seed);
}
