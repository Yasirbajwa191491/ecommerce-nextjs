/**
 * Shadow comparison metrics.
 * Overlap with the existing engine is not evidence that one ranker is better.
 */

export function overlapAtK(left: string[], right: string[], k: number): number {
  if (k < 1) return 0;
  const rightSet = new Set(right.slice(0, k));
  const shared = left.slice(0, k).filter((id) => rightSet.has(id)).length;
  return shared / k;
}

export function rankAgreement(left: string[], right: string[], k: number): number {
  if (k < 1) return 0;
  const rightRank = new Map(right.slice(0, k).map((id, index) => [id, index]));
  const window = left.slice(0, k);
  if (window.length === 0) return 0;
  let total = 0;
  let compared = 0;
  window.forEach((id, index) => {
    const other = rightRank.get(id);
    if (other === undefined) return;
    const span = Math.max(k - 1, 1);
    total += 1 - Math.abs(index - other) / span;
    compared += 1;
  });
  if (compared === 0) return 0;
  return total / compared;
}

export function validCandidateRate(recommended: string[], catalog: ReadonlySet<string>): number {
  if (recommended.length === 0) return 1;
  const valid = recommended.filter((id) => catalog.has(id)).length;
  return valid / recommended.length;
}

export function candidateCoverage(lists: string[][], catalogSize: number): number {
  if (catalogSize < 1) return 0;
  const recommended = new Set(lists.flat());
  return recommended.size / catalogSize;
}

export function mean(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
