// Assigns palette colors by position in the name-sorted list: stable for a given set of names,
// independent of input order, and collision-free until there are more names than colors.
// shortcut: a name can change color when the set of names changes (e.g. other filters), upgrade if the backend ever sends a category color.
export const buildCategoryColorMap = (
  names: string[],
  palette: string[],
): Record<string, string> =>
  Object.fromEntries(
    [...new Set(names)]
      .sort((a, b) => a.localeCompare(b))
      .map((name, i) => [name, palette[i % palette.length]]),
  );
