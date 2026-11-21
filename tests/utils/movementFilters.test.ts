import { describe, it, expect } from "vitest";
import {
  DEFAULT_MOVEMENT_FILTERS,
  clearMovementFilters,
  countActiveFilters,
  restoreFilters,
  toPersistedFilters,
} from "@/utils/movementFilters";
import { TypeEnum } from "@/enums/TypeEnum";

describe("movementFilters", () => {
  it("counts each non-empty group once and ignores isLive", () => {
    expect(countActiveFilters({ ...DEFAULT_MOVEMENT_FILTERS, isLive: false })).toBe(0);
    expect(
      countActiveFilters({
        description: "cafe",
        type: [TypeEnum.DEBITO, TypeEnum.INGRESO],
        bank: ["GALICIA"],
        categories: [],
        currency: ["ARS"],
        isLive: true,
      }),
    ).toBe(4);
  });

  it("clears every group but keeps the Actuales/Históricos tab", () => {
    const cleared = clearMovementFilters({
      description: "cafe",
      type: [TypeEnum.DEBITO],
      bank: ["GALICIA"],
      categories: ["Super"],
      currency: ["ARS"],
      isLive: false,
    });
    expect(cleared).toEqual({ ...DEFAULT_MOVEMENT_FILTERS, isLive: false });
  });

  it("persists only type, bank, categories and currency", () => {
    const persisted = toPersistedFilters({
      description: "cafe",
      type: [TypeEnum.DEBITO],
      bank: ["GALICIA"],
      categories: ["Super"],
      currency: ["ARS"],
      isLive: false,
    });
    expect(Object.keys(persisted).sort()).toEqual(["bank", "categories", "currency", "type"]);
  });

  it("restores defaults for missing or malformed storage content", () => {
    expect(restoreFilters(null)).toEqual(DEFAULT_MOVEMENT_FILTERS);
    expect(restoreFilters("nope")).toEqual(DEFAULT_MOVEMENT_FILTERS);
    expect(restoreFilters({ bank: "GALICIA", currency: [1, "ARS"] })).toEqual({
      ...DEFAULT_MOVEMENT_FILTERS,
      currency: ["ARS"],
    });
  });
});
