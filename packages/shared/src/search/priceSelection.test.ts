import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCatalogPriceSelection } from "./priceSelection";

describe("catalog price selection and URL navigation", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("preserves a bookmarked range and commits only the final drag", () => {
    const selection = createCatalogPriceSelection();
    const commit = vi.fn();
    selection.sync([0, 1000], 100, 200, commit);
    expect(selection.getSnapshot().range).toEqual([100, 200]);
    selection.select([150, 250]);
    vi.advanceTimersByTime(300);
    selection.select([170, 300]);
    vi.advanceTimersByTime(399);
    expect(commit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(commit).toHaveBeenCalledExactlyOnceWith([170, 300]);
  });

  it("price chip removal cancels a draft and does not restore its URL", () => {
    const selection = createCatalogPriceSelection();
    const commit = vi.fn();
    selection.sync([0, 1000], 100, 200, commit);
    selection.select([120, 220]);
    selection.clear();
    selection.sync([0, 1000], undefined, undefined, commit);
    vi.runAllTimers();
    expect(selection.getSnapshot().range).toEqual([0, 1000]);
    expect(commit).toHaveBeenCalledExactlyOnceWith(undefined);
  });

  it("back/forward URL navigation supersedes an in-flight drag", () => {
    const selection = createCatalogPriceSelection();
    const commit = vi.fn();
    selection.sync([0, 1000], 100, 200, commit);
    selection.select([150, 350]);
    selection.sync([0, 1000], 500, 700, commit);
    vi.runAllTimers();
    expect(selection.getSnapshot().range).toEqual([500, 700]);
    expect(commit).not.toHaveBeenCalled();
    selection.sync([0, 1000], undefined, undefined, commit);
    expect(selection.getSnapshot().range).toEqual([0, 1000]);
  });

  it("a filter rerender retains a drag and commits using the latest URL callback", () => {
    const selection = createCatalogPriceSelection();
    const oldCommit = vi.fn();
    const latestCommit = vi.fn();
    selection.sync([0, 1000], undefined, undefined, oldCommit);
    selection.select([-10, 300]);
    selection.sync([0, 1000], undefined, undefined, latestCommit);
    vi.runAllTimers();
    expect(selection.getSnapshot().range).toEqual([0, 300]);
    expect(oldCommit).not.toHaveBeenCalled();
    expect(latestCommit).toHaveBeenCalledExactlyOnceWith([0, 300]);
  });
});
