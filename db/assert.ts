/** Asserts row `index` exists (defaults to the first) and returns it, non-nullable. */
export function row<T>(rows: readonly T[], index = 0): T {
  const r = rows[index];
  if (r === undefined) throw new Error(`Expected a row at index ${index}, got ${rows.length} row(s)`);
  return r;
}
