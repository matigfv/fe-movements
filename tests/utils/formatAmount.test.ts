import { describe, it, expect } from "vitest";
import { formatAmount } from "@/utils/formatAmount";

describe("formatAmount", () => {
  it.each(["ARS", "USD", "EUR"])("prefixes the %s code instead of a bare $", (code) => {
    const out = formatAmount(1234.5, code);
    expect(out).toBe(`${code} 1.235`);
    expect(out).not.toContain("$");
  });

  it("keeps an unknown code as is", () => {
    expect(formatAmount(10, "XYZ")).toBe("XYZ 10");
  });

  it("falls back to no prefix for null or empty currency", () => {
    expect(formatAmount(10, null)).toBe("10");
    expect(formatAmount(10, "")).toBe("10");
  });

  it("puts the minus sign before the code and honors fraction digits", () => {
    expect(formatAmount(-1383.08, "USD", 2)).toBe("-USD 1.383,08");
  });
});
