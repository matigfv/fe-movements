import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ReactNode } from "react";
import type { GoalRecord } from "@/models/Goal";

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opts: { component: ReactNode }) => opts,
}));

vi.mock("@/apis/auth/protectedRouteGuard", () => ({
  protectedRouteGuard: () => () => undefined,
}));

vi.mock("@/apis/workspace/WorkspaceContext", () => ({
  useCurrentWorkspace: () => ({
    currentWorkspace: { workspaceId: 10, id: 1, workspaceName: "Familia" },
    workspaces: [],
    setCurrentWorkspace: vi.fn(),
    isLoading: false,
  }),
}));

vi.mock("@/components/goals/GoalFormModal", () => ({
  AddGoalButton: () => <div data-testid="add-goal-button">AddGoalButton</div>,
  ContributeGoalModal: () => <div data-testid="contribute-goal-modal">ContributeGoalModal</div>,
  EditGoalModal: () => <div data-testid="edit-goal-modal">EditGoalModal</div>,
}));

vi.mock("@/components/home/StreakBanner", () => ({
  default: () => <div data-testid="streak-banner">StreakBanner</div>,
}));

vi.mock("@/components/home/BadgesPanel", () => ({
  default: () => <div data-testid="badges-panel">BadgesPanel</div>,
}));

const goal: GoalRecord = {
  id: 1,
  workspaceId: 10,
  name: "Viaje a Bariloche",
  targetAmount: 1000,
  currentAmount: 250,
  currency: { symbol: "ARS" },
  targetDate: null,
  progressPercent: 25,
  createdAt: "2026-01-01T00:00:00",
};

const deleteGoalMutateAsync = vi.fn().mockResolvedValue(undefined);
vi.mock("@/apis/hooks/useGoal", () => ({
  useGoals: () => ({ data: [goal], isFetching: false }),
  useDeleteGoal: () => ({
    mutate: vi.fn(),
    mutateAsync: deleteGoalMutateAsync,
    isPending: false,
    variables: undefined,
  }),
}));

// Test-double reactivo del hook de borrado deshacible: no espera los 7s
// reales, pero sí refleja isPending inmediatamente tras requestDelete.
const requestDeleteSpy = vi.fn();
vi.mock("@/utils/useUndoableDelete", () => ({
  useUndoableDelete: () => {
    const [pending, setPending] = useState<Set<number>>(new Set());
    return {
      requestDelete: (id: number) => {
        requestDeleteSpy(id);
        setPending((prev) => new Set(prev).add(id));
      },
      requestDeleteMany: vi.fn(),
      isPending: (id: number) => pending.has(id),
    };
  },
}));

// ── Import después de mocks ────────────────────────────────────────────────

const { Route } = await import("@/routes/goals");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RouteComponent = (Route as any).component as React.FC;

import React from "react";

// ── Helpers ────────────────────────────────────────────────────────────────

function renderGoals() {
  return render(<RouteComponent />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("Goals route — borrado deshacible", () => {
  it("no llama a deleteGoal.mutateAsync de inmediato al confirmar el borrado", async () => {
    const user = userEvent.setup();
    renderGoals();

    await user.click(screen.getByRole("button", { name: /Eliminar meta/i }));
    await user.click(await screen.findByRole("button", { name: "Eliminar" }));

    expect(requestDeleteSpy).toHaveBeenCalledWith(1);
    expect(deleteGoalMutateAsync).not.toHaveBeenCalled();
  });

  it("atenúa la tarjeta de la meta apenas se confirma el borrado", async () => {
    const user = userEvent.setup();
    const { container } = renderGoals();

    await user.click(screen.getByRole("button", { name: /Eliminar meta/i }));
    await user.click(await screen.findByRole("button", { name: "Eliminar" }));

    expect(container.querySelector('[style*="opacity: 0.45"]')).toBeInTheDocument();
  });
});

describe("Goals route — gamificación", () => {
  it("muestra la racha y los badges junto a las metas", () => {
    renderGoals();

    expect(screen.getByTestId("streak-banner")).toBeInTheDocument();
    expect(screen.getByTestId("badges-panel")).toBeInTheDocument();
    expect(screen.getByText("Viaje a Bariloche")).toBeInTheDocument();
  });
});

describe("Goals route — ayuda contextual", () => {
  it("enlaza a la sección de metas de la ayuda en una pestaña nueva", () => {
    renderGoals();

    const link = screen.getByRole("link", { name: /Ver ayuda sobre metas de ahorro/ });
    expect(link).toHaveAttribute("href", "/help#metas-de-ahorro");
    expect(link).toHaveAttribute("target", "_blank");
  });
});
