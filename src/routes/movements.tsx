import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import MovementTable from "@/components/movements/tables/MovementTable";
import MovementFilters from "@/components/movements/MovementFilters";
import { TypeEnum } from "@/enums/TypeEnum";
import AddMovementModal from "@/components/modals/movements/AddMovementModal";
import { protectedRouteGuard } from "@/apis/auth/protectedRouteGuard";
import { RoleEnum } from "@/enums/RoleEnum";
import { useCurrentWorkspace } from "@/apis/workspace/WorkspaceContext";
import { useLocalStorage } from "@/utils/useLocalStorage";
import {
  clearMovementFilters,
  movementFiltersStorageKey,
  restoreFilters,
  toPersistedFilters,
  type PersistedMovementFilters,
} from "@/utils/movementFilters";

export const Route = createFileRoute("/movements")({
  beforeLoad: protectedRouteGuard({
    roles: [RoleEnum.ADMIN, RoleEnum.FAMILY, RoleEnum.GUEST],
  }),
  component: RouteComponent,
});

export type MovementFilters = {
  description: string | null;
  type: TypeEnum[];
  bank: string[];
  categories: string[];
  isLive: boolean;
  currency: string[];
};

function RouteComponent() {
  const { currentWorkspace } = useCurrentWorkspace();
  const workspaceId = currentWorkspace?.workspaceId ?? "none";
  // Remount per workspace so each one loads its own stored filters.
  return <MovementsContent key={workspaceId} workspaceId={workspaceId} />;
}

function MovementsContent({ workspaceId }: { workspaceId: number | string }) {
  const [stored, setStored] = useLocalStorage<PersistedMovementFilters | null>(
    movementFiltersStorageKey(workspaceId),
    null,
  );
  const [filters, setFilters] = useState<MovementFilters>(() => restoreFilters(stored));
  const [tableState, setTableState] = useState({ isLoading: true, hasMovements: false });

  const handleFiltersChange = useCallback(
    (newFilters: MovementFilters) => {
      setFilters(newFilters);
      setStored(toPersistedFilters(newFilters));
    },
    [setStored],
  );

  const handleClearFilters = useCallback(
    () => handleFiltersChange(clearMovementFilters(filters)),
    [filters, handleFiltersChange],
  );

  return (
    <div style={{ paddingTop: 30 }}>
      {!tableState.isLoading && tableState.hasMovements && (
        <MovementFilters
          initialFilters={filters}
          onFiltersChange={handleFiltersChange}
          AddEditMovementModal={AddMovementModal}
        />
      )}
      <MovementTable
        filters={filters}
        onStateChange={setTableState}
        onClearFilters={handleClearFilters}
      />
    </div>
  );
}
