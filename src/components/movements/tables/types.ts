import type React from "react";
import type { Movement } from "@/models/Movement";

export interface FormattedMovement extends Movement {
  formattedDate: string;
  currencySymbol: React.ReactNode;
  installments: string;
  isDebit: boolean;
  amountColor: string;
  amountStyle: React.CSSProperties;
  typeIndicator: React.ReactNode;
  amountSign: string;
  isPendingRemoval: boolean;
  /** Briefly true for rows just changed by a bulk categorize. */
  isHighlighted?: boolean;
}

export interface MovementTableViewProps {
  movements: FormattedMovement[];
  onDelete: (id: number) => void;
  getCardStyle: (record: FormattedMovement) => React.CSSProperties;
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  /** True when every selectable (non-pending) row on the page is selected. */
  allSelected: boolean;
  /** True when at least one row is selected. */
  someSelected: boolean;
  onToggleSelectAll: () => void;
  expandedIds: Set<number>;
  onToggleExpand: (id: number) => void;
  animateEntrance: boolean;
  /** Rendered under the empty message (e.g. a clear-filters button). */
  emptyAction?: React.ReactNode;
}
