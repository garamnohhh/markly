// Minimal subsequence fuzzy match. Returns a score (higher = better) or -1 if
// the query isn't a subsequence of the target. Contiguous runs score higher.
export function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (q === "") return 0;
  let score = 0;
  let ti = 0;
  let run = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const c = q[qi];
    const found = t.indexOf(c, ti);
    if (found === -1) return -1;
    run = found === ti ? run + 1 : 0;
    score += 1 + run * 2;
    ti = found + 1;
  }
  // prefer shorter targets on ties
  return score - t.length * 0.01;
}

export function fuzzyFilter<T>(
  query: string,
  items: T[],
  key: (t: T) => string,
): T[] {
  if (!query) return items;
  return items
    .map((item) => ({ item, s: fuzzyScore(query, key(item)) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.item);
}
