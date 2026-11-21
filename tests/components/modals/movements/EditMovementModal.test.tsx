import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import EditMovementModal from "@/components/modals/movements/EditMovementModal";
import type { Movement } from "@/models/Movement";

vi.mock("@/components/modals/movements/AddMovementExpenseTab", () => ({
  default: () => null,
}));

const movement = { id: 1 } as Movement;

describe("EditMovementModal trigger", () => {
  it("keeps its compact default size", () => {
    render(<EditMovementModal movement={movement} />);

    const button = screen.getByRole("button", { name: "Editar el movimiento" });
    expect(button.style.minWidth).toBe("");
    expect(button.style.minHeight).toBe("");
  });

  it("is at least 44x44px with the touch prop", () => {
    render(<EditMovementModal movement={movement} touch />);

    const button = screen.getByRole("button", { name: "Editar el movimiento" });
    expect(button.style.minWidth).toBe("44px");
    expect(button.style.minHeight).toBe("44px");
  });
});
