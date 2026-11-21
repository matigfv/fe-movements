import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(__dirname, "../../src/index.css"), "utf-8");

describe("index.css motion", () => {
  const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));

  it("disables the custom animation classes under prefers-reduced-motion", () => {
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    for (const cls of [".step-enter-right", ".step-enter-left", ".list-row-enter", ".fade-in-up", ".row-highlighted"]) {
      expect(reduced).toContain(cls);
    }
    expect(reduced).toMatch(/animation:\s*none/);
  });

  it("animates .list-row-enter with opacity only", () => {
    expect(css).toMatch(/\.list-row-enter\s*\{[^}]*animation:\s*list-row-fade-in/);
    const keyframes = css.match(/@keyframes list-row-fade-in\s*\{[\s\S]*?\}\s*\}/);
    expect(keyframes).not.toBeNull();
    expect(keyframes![0]).toContain("opacity");
    expect(keyframes![0]).not.toContain("transform");
  });
});
