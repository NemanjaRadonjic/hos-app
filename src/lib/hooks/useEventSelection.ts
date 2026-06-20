import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { HosEvent } from "@/lib/types";

export function useEventSelection(events: HosEvent[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const canSelect = useCallback(
    (ids: Iterable<string>) => {
      const idSet = new Set(ids);
      const blocked = events.some((event) => event.i && idSet.has(event._id));

      if (blocked) {
        toast.error("Locked events cannot be selected.");

        return false;
      }

      return true;
    },
    [events],
  );

  const setSelection = useCallback(
    (nextIds: Set<string>) => {
      if (!canSelect(nextIds)) return;
      setSelectedIds(nextIds);
    },
    [canSelect],
  );

  const toggleSelectedId = useCallback(
    (id: string) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);

        if (!canSelect(next)) return prev;

        return next;
      });
    },
    [canSelect],
  );

  const resetSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return {
    selectedIds,
    setSelection,
    toggleSelectedId,
    resetSelection,
  };
}
