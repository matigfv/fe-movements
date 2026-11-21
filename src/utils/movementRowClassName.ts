import type { FormattedMovement } from "@/components/movements/tables/types";

/** Shared by the three table views: entrance fade on first load, soft highlight after a bulk categorize. */
export function movementRowClassName(record: FormattedMovement, animateEntrance: boolean) {
  const classes = [animateEntrance && "list-row-enter", record.isHighlighted && "row-highlighted"];
  return classes.filter(Boolean).join(" ") || undefined;
}
