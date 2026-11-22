import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import React from "react";

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("@/apis/auth/protectedRouteGuard", () => ({
  protectedRouteGuard: () => () => undefined,
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opts: { component: ReactNode }) => opts,
}));

const roles = vi.hoisted(() => ({ isAdmin: false }));
vi.mock("@/apis/hooks/useUserRoles", () => ({
  useUserRoles: () => ({ isAdmin: roles.isAdmin }),
}));

// ── Import después de mocks ────────────────────────────────────────────────

const { Route } = await import("@/routes/help");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RouteComponent = (Route as any).component as React.FC;

// ── Helpers ────────────────────────────────────────────────────────────────

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function renderHelp() {
  return render(<RouteComponent />, { wrapper: makeWrapper() });
}

const searchBox = () => screen.getByRole("textbox", { name: "Buscar en la ayuda" });

// ── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  roles.isAdmin = false;
  window.history.replaceState(null, "", "/help");
});

describe("Help route — renderizado inicial", () => {
  it("renderiza el título 'Centro de Ayuda' como único h1", () => {
    renderHelp();

    expect(screen.getByText("Centro de Ayuda")).toBeInTheDocument();
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent("Centro de Ayuda");
  });

  it("renderiza el subtítulo descriptivo", () => {
    renderHelp();

    expect(
      screen.getByText("Aprendé a usar todas las funciones de la aplicación"),
    ).toBeInTheDocument();
  });

  it("agrupa las secciones bajo cuatro h2", () => {
    renderHelp();

    const h2s = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(h2s).toEqual(["Empezar", "Uso diario", "Planificación", "Cuenta y grupo"]);
  });

  it("renderiza las secciones, incluidas las nuevas", () => {
    renderHelp();

    [
      "¿Qué es un Workspace?",
      "Cómo invitar miembros",
      "Roles y permisos",
      "Movimientos y gastos",
      "Importar el extracto del banco",
      "Exportar movimientos",
      "Servicios y suscripciones",
      "Ingresos",
      "Presupuestos",
      "Metas de ahorro",
      "Dashboard",
      "Insights, racha y proyección",
      "Utilidades: tiempo de recuperación",
      "Ajustes",
    ].forEach((title) => expect(screen.getByText(title)).toBeInTheDocument());
    expect(screen.queryByText("Balance y reportes")).not.toBeInTheDocument();
  });

  it("sin hash, deja abierta solo la primera sección", () => {
    renderHelp();

    expect(
      screen.getByText(/Un Workspace \(espacio de trabajo\) es el lugar/),
    ).toBeVisible();
    expect(screen.queryByText(/Si tu banco te da el resumen en PDF/)).not.toBeInTheDocument();
  });

  it("no muestra ningún email de soporte inventado", () => {
    const { container } = renderHelp();

    expect(container).not.toHaveTextContent("soporte@movements.app");
    expect(screen.queryByText(/Escribinos a/)).not.toBeInTheDocument();
  });

  it("el icono del header es un tile plano que no se encoge", () => {
    renderHelp();

    const tile = screen.getByTestId("help-header-icon");
    expect(tile).toHaveStyle({ flexShrink: "0" });
    expect(tile.style.background).not.toContain("gradient");
    expect(tile.style.boxShadow).toBe("");
  });
});

