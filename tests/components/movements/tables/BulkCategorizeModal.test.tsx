import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import BulkCategorizeModal from "@/components/movements/tables/BulkCategorizeModal";

vi.mock("@/apis/hooks/useCategory", () => ({ useCategory: () => ({ data: [] }) }));

const renderModal = (count: number) =>
  render(<BulkCategorizeModal open count={count} onClose={() => {}} onConfirm={() => {}} />);

describe("BulkCategorizeModal", () => {
  it("uses the singular title for one movement", () => {
    renderModal(1);
    expect(screen.getByText("Categorizar 1 movimiento")).toBeInTheDocument();
  });

  it("uses the plural title for several movements", () => {
    renderModal(3);
    expect(screen.getByText("Categorizar 3 movimientos")).toBeInTheDocument();
  });
});
