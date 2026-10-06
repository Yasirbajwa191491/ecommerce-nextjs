export type SearchPage<T> = {
  products: T[];
  totalCount: number;
  isSimilarFallback: boolean;
  nextCursor?: number;
  resultProductIds?: string[];
  error?: boolean;
};

export type SearchSnapshot<T> = SearchPage<T> & {
  loading: boolean;
  loadingMore: boolean;
  error: boolean;
  resultProductIds: string[];
};

/** Owns both request generations and loading flags for a paginated search. */
export function createSearchLifecycle<T>() {
  const empty = (): SearchSnapshot<T> => ({
    products: [], totalCount: 0, isSimilarFallback: false,
    loading: false, loadingMore: false, error: false, resultProductIds: [],
  });
  const initial = empty();
  let snapshot = initial;
  let generation = 0;
  let search: ((cursor: number) => Promise<SearchPage<T>>) | undefined;
  const listeners = new Set<() => void>();
  const publish = (next: SearchSnapshot<T>) => {
    snapshot = next;
    listeners.forEach((listener) => listener());
  };

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => initial,
    invalidate() {
      generation += 1;
      search = undefined;
    },
    clear() {
      generation += 1;
      search = undefined;
      publish(empty());
    },
    async start(request: (cursor: number) => Promise<SearchPage<T>>) {
      const currentGeneration = ++generation;
      search = request;
      publish({ ...empty(), loading: true });
      try {
        const result = await request(0);
        if (generation !== currentGeneration) return;
        publish({
          ...result, resultProductIds: result.resultProductIds ?? [],
          loading: false, loadingMore: false, error: result.error ?? false,
        });
      } catch {
        if (generation === currentGeneration) publish({ ...empty(), error: true });
      }
    },
    async loadMore() {
      if (!search || snapshot.loading || snapshot.loadingMore || snapshot.nextCursor === undefined) return;
      const currentGeneration = generation;
      const request = search;
      const cursor = snapshot.nextCursor;
      publish({ ...snapshot, loadingMore: true });
      try {
        const result = await request(cursor);
        if (generation !== currentGeneration) return;
        publish({
          ...snapshot, products: [...snapshot.products, ...result.products],
          nextCursor: result.nextCursor,
          resultProductIds: result.resultProductIds ?? snapshot.resultProductIds,
          loadingMore: false,
        });
      } catch {
        if (generation === currentGeneration) publish({ ...snapshot, loadingMore: false });
      }
    },
  };
}