describe("Help route — secciones con collapse", () => {
  it("al abrir otra sección, la primera sigue abierta (sin acordeón)", async () => {
    const user = userEvent.setup();
    renderHelp();

    await user.click(screen.getByText("Cómo invitar miembros"));

    expect(screen.getByText(/Solo necesitás su correo electrónico/)).toBeInTheDocument();
    expect(screen.getByText(/Un Workspace \(espacio de trabajo\) es el lugar/)).toBeVisible();
  });

  it("el tip se muestra como callout con borde completo, sin franja lateral", () => {
    renderHelp();

    const tip = screen.getByTestId("help-tip");
    expect(tip).toHaveTextContent(/Podés cambiar entre tus workspaces desde el selector/);
    expect(tip.style.border).toMatch(/^1px solid/);
    expect(tip.style.borderLeftWidth).toBe(tip.style.borderTopWidth);
    expect(tip.style.borderLeftWidth).toBe("1px");
    expect(within(tip).getByRole("img", { hidden: true })).toBeInTheDocument();
  });

  it("las secciones nuevas usan las etiquetas reales de la UI", async () => {
    const user = userEvent.setup();
    renderHelp();

    await user.click(screen.getByText("Importar el extracto del banco"));
    expect(screen.getByText(/Por ahora solo se acepta Santander/)).toBeInTheDocument();
    expect(screen.getByText(/Elegí la pestaña "Importar PDF"/)).toBeInTheDocument();
  });
});

describe("Help route — rol Admin", () => {
  it("no muestra el Panel de administración a quien no es ADMIN", () => {
    roles.isAdmin = false;
    renderHelp();

    expect(screen.queryByText("Panel de administración")).not.toBeInTheDocument();
    expect(screen.getByText("Roles y permisos")).toBeInTheDocument();
  });

  it("muestra el Panel de administración a un ADMIN", () => {
    roles.isAdmin = true;
    renderHelp();

    expect(screen.getByText("Panel de administración")).toBeInTheDocument();
  });
});

describe("Help route — búsqueda", () => {
  it("tiene un campo de búsqueda con label accesible", () => {
    renderHelp();

    expect(searchBox()).toBeInTheDocument();
  });

  it("filtra por texto del cuerpo sin importar mayúsculas ni tildes y expande las coincidencias", async () => {
    const user = userEvent.setup();
    renderHelp();

    await user.type(searchBox(), "EXTRACTO");

    expect(screen.getByText("Importar el extracto del banco")).toBeInTheDocument();
    expect(screen.queryByText("Ingresos")).not.toBeInTheDocument();
    expect(screen.queryByText("¿Qué es un Workspace?")).not.toBeInTheDocument();
    expect(screen.getByText(/Por ahora solo se acepta Santander/)).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent(/1 sección encontrada/);
  });

  it("ignora tildes: 'planificacion' encuentra texto acentuado", async () => {
    const user = userEvent.setup();
    renderHelp();

    await user.type(searchBox(), "proyeccion");

    expect(screen.getByText("Insights, racha y proyección")).toBeInTheDocument();
    expect(screen.queryByText("Ajustes")).not.toBeInTheDocument();
  });

  it("muestra un mensaje cuando no hay resultados", async () => {
    const user = userEvent.setup();
    renderHelp();

    await user.type(searchBox(), "zzzxxy");

    expect(screen.getByText(/No encontramos nada para "zzzxxy"/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  });

  it("al borrar la búsqueda vuelven todas las secciones", async () => {
    const user = userEvent.setup();
    renderHelp();

    await user.type(searchBox(), "zzzxxy");
    await user.clear(searchBox());

    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(4);
    expect(screen.getByText("¿Qué es un Workspace?")).toBeInTheDocument();
  });
});

describe("Help route — deep links", () => {
  it("abre la sección indicada por el hash", () => {
    window.history.replaceState(null, "", "/help#importar-extracto");
    renderHelp();

    expect(screen.getByText(/Por ahora solo se acepta Santander/)).toBeVisible();
    expect(screen.queryByText(/Un Workspace \(espacio de trabajo\) es el lugar/)).not.toBeInTheDocument();
  });

  it("un hash desconocido cae en la primera sección", () => {
    window.history.replaceState(null, "", "/help#no-existe");
    renderHelp();

    expect(screen.getByText(/Un Workspace \(espacio de trabajo\) es el lugar/)).toBeVisible();
  });

  it("mantiene el hash sincronizado con la última sección abierta", async () => {
    const user = userEvent.setup();
    renderHelp();

    await user.click(screen.getByText("Exportar movimientos"));

    expect(window.location.hash).toBe("#exportar-movimientos");
    expect(window.location.pathname).toBe("/help");
  });
});
