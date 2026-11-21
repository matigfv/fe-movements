import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App as AntdApp } from "antd";
import BulkActionsToolbar from "@/components/movements/tables/BulkActionsToolbar";

const renderToolbar = (selectedCount: number) =>
  render(
    <AntdApp>
      <BulkActionsToolbar
        selectedCount={selectedCount}
        onBulkDelete={() => {}}
        onOpenCategorize={() => {}}
        onClearSelection={() => {}}
      />
    </AntdApp>,
  );

describe("BulkActionsToolbar", () => {
  it("uses the singular for one selected movement", () => {
    renderToolbar(1);
    expect(screen.getByText("1 seleccionado")).toBeInTheDocument();
  });

  it("uses the plural for several selected movements", () => {
    renderToolbar(3);
    expect(screen.getByText("3 seleccionados")).toBeInTheDocument();
  });

  it("opens a centered, correctly pluralized delete confirmation", async () => {
    const user = userEvent.setup();
    renderToolbar(1);
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    expect((await screen.findAllByText("¿Eliminar 1 movimiento?")).length).toBeGreaterThan(0);
    expect(document.querySelector(".ant-modal-centered")).not.toBeNull();
  });
});
