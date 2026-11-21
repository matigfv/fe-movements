import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from "vitest";
import { renderHook, waitFor, act, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { notification } from "antd";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { ReactNode } from "react";
import type { Service } from "@/models/Service";
import {
  useAddService,
  usePayService,
  useUpdateService,
} from "@/apis/hooks/useService";

const server = setupServer(
  http.patch("http://localhost:8080/subscriptions/:id/payment", () =>
    HttpResponse.json({ message: "no" }, { status: 500 }),
  ),
  http.patch("http://localhost:8080/subscriptions/:id", () =>
    HttpResponse.json({ message: "no" }, { status: 500 }),
  ),
  http.post("http://localhost:8080/subscriptions", () =>
    HttpResponse.json({ message: "no" }, { status: 500 }),
  ),
);

beforeAll(() => server.listen());
afterEach(async () => {
  server.resetHandlers();
  await act(async () => {
    notification.destroy();
    await new Promise((resolve) => setTimeout(resolve, 100));
  });
});
afterAll(() => server.close());

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

const service = { id: 1 } as Service;

describe("service mutations show a visible error on failure", () => {
  it("pay", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => usePayService(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(service).catch(() => {});
    });

    expect(await screen.findByText(/no se pudo marcar como pagado/i)).toBeInTheDocument();
  });

  it("update", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => useUpdateService(), { wrapper });

    await act(async () => {
      await result.current
        .mutateAsync({ id: 1, changes: { amount: 1, description: "x", lastPayment: null } })
        .catch(() => {});
    });

    expect(await screen.findByText(/no se pudo actualizar/i)).toBeInTheDocument();
  });

  it("add", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => useAddService(), { wrapper });

    await act(async () => {
      await result.current
        .mutateAsync({
          amount: 1,
          description: "x",
          currency: { id: 1, symbol: "ARS", description: "Peso" },
          lastPayment: null,
          isPaid: false,
        })
        .catch(() => {});
    });

    await waitFor(() =>
      expect(screen.getByText(/no se pudo agregar/i)).toBeInTheDocument(),
    );
  });
});
