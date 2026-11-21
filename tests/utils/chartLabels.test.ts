import { describe, it, expect } from "vitest";
import { lastValueIndex, sliceLabel, spreadLabelPositions } from "@/utils/chartLabels";

describe("sliceLabel", () => {
  it("joins name and rounded percentage", () => {
    expect(sliceLabel("Hogar", 0.4256)).toBe("Hogar 43%");
  });

  it("skips slices under 5% so small labels do not pile up", () => {
    expect(sliceLabel("Ocio", 0.049)).toBeNull();
    expect(sliceLabel("Ocio", 0.05)).toBe("Ocio 5%");
  });

  it("truncates long names", () => {
    expect(sliceLabel("Supermercado y almacén", 0.5)).toBe("Supermercado y… 50%");
  });
});

describe("lastValueIndex", () => {
  it("returns the last row where the series has a number", () => {
    const rows = [{ a: 1 }, { a: 2 }, {}, {}];
    expect(lastValueIndex(rows, "a")).toBe(1);
  });

  it("returns -1 when the series has no values", () => {
    expect(lastValueIndex([{}, {}], "a")).toBe(-1);
  });
});

describe("spreadLabelPositions", () => {
  const gap = 14;
  const sortedGaps = (ps: number[]) => {
    const s = [...ps].sort((a, b) => a - b);
    return s.slice(1).map((v, i) => v - s[i]);
  };

  it("returns empty and single inputs unchanged", () => {
    expect(spreadLabelPositions([], gap, 0, 100)).toEqual([]);
    expect(spreadLabelPositions([50], gap, 0, 100)).toEqual([50]);
  });

  it("leaves already separated labels where they are", () => {
    expect(spreadLabelPositions([10, 40, 90], gap, 0, 100)).toEqual([10, 40, 90]);
  });

  it("pushes piled labels at least minGap apart, inside the range", () => {
    const out = spreadLabelPositions([100, 100, 100, 100], gap, 0, 100);
    expect(Math.min(...sortedGaps(out))).toBeGreaterThanOrEqual(gap);
    expect(Math.min(...out)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...out)).toBeLessThanOrEqual(100);
  });

  it("keeps the original order and maps results to input positions", () => {
    const out = spreadLabelPositions([52, 50, 51], gap, 0, 100);
    expect(out[1]).toBeLessThan(out[2]);
    expect(out[2]).toBeLessThan(out[0]);
  });

  it("clamps labels that start outside the range", () => {
    expect(spreadLabelPositions([-20, 500], gap, 0, 100)).toEqual([0, 100]);
  });

  it("when more labels than fit, keeps them separated and lets the overflow past max", () => {
    const out = spreadLabelPositions([0, 0, 0, 0], gap, 0, 20);
    expect(out[0]).toBe(0);
    expect(Math.min(...sortedGaps(out))).toBeGreaterThanOrEqual(gap);
    expect(Math.max(...out)).toBeGreaterThan(20);
  });
});
