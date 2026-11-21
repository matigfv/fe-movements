import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, afterAll } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App as AntdApp } from "antd";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { ReactNode } from "react";
import type React from "react";
import type { Service } from "@/models/Service";

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("@/apis/auth/protectedRouteGuard", () => ({
  protectedRouteGuard: () => () => undefined,
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opts: { component: ReactNode }) => opts,
  useNavigate: () => vi.fn(),
}));

vi.mock("@/apis/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({
    data: { id: 1, email: "test@test.com", userType: "PERSONAL" },
    isLoading: false,
  }),
}));

vi.mock("@/apis/websocket/useServiceSubscription", () => ({
  useServiceSubscription: () => null,
}));

let mockReadOnly = false;
vi.mock("@/apis/workspace/useIsReadOnly", () => ({
  useIsReadOnly: () => mockReadOnly,
}));

let mockServices: Service[] = [];
const mockAdd = vi.fn();
vi.mock("@/apis/hooks/useService", () => ({
  useSubscription: () => ({ data: mockServices, isFetching: false }),
  usePayService: () => ({ mutateAsync: vi.fn() }),
  useUpdateService: () => ({ mutate: vi.fn() }),
  useAddService: () => ({ mutate: mockAdd }),
}));

vi.mock("@/components/services/ServiceCard", () => ({
  ServiceCard: ({ service, showOwner }: { service: Service; showOwner?: boolean }) => (
    <div data-testid="service-card" data-show-owner={String(showOwner)}>
      {service.description}
    </div>
  ),
}));

// ── Import after mocks ─────────────────────────────────────────────────────

const { Route } = await import("@/routes/services");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RouteComponent = (Route as any).component as React.FC;

// ── Fixtures / MSW ─────────────────────────────────────────────────────────

const makeService = (id: number, description: string, user = "me"): Service => ({
  id,
  description,
  user,
  amount: 100,
  isPaid: false,
  lastPayment: null,
  currency: { symbol: "ARS" },
} as unknown as Service);

const server = setupServer(
  http.get("http://localhost:8080/workspace/currencies", () =>
    HttpResponse.json([
      { id: 1, symbol: "ARS", description: "Peso", workspaceId: null, isDeletable: false },
    ]),
  ),
  http.get("http://localhost:8080/settings/defaults/DEFAULT_CURRENCY", () =>
    HttpResponse.json({ key: "DEFAULT_CURRENCY", value: 1 }),
  ),
);

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RouteComponent />
      </AntdApp>
    </QueryClientProvider>,
  );
}

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
beforeEach(() => {
  mockReadOnly = false;
  mockServices = [makeService(1, "Netflix"), makeService(2, "Luz")];
  mockAdd.mockClear();
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("Services route", () => {
  it("does not render the form inline when there are services; the first grid item is a service", async () => {
    renderPage();

    expect(await screen.findByRole("button", { name: /agregar servicio/i })).toBeInTheDocument();
    expect(screen.queryByLabelText("Descripción")).not.toBeInTheDocument();
    const cards = screen.getAllByTestId("service-card");
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent("Netflix");
  });

  it("opens a modal with the four fields from the add button", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: /agregar servicio/i }));
    const dialog = await screen.findByRole("dialog");

    expect(await within(dialog).findByLabelText("Descripción")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Monto")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Moneda")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Estado")).toBeInTheDocument();
  });

  it("shows the same validation messages and keeps the modal open on invalid data", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: /agregar servicio/i }));
    const dialog = await screen.findByRole("dialog");
    await user.click(await within(dialog).findByRole("button", { name: /agregar servicio/i }));

    expect(await within(dialog).findByText("Ingrese una descripción")).toBeInTheDocument();
    expect(mockAdd).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("submits a valid form with the add payload and closes the modal", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: /agregar servicio/i }));
    const dialog = await screen.findByRole("dialog");
    await user.type(await within(dialog).findByLabelText("Descripción"), "Spotify");
    await user.type(within(dialog).getByLabelText("Monto"), "12.5");
    await waitFor(() =>
      expect(within(dialog).getByText("ARS")).toBeInTheDocument(),
    );
    await user.click(within(dialog).getByRole("button", { name: /agregar servicio/i }));

    await waitFor(() =>
      expect(mockAdd).toHaveBeenCalledWith({
        description: "Spotify",
        amount: 12.5,
        lastPayment: null,
        isPaid: false,
        currency: { symbol: "ARS" },
      }),
    );
    // jsdom never finishes the leave animation, so the leave class is the close signal.
    await waitFor(() => expect(dialog).toHaveClass("ant-zoom-leave"));
  });

  it("does not ask the cards to show the owner when all services share one owner", async () => {
    renderPage();

    const cards = await screen.findAllByTestId("service-card");
    cards.forEach((c) => expect(c).toHaveAttribute("data-show-owner", "false"));
  });

  it("asks the cards to show the owner when there are two distinct owners", async () => {
    mockServices = [makeService(1, "Netflix", "ana"), makeService(2, "Luz", "beto")];
    renderPage();

    const cards = await screen.findAllByTestId("service-card");
    cards.forEach((c) => expect(c).toHaveAttribute("data-show-owner", "true"));
  });

  it("renders a visually hidden page heading", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { level: 1, name: "Servicios" })).toBeInTheDocument();
  });

  it("hides the add button for read-only users", async () => {
    mockReadOnly = true;
    renderPage();

    await screen.findAllByTestId("service-card");
    expect(screen.queryByRole("button", { name: /agregar servicio/i })).not.toBeInTheDocument();
  });

  it("keeps the inline form in the empty state", async () => {
    mockServices = [];
    renderPage();

    expect(await screen.findByLabelText("Descripción")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
