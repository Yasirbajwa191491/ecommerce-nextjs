import type { PaginationOptions } from "convex/server";

export function paginateArray<T>(
  items: T[],
  paginationOpts: PaginationOptions
): { page: T[]; isDone: boolean; continueCursor: string } {
  const start = paginationOpts.cursor ? Number(paginationOpts.cursor) : 0;
  const page = items.slice(start, start + paginationOpts.numItems);
  const nextStart = start + paginationOpts.numItems;
  const isDone = nextStart >= items.length;
  return {
    page,
    isDone,
    continueCursor: isDone ? "" : String(nextStart),
  };
}
