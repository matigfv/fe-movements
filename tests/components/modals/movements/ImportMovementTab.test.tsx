import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App as AntdApp } from "antd";
import ImportMovementTab from "@/components/modals/movements/ImportMovementTab";

function renderTab() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <ImportMovementTab />
      </AntdApp>
    </QueryClientProvider>,
  );
}

describe("ImportMovementTab", () => {
  it("muestra un link de ayuda al apartado de importar el extracto, en una pestaña nueva", () => {
    renderTab();

    const link = screen.getByRole("link", { name: /Ver ayuda sobre importar el extracto/ });
    expect(link).toHaveAttribute("href", "/help#importar-extracto");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });
});
