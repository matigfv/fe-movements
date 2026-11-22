import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DefaultPill, SettingSection } from "@/components/settings/SettingSection";

describe("SettingSection", () => {
  it("renderiza título, subtítulo, extra, contenido e ícono", () => {
    render(
      <SettingSection
        icon={<span data-testid="icon" />}
        title="Mis Bancos"
        subtitle="Gestioná tus bancos"
        extra={<button type="button">Agregar</button>}
      >
        <p>contenido</p>
      </SettingSection>,
    );

    expect(screen.getByRole("heading", { level: 5, name: "Mis Bancos" })).toBeInTheDocument();
    expect(screen.getByText("Gestioná tus bancos")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Agregar" })).toBeInTheDocument();
    expect(screen.getByText("contenido")).toBeInTheDocument();
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("no usa gradiente ni sombra en el ícono", () => {
    render(<SettingSection icon={<span />} title="Título" />);
    const tile = screen.getByTestId("setting-section-icon");
    expect(tile.style.background).not.toContain("gradient");
    expect(tile.style.boxShadow).toBe("");
  });

  it("omite el subtítulo cuando no se pasa", () => {
    render(<SettingSection icon={<span />} title="Título" />);
    expect(screen.getByText("Título")).toBeInTheDocument();
  });
});

describe("DefaultPill", () => {
  it("muestra el texto recibido", () => {
    render(<DefaultPill>Predeterminado</DefaultPill>);
    expect(screen.getByText("Predeterminado")).toBeInTheDocument();
  });
});
