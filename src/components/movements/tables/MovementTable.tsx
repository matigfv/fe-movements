import { useEffect, useMemo, useRef, useState } from "react";
import { App, Button, Card, Flex, Grid, Pagination, Row, Spin, Tag, theme } from "antd";
import ArrowDownOutlined from "@ant-design/icons/ArrowDownOutlined";
import ArrowUpOutlined from "@ant-design/icons/ArrowUpOutlined";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { CreateMovementForm, Movement } from "@/models/Movement";
import type { MovementFilters } from "@/routes/movements";
import type { FormattedMovement } from "@/components/movements/tables/types";
import { useDeleteMovement, useMovement } from "@/apis/hooks/useMovement";
import { updateExpense } from "@/apis/movement/MovementApi";
import { usePagination } from "@/apis/hooks/usePagination";
import dayjs from "dayjs";
import { TypeEnum, getTypeEnumLabel } from "@/enums/TypeEnum";
import { useMovementSubscription } from "@/apis/websocket/useMovementSubscription";
import MovementTableDesktop from "@/components/movements/tables/MovementTableDesktop";
import MovementTableTablet from "@/components/movements/tables/MovementTableTablet";
import MovementTableMobile from "@/components/movements/tables/MovementTableMobile";
import BulkActionsToolbar from "@/components/movements/tables/BulkActionsToolbar";
import BulkCategorizeModal from "@/components/movements/tables/BulkCategorizeModal";
import MovementsEmptyState from "@/components/movements/MovementsEmptyState";
import { useUndoableDelete } from "@/utils/useUndoableDelete";

const { useBreakpoint } = Grid;

const MOVEMENT_QUERY_KEY = "movement-history" as const;

function toMovementForm(movement: Movement, categories: string[]): CreateMovementForm {
  return {
    bank: movement.bank,
    description: movement.description,
    date: new Date(movement.date),
    currency: movement.currency?.symbol ?? "",
    amount: movement.amount,
    type: movement.type,
    cuotaActual: movement.cuotaActual ?? undefined,
    cuotasTotales: movement.cuotasTotales ?? undefined,
    categories,
  };
}

interface MovementTableProps {
  filters: MovementFilters;
  onStateChange?: (state: { isLoading: boolean; hasMovements: boolean }) => void;
  /** Resets the filters; offered in the empty state that filters caused. */
  onClearFilters?: () => void;
}

const HIGHLIGHT_MS = 2000;

