import { shouldAutoFormat } from "./table.ts";

function equal(actual: unknown, expected: unknown) {
  if (actual !== expected) throw new Error(`expected ${expected}, got ${actual}`);
}

equal(shouldAutoFormat(true, false, false), true);
equal(shouldAutoFormat(true, true, false), false);
equal(shouldAutoFormat(true, false, true), false);
equal(shouldAutoFormat(false, false, false), false);

console.log("table tests passed");
