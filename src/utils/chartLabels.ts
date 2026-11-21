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

/**
 * Moves label y positions apart so none is closer than `minGap`, keeping their order.
 * Results line up with the input. When they cannot all fit in [min, max] the lowest ones
 * overflow past `max` (the caller hides those).
 */
export function spreadLabelPositions(
  ys: number[],
  minGap: number,
  min: number,
  max: number,
): number[] {
  const order = ys.map((_, i) => i).sort((a, b) => ys[a] - ys[b] || a - b);
  const out = [...ys];
  let limit = max;
  for (let k = order.length - 1; k >= 0; k--) {
    out[order[k]] = Math.min(ys[order[k]], limit);
    limit = out[order[k]] - minGap;
  }
  let floor = min;
  for (const i of order) {
    out[i] = Math.max(out[i], floor);
    floor = out[i] + minGap;
  }
  return out;
}
