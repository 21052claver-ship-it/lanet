export function distributeWeights(entries, proportional = false) {
  if (!entries.length) return [];
  const values = entries.map((e) => Math.max(0, Number(e.weight) || 0));
  const sum = values.reduce((s, v) => s + v, 0);
  const exact = entries.map(
    (_, i) => 10000 * (proportional && sum > 0 ? values[i] / sum : 1 / entries.length),
  );
  const units = exact.map(Math.floor);
  const remainder = 10000 - units.reduce((s, v) => s + v, 0);
  const order = exact
    .map((v, i) => ({ i, fraction: v - units[i] }))
    .sort((a, b) => b.fraction - a.fraction || a.i - b.i);
  for (let i = 0; i < remainder; i++) units[order[i].i]++;
  return entries.map((e, i) => ({ ...e, weight: units[i] / 100 }));
}
