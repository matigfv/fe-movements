import { describe, it, expect } from "vitest";
import { lastValueIndex, sliceLabel } from "@/utils/chartLabels";

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
