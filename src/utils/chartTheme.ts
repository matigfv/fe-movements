import { createElement } from "react";
import type { GlobalToken } from "antd";

type ChartToken = Pick<
  GlobalToken,
  | "colorPrimary"
  | "colorSuccess"
  | "colorWarning"
  | "colorError"
  | "purple"
  | "cyan"
  | "magenta"
  | "orange"
  | "colorTextSecondary"
  | "colorText"
  | "colorBorderSecondary"
  | "colorBgElevated"
>;

// Categorical series colors from the active Ant Design theme, so light and dark both work.
export const getChartColors = (token: ChartToken): string[] => [
  token.colorPrimary,
  token.colorSuccess,
  token.colorWarning,
  token.colorError,
  token.purple,
  token.cyan,
  token.magenta,
  token.orange,
];

// Shared recharts props (axis ticks, grid, tooltip, legend text) that follow the theme.
export const getChartTheme = (token: ChartToken) => ({
  tick: { fontSize: 12, fill: token.colorTextSecondary },
  grid: token.colorBorderSecondary,
  tooltip: {
    contentStyle: {
      backgroundColor: token.colorBgElevated,
      border: `1px solid ${token.colorBorderSecondary}`,
      color: token.colorText,
    },
    itemStyle: { color: token.colorText },
    labelStyle: { color: token.colorText },
  },
  legendFormatter: (value: string) =>
    createElement("span", { style: { color: token.colorText } }, value),
});
