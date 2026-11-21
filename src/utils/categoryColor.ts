// Maps a category name to a palette color so the same category looks the same in every chart.
// shortcut: plain string hash modulo palette size, two names can collide; upgrade if the backend ever sends a category color.
export const getCategoryColor = (name: string, palette: string[]): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
};
