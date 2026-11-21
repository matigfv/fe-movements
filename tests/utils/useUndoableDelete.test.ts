import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act, waitFor, screen } from "@testing-library/react";
import { notification } from "antd";
import { useUndoableDelete } from "@/utils/useUndoableDelete";

// ── Helpers ────────────────────────────────────────────────────────────────

function setup<T>(overrides: Partial<Parameters<typeof useUndoableDelete<T>>[0]> = {}) {
  const onDelete = vi.fn().mockResolvedValue(undefined);
  const hook = renderHook(() =>
    useUndoableDelete<T>({
      getId: (item) => item as unknown as number,
      onDelete,
      delayMs: 50,
      ...overrides,
    } as Parameters<typeof useUndoableDelete<T>>[0]),
  );
  return { ...hook, onDelete };
}

describe("useUndoableDelete", () => {
  afterEach(async () => {
    // Wiping document.body would detach antd's cached notification holder; destroy the notices instead.
    await act(async () => {
      notification.destroy();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
  });

  describe("requestDelete (individual)", () => {
    it("marca el ítem como pendiente inmediatamente, sin llamar a onDelete todavía", () => {
      const { result, onDelete } = setup<number>();

      act(() => result.current.requestDelete(1));

      expect(result.current.isPending(1)).toBe(true);
      expect(onDelete).not.toHaveBeenCalled();
    });

    it("llama a onDelete recién cuando expira la ventana de deshacer", async () => {
      const { result, onDelete } = setup<number>();

      act(() => result.current.requestDelete(1));

      await waitFor(() => expect(onDelete).toHaveBeenCalledWith(1));
      await waitFor(() => expect(result.current.isPending(1)).toBe(false));
    });
  });

  describe("fallo del borrado", () => {
    it("muestra un error visible cuando onDelete rechaza", async () => {
      const { result } = setup<number>({ onDelete: vi.fn().mockRejectedValue(new Error("boom")) });

      act(() => result.current.requestDelete(1));

      expect(await screen.findByText(/no se pudo eliminar/i)).toBeInTheDocument();
    });
  });

  describe("requestDeleteMany (lote)", () => {
    it("marca todos los ítems del lote como pendientes inmediatamente", () => {
      const { result, onDelete } = setup<number>();

      act(() => result.current.requestDeleteMany([1, 2, 3]));

      expect(result.current.isPending(1)).toBe(true);
      expect(result.current.isPending(2)).toBe(true);
      expect(result.current.isPending(3)).toBe(true);
      expect(onDelete).not.toHaveBeenCalled();
    });

    it("llama a onDelete para cada ítem del lote recién cuando expira la ventana", async () => {
      const { result, onDelete } = setup<number>();

      act(() => result.current.requestDeleteMany([1, 2, 3]));

      await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(3));
      expect(onDelete).toHaveBeenCalledWith(1);
      expect(onDelete).toHaveBeenCalledWith(2);
      expect(onDelete).toHaveBeenCalledWith(3);
      await waitFor(() => {
        expect(result.current.isPending(1)).toBe(false);
        expect(result.current.isPending(2)).toBe(false);
        expect(result.current.isPending(3)).toBe(false);
      });
    });

    it("no hace nada si se llama con un array vacío", () => {
      const { result, onDelete } = setup<number>();

      act(() => result.current.requestDeleteMany([]));

      expect(onDelete).not.toHaveBeenCalled();
    });

    it("invoca onBulkSettled con los resultados en vez de la notificación genérica de error", async () => {
      const onDelete = vi.fn().mockResolvedValue(undefined);
      const onBulkSettled = vi.fn();
      const { result } = renderHook(() =>
        useUndoableDelete<number>({
          getId: (id) => id,
          onDelete,
          onBulkSettled,
          delayMs: 50,
        }),
      );

      act(() => result.current.requestDeleteMany([1, 2]));

      await waitFor(() => expect(onBulkSettled).toHaveBeenCalledTimes(1));
      expect(onBulkSettled).toHaveBeenCalledWith(
        [1, 2],
        [
          { status: "fulfilled", value: undefined },
          { status: "fulfilled", value: undefined },
        ],
      );
    });
  });
});