export default function MovementTable({ filters, onStateChange, onClearFilters }: MovementTableProps) {
  const { page, goToPage, pageSize, changePageSize } = usePagination();
  const screens = useBreakpoint();
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { token } = theme.useToken();

  // Breakpoints: mobile < 768px, tablet 768-991px, desktop >= 992px
  const isMobile = !screens.md;
  const isTablet = screens.md && !screens.lg;
  const isDesktop = !!screens.lg;

  useMovementSubscription();

  const deleteMutation = useDeleteMovement();
  const {
    requestDelete,
    requestDeleteMany,
    isPending: isPendingRemoval,
  } = useUndoableDelete<number>({
    getId: (id) => id,
    onDelete: (id) => deleteMutation.mutateAsync(id),
    getBulkMessage: (ids) => t("movements.bulk.deleteAllSuccess", { count: ids.length }),
    onBulkSettled: (ids, results) => {
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed > 0) {
        void message.warning(
          t("movements.bulk.deleteSummary", { count: ids.length - failed, failed }),
        );
      }
    },
  });

  const { data: movements = { content: [], totalElements: 0, totalPages: 0 }, isLoading } =
    useMovement(filters, page, pageSize);

  const hasActiveFilters =
    !!filters.description ||
    filters.type.length > 0 ||
    filters.bank.length > 0 ||
    filters.categories.length > 0 ||
    filters.currency.length > 0;

  const hasMovements = hasActiveFilters || movements.totalElements > 0;

  // Rows fade in only on the first load; the class stays until the animation ends so a
  // re-render can't cancel it, and it never comes back on refetches or page/filter changes.
  const hasRows = movements.content.length > 0;
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  useEffect(() => {
    if (!hasRows) return;
    const timer = setTimeout(() => setIsFirstLoad(false), 300);
    return () => clearTimeout(timer);
  }, [hasRows]);

  useEffect(() => {
    onStateChange?.({ isLoading, hasMovements });
  }, [isLoading, hasMovements, onStateChange]);

  const handleDelete = (id: number) => requestDelete(id);

  // ── Selección múltiple y acciones en lote ──────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isBulkCategorizing, setIsBulkCategorizing] = useState(false);
  const [categorizeModalOpen, setCategorizeModalOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [highlightedIds, setHighlightedIds] = useState<Set<number>>(new Set());
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(highlightTimer.current), []);

  const highlightRows = (ids: number[]) => {
    clearTimeout(highlightTimer.current);
    setHighlightedIds(new Set(ids));
    highlightTimer.current = setTimeout(() => setHighlightedIds(new Set()), HIGHLIGHT_MS);
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectedMovements = movements.content.filter((m) => selectedIds.has(m.id));

  const handleBulkDelete = () => {
    requestDeleteMany(selectedMovements.map((m) => m.id));
    clearSelection();
  };

  const handleBulkCategorize = async (categories: string[]) => {
    setIsBulkCategorizing(true);
    try {
      const results = await Promise.allSettled(
        selectedMovements.map((m) => updateExpense(m.id, toMovementForm(m, categories))),
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      const succeeded = results.length - failed;
      highlightRows(selectedMovements.filter((_, i) => results[i].status === "fulfilled").map((m) => m.id));
      if (failed > 0) {
        void message.warning(
          t("movements.bulk.categorizeSummary", { count: succeeded, failed }),
        );
      } else {
        void message.success(t("movements.bulk.categorizeAllSuccess", { count: succeeded }));
      }
      void queryClient.invalidateQueries({ queryKey: [MOVEMENT_QUERY_KEY] });
      clearSelection();
      setCategorizeModalOpen(false);
    } finally {
      setIsBulkCategorizing(false);
    }
  };

  const formattedMovements = useMemo<FormattedMovement[]>(() => {
    const typeLabel = getTypeEnumLabel(t);
    return movements.content.map((m: Movement) => {
      const isDebit = m.type === TypeEnum.DEBITO || m.type === TypeEnum.CREDITO;
      const amountColor = isDebit ? token.colorErrorText : token.colorSuccessText;
      // Same convention as the dashboard KPIs: money in points up, money out points down.
      const Arrow = isDebit ? ArrowDownOutlined : ArrowUpOutlined;
      return {
        ...m,
        formattedDate: dayjs(m.date).format("DD/MM/YYYY"),
        currencySymbol: <Tag>{m.currency?.symbol || "-"}</Tag>,
        installments: m.cuotasTotales
          ? `${m.cuotaActual ?? "-"}/${m.cuotasTotales}`
          : "-",
        isDebit,
        amountColor,
        amountStyle: {
          color: amountColor,
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
        },
        typeIndicator: (
          <span
            role="img"
            aria-label={typeLabel[m.type as TypeEnum] ?? m.type}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 24,
              height: 24,
              borderRadius: "50%",
              marginRight: 8,
              verticalAlign: "middle",
              fontSize: 12,
              color: amountColor,
              backgroundColor: isDebit ? token.colorErrorBg : token.colorSuccessBg,
            }}
          >
            <Arrow aria-hidden />
          </span>
        ),
        amountSign: isDebit ? "-" : "+",
        isPendingRemoval: isPendingRemoval(m.id),
        isHighlighted: highlightedIds.has(m.id),
      };
    });
  }, [movements.content, isPendingRemoval, highlightedIds, token, t]);

  // Select-all only covers the rows on the current page and skips rows already being deleted.
  const selectableIds = formattedMovements.filter((m) => !m.isPendingRemoval).map((m) => m.id);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));
  const someSelected = selectedIds.size > 0;

  const handleToggleSelectAll = () =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      selectableIds.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });

  const getCardStyle = (record: FormattedMovement) => ({
    marginBottom: 8,
    backgroundColor: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: 6,
    transition: "all 0.3s",
    marginLeft: 0,
    marginRight: 0,
    ...(record.isHighlighted ? { backgroundColor: token.colorPrimaryBg } : {}),
    ...(record.isPendingRemoval
      ? { opacity: 0.45, filter: "grayscale(70%)", pointerEvents: "none" as const }
      : {}),
  });

  const viewProps = {
    movements: formattedMovements,
    onDelete: handleDelete,
    getCardStyle,
    selectedIds,
    onToggleSelect: handleToggleSelect,
    allSelected,
    someSelected,
    onToggleSelectAll: handleToggleSelectAll,
    expandedIds,
    onToggleExpand: handleToggleExpand,
    animateEntrance: isFirstLoad,
    emptyAction:
      hasActiveFilters && onClearFilters ? (
        <Button onClick={onClearFilters}>{t("movements.clearFilters")}</Button>
      ) : undefined,
  };

  if (isLoading) {
    return (
      <Flex justify="center" style={{ padding: "80px 0" }}>
        <Spin size="large" />
      </Flex>
    );
  }

  if (!hasActiveFilters && movements.totalElements === 0) {
    return <MovementsEmptyState />;
  }

  return (
    <Card title={t("nav.movements")} style={{ marginBottom: 16, padding: 0 }}>
      {isDesktop && <MovementTableDesktop {...viewProps} />}
      {isTablet && <MovementTableTablet {...viewProps} />}
      {isMobile && <MovementTableMobile {...viewProps} />}

      <Row justify="end" style={{ marginTop: 16 }}>
        <Pagination
          showSizeChanger
          pageSizeOptions={[10, 25, 50, 100]}
          pageSize={pageSize}
          total={movements?.totalElements || 0}
          current={page + 1}
          onChange={(p: number) => goToPage(p - 1)}
          onShowSizeChange={(_current, size) => changePageSize(size)}
        />
      </Row>

      <BulkActionsToolbar
        selectedCount={selectedIds.size}
        onBulkDelete={handleBulkDelete}
        onOpenCategorize={() => setCategorizeModalOpen(true)}
        onClearSelection={clearSelection}
      />

      <BulkCategorizeModal
        open={categorizeModalOpen}
        count={selectedIds.size}
        isSubmitting={isBulkCategorizing}
        onClose={() => setCategorizeModalOpen(false)}
        onConfirm={(categories) => void handleBulkCategorize(categories)}
      />
    </Card>
  );
}
