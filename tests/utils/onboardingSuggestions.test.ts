import { BANK_SUGGESTIONS, CURRENCY_SUGGESTIONS } from "@/utils/onboardingSuggestions";

describe("onboardingSuggestions", () => {
  it("currency suggestions are non-empty, well-shaped and have unique symbols", () => {
    expect(CURRENCY_SUGGESTIONS.length).toBeGreaterThan(0);
    CURRENCY_SUGGESTIONS.forEach((c) => {
      expect(c.symbol).toMatch(/^[A-Z]{3}$/);
      expect(c.name.length).toBeGreaterThan(0);
    });
    const symbols = CURRENCY_SUGGESTIONS.map((c) => c.symbol);
    expect(new Set(symbols).size).toBe(symbols.length);
  });

  it("bank suggestions are non-empty and unique", () => {
    expect(BANK_SUGGESTIONS.length).toBeGreaterThan(0);
    const lower = BANK_SUGGESTIONS.map((b) => b.toLowerCase());
    expect(new Set(lower).size).toBe(lower.length);
  });
});
