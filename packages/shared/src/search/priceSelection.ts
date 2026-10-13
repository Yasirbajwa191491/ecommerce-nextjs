export type CatalogPriceRange = [number, number];
type PriceSnapshot = { range: CatalogPriceRange; ready: boolean };

/** URL changes supersede drafts; only an uninterrupted drag commits after debounce. */
export function createCatalogPriceSelection(delayMs = 400) {
  const initial: PriceSnapshot = { range: [0, 0], ready: false };
  let snapshot = initial;
  let bounds: CatalogPriceRange | undefined;
  let urlKey: string | undefined;
  let onCommit: (range: CatalogPriceRange | undefined) => void = () => undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();
  const cancel = () => { if (timer !== undefined) clearTimeout(timer); timer = undefined; };
  const clamp = (range: CatalogPriceRange): CatalogPriceRange => {
    if (!bounds) return range;
    const min = Math.min(bounds[1], Math.max(bounds[0], range[0]));
    return [min, Math.max(min, Math.min(bounds[1], Math.max(bounds[0], range[1])))];
  };
  const publish = (range: CatalogPriceRange) => {
    if (snapshot.ready && snapshot.range[0] === range[0] && snapshot.range[1] === range[1]) return;
    snapshot = { range, ready: true };
    listeners.forEach((listener) => listener());
  };
  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => initial,
    sync(nextBounds: CatalogPriceRange | undefined, min: number | undefined, max: number | undefined,
      commit: (range: CatalogPriceRange | undefined) => void) {
      onCommit = commit;
      if (!nextBounds) return;
      const nextKey = JSON.stringify([min ?? null, max ?? null]);
      const changed = urlKey !== nextKey || !bounds || bounds[0] !== nextBounds[0] || bounds[1] !== nextBounds[1];
      bounds = nextBounds;
      if (!changed) return;
      urlKey = nextKey;
      cancel();
      publish(clamp([min ?? bounds[0], max ?? bounds[1]]));
    },
    select(range: CatalogPriceRange) {
      if (!bounds) return;
      cancel();
      publish(clamp(range));
      timer = setTimeout(() => {
        timer = undefined;
        const selected = snapshot.range;
        onCommit(selected[0] === bounds?.[0] && selected[1] === bounds?.[1] ? undefined : selected);
      }, delayMs);
    },
    clear(commit = true) {
      cancel();
      if (bounds) publish([...bounds]);
      if (commit) onCommit(undefined);
    },
    dispose: cancel,
  };
}
