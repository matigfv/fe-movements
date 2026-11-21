const MIN_SLICE_RATIO = 0.05;
const MAX_NAME_LENGTH = 15;

/** "Name 43%" label for a pie slice, or null when the slice is too small to label legibly. */
export function sliceLabel(name: string, ratio: number): string | null {
  if (ratio < MIN_SLICE_RATIO) return null;
  const short =
    name.length > MAX_NAME_LENGTH ? `${name.slice(0, MAX_NAME_LENGTH - 1)}…` : name;
  return `${short} ${Math.round(ratio * 100)}%`;
}

/** Index of the last row holding a numeric value for `key` (where an end-of-line label goes). */
export function lastValueIndex(
  rows: Record<string, unknown>[],
  key: string,
): number {
  for (let i = rows.length - 1; i >= 0; i--) {
    if (typeof rows[i][key] === "number") return i;
  }
  return -1;
}
