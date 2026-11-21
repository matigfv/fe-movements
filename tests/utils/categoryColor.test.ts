import { describe, it, expect } from "vitest";
import { getCategoryColor } from "@/utils/categoryColor";

const palette = ["#a", "#b", "#c", "#d", "#e", "#f"];

describe("getCategoryColor", () => {
  it("is deterministic for the same name", () => {
    expect(getCategoryColor("Viaje", palette)).toBe(getCategoryColor("Viaje", palette));
  });

  it("always returns a color from the palette", () => {
    for (const name of ["Viaje", "Transporte", "Hogar", "Ocio", "", "Ñandú ☕", "x".repeat(500)]) {
      expect(palette).toContain(getCategoryColor(name, palette));
    }
  });

  it("does not depend on order or on which other names exist", () => {
    const alone = getCategoryColor("Transporte", palette);
    const names = ["Viaje", "Hogar", "Transporte"];
    expect(names.map((n) => getCategoryColor(n, palette))[2]).toBe(alone);
    expect([...names].reverse().map((n) => getCategoryColor(n, palette))[0]).toBe(alone);
  });

  it("spreads different names over more than one color", () => {
    const used = new Set(
      ["Viaje", "Transporte", "Hogar", "Ocio", "Salud", "Comida"].map((n) =>
        getCategoryColor(n, palette),
      ),
    );
    expect(used.size).toBeGreaterThan(1);
  });

  it("handles an empty name", () => {
    expect(palette).toContain(getCategoryColor("", palette));
  });
});
