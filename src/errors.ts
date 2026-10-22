/**
 * Errors raised by the library. `kind` is the name of the Python exception
 * class the original raises in the same situation (e.g. "AssertionError").
 */
export class PyError extends Error {
  readonly kind: string;

  constructor(kind: string, message: string) {
    super(message);
    this.kind = kind;
    this.name = kind;
  }
}

/** Python's `assert cond, message`. */
export function pyAssert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new PyError("AssertionError", message);
}
