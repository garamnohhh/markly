import { findOccurrences, wrapFindIndex } from "./find.ts";

function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

equal(findOccurrences("AWS aws Aws", "aws"), [
  { from: 0, to: 3 },
  { from: 4, to: 7 },
  { from: 8, to: 11 },
]);
equal(findOccurrences("aaaa", "aa"), [
  { from: 0, to: 2 },
  { from: 2, to: 4 },
]);
equal(findOccurrences("anything", ""), []);
equal(wrapFindIndex(-1, 4), 3);
equal(wrapFindIndex(4, 4), 0);

console.log("find tests passed");
