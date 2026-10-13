export type IndexedPage<T> = {
  page: T[];
  isDone: boolean;
  continueCursor: string;
};

export type ScanCursor = {
  cursor: string | null;
  offset: number;
};

const SCAN_BATCH = 40;

export function encodeScanCursor(cursor: ScanCursor): string {
  return JSON.stringify(cursor);
}

export function decodeScanCursor(raw: string | null | undefined): ScanCursor {
  if (!raw) return { cursor: null, offset: 0 };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "offset" in parsed &&
      typeof parsed.offset === "number" &&
      Number.isInteger(parsed.offset) &&
      parsed.offset >= 0 &&
      "cursor" in parsed &&
      (parsed.cursor === null || typeof parsed.cursor === "string")
    ) {
      return { cursor: parsed.cursor, offset: parsed.offset };
    }
  } catch {
    // Numeric array offsets are not stable as rows are inserted. Restart.
  }
  return { cursor: null, offset: 0 };
}

function pageResult<T>(page: T[], isDone: boolean, cursor: ScanCursor): IndexedPage<T> {
  return {
    page,
    isDone,
    continueCursor: encodeScanCursor(cursor),
  };
}

/**
 * Fill one result page by walking an indexed Convex pagination stream.
 * Each call reads at most `maxScan` documents. The continue cursor resumes
 * at the indexed position, not an offset into a collected array.
 */
export async function paginateMatching<T>(
  loadPage: (opts: { numItems: number; cursor: string | null }) => Promise<IndexedPage<T>>,
  paginationOpts: { numItems: number; cursor: string | null },
  predicate: (item: T) => boolean,
  maxScan = 250
): Promise<IndexedPage<T>> {
  const pageSize = Math.min(Math.max(paginationOpts.numItems, 1), 100);
  let state = decodeScanCursor(paginationOpts.cursor);
  const matches: T[] = [];
  let scanned = 0;

  while (matches.length < pageSize && scanned < maxScan) {
    const batch = await loadPage({
      numItems: SCAN_BATCH,
      cursor: state.cursor,
    });

    if (state.offset > batch.page.length) {
      if (batch.isDone) {
        return pageResult(matches, true, { cursor: batch.continueCursor, offset: 0 });
      }
      state = { cursor: batch.continueCursor, offset: 0 };
      continue;
    }

    for (let index = state.offset; index < batch.page.length; index += 1) {
      const item = batch.page[index];
      scanned += 1;
      if (item !== undefined && predicate(item)) {
        matches.push(item);
      }

      const pageFull = matches.length >= pageSize;
      const scanFull = scanned >= maxScan;
      if (pageFull || scanFull) {
        const nextOffset = index + 1;
        const consumedBatch = nextOffset >= batch.page.length;
        const next: ScanCursor = consumedBatch
          ? { cursor: batch.continueCursor, offset: 0 }
          : { cursor: state.cursor, offset: nextOffset };
        return pageResult(matches, consumedBatch && batch.isDone, next);
      }
    }

    if (batch.isDone) {
      return pageResult(matches, true, { cursor: batch.continueCursor, offset: 0 });
    }

    state = { cursor: batch.continueCursor, offset: 0 };
  }

  return pageResult(matches, false, state);
}
