/** Preset swatches for admin color pickers (Savari-style palette). */
export const DEFAULT_COLOR_PRESETS = [
  "#000000",
  "#FFFFFF",
  "#E53935",
  "#FB8C00",
  "#43A047",
  "#1E88E5",
  "#8E24AA",
  "#00897B",
  "#7E57C2",
  "#EB7185",
  "#FDD835",
  "#7CB342",
] as const;

const HEX_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

export function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (!HEX_REGEX.test(withHash)) return null;
  if (withHash.length === 4) {
    const [, r, g, b] = withHash;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return withHash.toUpperCase();
}

export function isLightColor(hex: string): boolean {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return false;
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.72;
}
