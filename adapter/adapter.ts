/**
 * Adapter for the slopfork-mazelib-goldens protocol (PROTOCOL.md): reads
 * JSON-line cases on stdin and writes one JSON result line per case.
 *
 * Run: npx tsx adapter/adapter.ts
 */
import { createInterface } from "node:readline";
import { run } from "./run.js";

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
for await (const line of rl) {
  if (line.trim()) process.stdout.write(JSON.stringify(run(JSON.parse(line))) + "\n");
}
