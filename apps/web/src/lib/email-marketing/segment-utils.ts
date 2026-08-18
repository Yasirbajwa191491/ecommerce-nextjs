export function serializeSegmentCriteria(segmentKeys: string[]): string {
  return JSON.stringify({ segmentKeys });
}
