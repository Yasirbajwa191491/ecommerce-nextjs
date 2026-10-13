import { describe, expect, it } from "vitest";
import { createSearchLifecycle, type SearchPage } from "./lifecycle";

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (error: Error) => void = () => undefined;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const page = (product: string, nextCursor?: number): SearchPage<string> => ({
  products: [product], totalCount: 3, isSimilarFallback: false, nextCursor,
});

describe("search lifecycle used by web and mobile hooks", () => {
  it("can paginate B after A's in-flight page finishes", async () => {
    const search = createSearchLifecycle<string>();
    const oldPage = deferred<SearchPage<string>>();
    await search.start(async (cursor) => cursor === 0 ? page("A1", 1) : oldPage.promise);
    const pending = search.loadMore();
    expect(search.getSnapshot().loadingMore).toBe(true);
    const cursors: number[] = [];
    search.invalidate();
    await search.start(async (cursor) => { cursors.push(cursor); return page(`B${cursor + 1}`, cursor === 0 ? 1 : undefined); });
    oldPage.resolve(page("A2", 2));
    await pending;
    expect(search.getSnapshot().loadingMore).toBe(false);
    await search.loadMore();
    expect(cursors).toEqual([0, 1]);
    expect(search.getSnapshot().products).toEqual(["B1", "B2"]);
  });

  it("a stale rejection cannot release B's current page guard", async () => {
    const search = createSearchLifecycle<string>();
    const oldPage = deferred<SearchPage<string>>();
    await search.start(async (cursor) => cursor === 0 ? page("A1", 1) : oldPage.promise);
    const oldPending = search.loadMore();
    const currentPage = deferred<SearchPage<string>>();
    let pageCalls = 0;
    search.invalidate();
    await search.start(async (cursor) => {
      if (cursor === 0) return page("B1", 1);
      pageCalls += 1;
      return currentPage.promise;
    });
    const currentPending = search.loadMore();
    oldPage.reject(new Error("Old connection failed"));
    await oldPending;
    expect(search.getSnapshot().loadingMore).toBe(true);
    await search.loadMore();
    expect(pageCalls).toBe(1);
    currentPage.resolve(page("B2"));
    await currentPending;
    expect(search.getSnapshot().products).toEqual(["B1", "B2"]);
  });

  it("clearing a query ignores both pending initial and pagination responses", async () => {
    const search = createSearchLifecycle<string>();
    const initial = deferred<SearchPage<string>>();
    const initialPending = search.start(() => initial.promise);
    search.clear();
    initial.resolve(page("stale-initial", 1));
    await initialPending;
    expect(search.getSnapshot()).toMatchObject({ products: [], loading: false, loadingMore: false });
    const next = deferred<SearchPage<string>>();
    await search.start(async (cursor) => cursor === 0 ? page("A1", 1) : next.promise);
    const morePending = search.loadMore();
    search.clear();
    next.resolve(page("stale-page"));
    await morePending;
    expect(search.getSnapshot()).toMatchObject({ products: [], loading: false, loadingMore: false });
    expect(search.getSnapshot().nextCursor).toBeUndefined();
  });

  it("invalidating an unmounted search ignores its eventual response", async () => {
    const search = createSearchLifecycle<string>();
    const initial = deferred<SearchPage<string>>();
    const pending = search.start(() => initial.promise);
    search.invalidate();
    initial.resolve(page("stale"));
    await pending;
    expect(search.getSnapshot().products).toEqual([]);
  });
});
