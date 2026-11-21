import { describe, it, expect } from "vitest";
import { buildCategoryColorMap } from "@/utils/categoryColor";

const palette = ["#a", "#b", "#c", "#d", "#e", "#f", "#g", "#h"];

describe("buildCategoryColorMap", () => {
  it("assigns distinct colors to up to 8 names", () => {
    const names = ["Viaje", "Transporte", "Hogar", "Ocio", "Salud", "Comida", "Ropa", "Gym"];
    const map = buildCategoryColorMap(names, palette);
    expect(new Set(Object.values(map)).size).toBe(8);
  });

  it("does not depend on input order", () => {
    const names = ["Viaje", "Hogar", "Transporte"];
    expect(buildCategoryColorMap([...names].reverse(), palette)).toEqual(
      buildCategoryColorMap(names, palette),
    );
  });

  it("cycles past the palette size without throwing", () => {
    const names = Array.from({ length: 12 }, (_, i) => `Cat ${String(i).padStart(2, "0")}`);
    const map = buildCategoryColorMap(names, palette);
    expect(Object.keys(map)).toHaveLength(12);
    names.forEach((n) => expect(palette).toContain(map[n]));
  });

  it("returns an empty map for no names", () => {
    expect(buildCategoryColorMap([], palette)).toEqual({});
  });

  it("regression: the names that collided in the live app get 5 distinct colors", () => {
    const map = buildCategoryColorMap(
      ["Viaje", "Transporte", "Ocio", "Hogar", "Supermercado"],
      palette,
    );
    expect(new Set(Object.values(map)).size).toBe(5);
  });
});
