export type AdminColumnDef = {
  id: string;
  label: string;
  locked?: boolean;
  defaultVisible?: boolean;
};

export function isColumnVisible(
  column: AdminColumnDef,
  visibility: Record<string, boolean>
): boolean {
  if (column.locked) return true;
  return visibility[column.id] !== false;
}

export function loadColumnVisibility(
  storageKey: string,
  columns: AdminColumnDef[]
): Record<string, boolean> {
  if (typeof window === "undefined") {
    return buildDefaultVisibility(columns);
  }
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return buildDefaultVisibility(columns);
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return mergeVisibility(columns, parsed);
  } catch {
    return buildDefaultVisibility(columns);
  }
}

export function saveColumnVisibility(
  storageKey: string,
  visibility: Record<string, boolean>
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(visibility));
}

function buildDefaultVisibility(columns: AdminColumnDef[]): Record<string, boolean> {
  return Object.fromEntries(
    columns.map((col) => [col.id, col.defaultVisible !== false])
  );
}

function mergeVisibility(
  columns: AdminColumnDef[],
  stored: Record<string, boolean>
): Record<string, boolean> {
  const defaults = buildDefaultVisibility(columns);
  const merged = { ...defaults };
  for (const col of columns) {
    if (col.locked) {
      merged[col.id] = true;
      continue;
    }
    if (typeof stored[col.id] === "boolean") {
      merged[col.id] = stored[col.id];
    }
  }
  return merged;
}
