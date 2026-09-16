import { formatTables } from "./table.ts";

function equal(actual: unknown, expected: unknown) {
  if (actual !== expected) throw new Error(`expected ${expected}, got ${actual}`);
}

equal(
  formatTables([
    "Before",
    "",
    "| a | longer |",
    "| - | - |",
    "| x | y |",
    "",
    "After",
  ].join("\n")),
  [
    "Before",
    "",
    "| a   | longer |",
    "| --- | ------ |",
    "| x   | y      |",
    "",
    "After",
  ].join("\n"),
);

console.log("table tests passed");
