import type { MovementFilters } from "@/routes/movements";

/** The filters worth remembering per workspace (description and the Actuales/Históricos tab are not). */
export type PersistedMovementFilters = Pick<
  MovementFilters,
  "type" | "bank" | "categories" | "currency"
>;

export const DEFAULT_MOVEMENT_FILTERS: MovementFilters = {
  description: null,
  type: [],
  bank: [],
  categories: [],
  isLive: true,
  currency: [],
};

export const movementFiltersStorageKey = (workspaceId: number | string) =>
  `movements.filters.${workspaceId}`;

/** Number of non-empty filter groups. `isLive` is a view switch, not a filter. */
export function countActiveFilters(filters: MovementFilters): number {
  return (
    (filters.description ? 1 : 0) +
    (filters.type.length > 0 ? 1 : 0) +
    (filters.bank.length > 0 ? 1 : 0) +
    (filters.categories.length > 0 ? 1 : 0) +
    (filters.currency.length > 0 ? 1 : 0)
  );
}

/** Resets every filter group but keeps the Actuales/Históricos tab. */
export function clearMovementFilters(filters: MovementFilters): MovementFilters {
  return { ...DEFAULT_MOVEMENT_FILTERS, isLive: filters.isLive };
}

export function toPersistedFilters(filters: MovementFilters): PersistedMovementFilters {
  const { type, bank, categories, currency } = filters;
  return { type, bank, categories, currency };
}

const asStrings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];

/** Storage content is untrusted: anything malformed falls back to the defaults. */
export function restoreFilters(stored: unknown): MovementFilters {
  if (typeof stored !== "object" || stored === null) return DEFAULT_MOVEMENT_FILTERS;
  const s = stored as Record<string, unknown>;
  return {
    ...DEFAULT_MOVEMENT_FILTERS,
    type: asStrings(s.type) as MovementFilters["type"],
    bank: asStrings(s.bank),
    categories: asStrings(s.categories),
    currency: asStrings(s.currency),
  };
}
