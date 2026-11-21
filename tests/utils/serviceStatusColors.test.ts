import { describe, it, expect } from "vitest";
import { theme } from "antd";
import { getServiceStatusStyles } from "@/utils/serviceStatusColors";

const algorithms = {
  light: theme.defaultAlgorithm,
  dark: theme.darkAlgorithm,
};

type Rgb = [number, number, number];

function parse(color: string, over?: Rgb): Rgb {
  const m = color.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b, al = 1] = m[1].split(",").map(Number);
    const bg = over ?? [255, 255, 255];
    return [r, g, b].map((c, i) => c * al + bg[i] * (1 - al)) as Rgb;
  }
  const h = color.length === 4 ? `#${[...color.slice(1)].map((c) => c + c).join("")}` : color;
  return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
}

function luminance([r, g, b]: Rgb): number {
  const [x, y, z] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * x + 0.7152 * y + 0.0722 * z;
}

// Text may be translucent (dark theme secondary text): blend it over the surface first.
function contrast(fg: string, bg: string): number {
  const surface = parse(bg);
  const [hi, lo] = [luminance(parse(fg, surface)), luminance(surface)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
}

describe("getServiceStatusStyles", () => {
  const light = theme.getDesignToken({ algorithm: theme.defaultAlgorithm });

  it("pending: amber text shade (orange8) for label and amount, neutral surface", () => {
    const s = getServiceStatusStyles(light, false);
    expect(s.labelColor).toBe(light.orange8);
    expect(s.amountColor).toBe(light.orange8);
    expect(s.cardBg).toBe(light.colorBgContainer);
    expect(s.cardBorder).toBe(light.colorBorderSecondary);
  });

  it("paid: success text label, secondary amount, neutral surface", () => {
    const s = getServiceStatusStyles(light, true);
    expect(s.labelColor).toBe(light.green8);
    expect(s.amountColor).toBe(light.colorTextSecondary);
    expect(s.cardBg).toBe(light.colorBgContainer);
    expect(s.cardBorder).toBe(light.colorBorderSecondary);
  });

  it.each(Object.entries(algorithms))("never uses red tokens (%s)", (_name, algorithm) => {
    const token = theme.getDesignToken({ algorithm });
    const red = Object.entries(token)
      .filter(([k]) => k.startsWith("colorError"))
      .map(([, v]) => v);
    for (const paid of [true, false]) {
      for (const v of Object.values(getServiceStatusStyles(token, paid))) {
        expect(red).not.toContain(v);
      }
    }
  });

  it.each(Object.entries(algorithms))("text pairs reach 4.5:1 on the card surface (%s)", (_name, algorithm) => {
    const token = theme.getDesignToken({ algorithm });
    for (const paid of [true, false]) {
      const s = getServiceStatusStyles(token, paid);
      expect(contrast(s.labelColor, s.cardBg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(s.amountColor, s.cardBg)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
