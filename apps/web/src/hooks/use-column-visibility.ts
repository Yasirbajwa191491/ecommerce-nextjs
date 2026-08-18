"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type AdminColumnDef,
  isColumnVisible,
  loadColumnVisibility,
  saveColumnVisibility,
} from "@/lib/admin/column-visibility";

export function useColumnVisibility(
  storageKey: string,
  columns: AdminColumnDef[]
) {
  const [visibility, setVisibility] = useState<Record<string, boolean>>(() =>
    loadColumnVisibility(storageKey, columns)
  );

  useEffect(() => {
    saveColumnVisibility(storageKey, visibility);
  }, [storageKey, visibility]);

  const toggleColumn = useCallback(
    (columnId: string) => {
      const column = columns.find((c) => c.id === columnId);
      if (!column || column.locked) return;
      setVisibility((prev) => ({
        ...prev,
        [columnId]: prev[columnId] === false,
      }));
    },
    [columns]
  );

  const isVisible = useCallback(
    (columnId: string) => {
      const column = columns.find((c) => c.id === columnId);
      if (!column) return false;
      return isColumnVisible(column, visibility);
    },
    [columns, visibility]
  );

  const visibleCount = useMemo(
    () => columns.filter((col) => isColumnVisible(col, visibility)).length,
    [columns, visibility]
  );

  return {
    columns,
    visibility,
    toggleColumn,
    isVisible,
    totalCount: columns.length,
    visibleCount,
  };
}
