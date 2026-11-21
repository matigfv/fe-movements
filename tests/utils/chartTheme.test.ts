import { describe, it, expect } from "vitest";
import { theme } from "antd";
import { getChartColors, getChartTheme } from "@/utils/chartTheme";

const tokenFor = (algorithm: typeof theme.darkAlgorithm) => {
  const seed = theme.defaultSeed;
  return algorithm(seed) as unknown as Parameters<typeof getChartColors>[0];
};

const light = tokenFor(theme.defaultAlgorithm);
const dark = tokenFor(theme.darkAlgorithm);

describe("getChartColors", () => {
  it("builds 8 distinct colors from theme tokens", () => {
    const colors = getChartColors(light);
    expect(colors).toHaveLength(8);
    expect(new Set(colors).size).toBe(8);
    expect(colors[0]).toBe(light.colorPrimary);
    expect(colors[1]).toBe(light.colorSuccess);
  });

  it("differs between light and dark themes", () => {
    expect(getChartColors(dark)).not.toEqual(getChartColors(light));
    expect(getChartColors(dark)[1]).toBe(dark.colorSuccess);
  });
});

describe("getChartTheme", () => {
  it("derives axis, grid and tooltip colors from tokens", () => {
    const t = getChartTheme(dark);
    expect(t.tick.fill).toBe(dark.colorTextSecondary);
    expect(t.grid).toBe(dark.colorBorderSecondary);
    expect(t.tooltip.contentStyle.backgroundColor).toBe(dark.colorBgElevated);
    expect(t.tooltip.contentStyle.color).toBe(dark.colorText);
    expect(t.tick.fill).not.toBe(getChartTheme(light).tick.fill);
  });
});
