import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act, waitFor, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { notification } from "antd";
import { useUndoablePay } from "@/utils/useUndoablePay";

function setup(onPay = vi.fn().mockResolvedValue(undefined), delayMs = 50) {
  const hook = renderHook(() =>
    useUndoablePay<number>({ getId: (n) => n, onPay, delayMs }),
  );
  return { ...hook, onPay };
}

describe("useUndoablePay", () => {
  afterEach(async () => {
    // The static notification renders in its own root; let it settle before teardown.
    await act(async () => {
      notification.destroy();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
  });

  it("marks the item as paid right away without calling onPay", () => {
    const { result, onPay } = setup();

    act(() => result.current.requestPay(1));

    expect(result.current.isOptimisticallyPaid(1)).toBe(true);
    expect(onPay).not.toHaveBeenCalled();
  });

  it("calls onPay exactly once when the undo window expires, then drops the optimistic flag", async () => {
    const { result, onPay } = setup();

    act(() => result.current.requestPay(1));

    await waitFor(() => expect(onPay).toHaveBeenCalledTimes(1));
    expect(onPay).toHaveBeenCalledWith(1);
    await waitFor(() => expect(result.current.isOptimisticallyPaid(1)).toBe(false));
  });

  it("cancels without sending any request when the user presses Undo", async () => {
    const { result, onPay } = setup(vi.fn().mockResolvedValue(undefined), 300);

    act(() => result.current.requestPay(1));
    await userEvent.click(await screen.findByRole("button", { name: /deshacer/i }));

    expect(result.current.isOptimisticallyPaid(1)).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(onPay).not.toHaveBeenCalled();
  });

  it("flushes the pending pay immediately on unmount instead of dropping it", () => {
    const { result, unmount, onPay } = setup(vi.fn().mockResolvedValue(undefined), 5000);

    act(() => result.current.requestPay(1));
    unmount();

    expect(onPay).toHaveBeenCalledTimes(1);
    expect(onPay).toHaveBeenCalledWith(1);
  });

  it("flushes on pagehide and does not send twice afterwards", async () => {
    const { result, unmount, onPay } = setup(vi.fn().mockResolvedValue(undefined), 5000);

    act(() => result.current.requestPay(1));
    window.dispatchEvent(new Event("pagehide"));
    unmount();

    expect(onPay).toHaveBeenCalledTimes(1);
  });

  it("rolls back the optimistic flag when the request fails", async () => {
    const { result, onPay } = setup(vi.fn().mockRejectedValue(new Error("boom")));

    act(() => result.current.requestPay(1));

    await waitFor(() => expect(onPay).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.isOptimisticallyPaid(1)).toBe(false));
  });
});
