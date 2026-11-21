import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button, notification } from "antd";
import { useTranslation } from "react-i18next";

type Id = number | string;

interface UseUndoablePayOptions<T> {
  getId: (item: T) => Id;
  /** Real pay request, fired once the undo window expires (or is flushed). Failures roll the optimistic state back. */
  onPay: (item: T) => Promise<unknown> | void;
  getMessage?: (item: T) => string;
  delayMs?: number;
}

const DEFAULT_DELAY_MS = 5000;

/**
 * Delayed-commit "mark as paid": the item reads as paid immediately, a notification offers
 * "Undo", and the real request only fires when the window expires. Unlike `useUndoableDelete`,
 * unmounting (or closing the page) FLUSHES the pending request, because dropping an
 * acknowledged payment would be silent data loss.
 */
export function useUndoablePay<T>({
  getId,
  onPay,
  getMessage,
  delayMs = DEFAULT_DELAY_MS,
}: UseUndoablePayOptions<T>) {
  const { t } = useTranslation();
  const [optimisticIds, setOptimisticIds] = useState<Set<Id>>(new Set());
  const pendingRef = useRef<Map<Id, { timer: ReturnType<typeof setTimeout>; item: T }>>(
    new Map(),
  );
  const onPayRef = useRef(onPay);
  useLayoutEffect(() => {
    onPayRef.current = onPay;
  });

  const dropOptimistic = useCallback((id: Id) => {
    setOptimisticIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const keyOf = (id: Id) => `undoable-pay-${id}`;

  // Sends the request now; the optimistic flag stays until it settles so the card never flickers back.
  const commit = useCallback(
    (id: Id) => {
      const entry = pendingRef.current.get(id);
      if (!entry) return;
      clearTimeout(entry.timer);
      pendingRef.current.delete(id);
      notification.destroy(keyOf(id));
      void Promise.resolve(onPayRef.current(entry.item))
        .catch(() => {})
        .finally(() => dropOptimistic(id));
    },
    [dropOptimistic],
  );

  const flushAll = useCallback(() => {
    [...pendingRef.current.keys()].forEach(commit);
  }, [commit]);

  useEffect(() => {
    window.addEventListener("pagehide", flushAll);
    return () => {
      window.removeEventListener("pagehide", flushAll);
      flushAll();
    };
  }, [flushAll]);

  const requestPay = useCallback(
    (item: T) => {
      const id = getId(item);
      if (pendingRef.current.has(id)) return;

      setOptimisticIds((prev) => new Set(prev).add(id));
      pendingRef.current.set(id, { timer: setTimeout(() => commit(id), delayMs), item });

      notification.open({
        key: keyOf(id),
        message: getMessage ? getMessage(item) : t("common.undo.itemPaid"),
        placement: "bottomRight",
        duration: delayMs / 1000,
        btn: (
          <Button
            size="small"
            type="primary"
            onClick={() => {
              const entry = pendingRef.current.get(id);
              if (entry) clearTimeout(entry.timer);
              pendingRef.current.delete(id);
              dropOptimistic(id);
              notification.destroy(keyOf(id));
            }}
          >
            {t("common.undo.undoButton")}
          </Button>
        ),
      });
    },
    [getId, getMessage, delayMs, t, commit, dropOptimistic],
  );

  const isOptimisticallyPaid = useCallback(
    (item: T) => optimisticIds.has(getId(item)),
    [optimisticIds, getId],
  );

  return { requestPay, isOptimisticallyPaid };
}
