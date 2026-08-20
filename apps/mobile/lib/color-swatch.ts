/** Whether a value is a CSS hex color (#RGB, #RRGGBB, or #RRGGBBAA). */
export function isHexColor(value: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value.trim());
}

/** Human-readable color label — never shows raw hex codes (matches web storefront). */
export function formatColorLabel(color: string): string {
  const trimmed = color.trim();
  if (!trimmed) return "Selected color";
  if (isHexColor(trimmed)) return "Selected color";

  return trimmed
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/** Whether a product color can render as a filled swatch (hex or CSS color name). */
export function canRenderColorSwatch(color: string): boolean {
  const trimmed = color.trim();
  if (isHexColor(trimmed)) return true;
  return /^[a-zA-Z]+$/.test(trimmed);
}

export function resolveSwatchBackground(color: string): string | undefined {
  const trimmed = color.trim();
  if (isHexColor(trimmed)) return trimmed;
  if (/^[a-zA-Z]+$/.test(trimmed)) return trimmed.toLowerCase();
  return undefined;
}
