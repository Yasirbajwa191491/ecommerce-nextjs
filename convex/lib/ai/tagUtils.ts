export function slugifyTag(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags) {
    const label = raw.trim().replace(/\s+/g, " ");
    if (!label) continue;
    const slug = slugifyTag(label);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    result.push(label);
    if (result.length >= 5) break;
  }
  return result;
}

export function buildReviewText(title: string, content: string): string {
  return `${title.trim()}\n\n${content.trim()}`;
}
