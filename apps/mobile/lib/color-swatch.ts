/** Whether a value is a CSS hex color (#RGB, #RRGGBB, or #RRGGBBAA). */
export function isHexColor(value: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value.trim());
}

/** Human-readable color label — never shows raw hex codes (matches web storefront). */
export function formatColorLabel(color: string): string {
  const trimmed = color.trim();
  if (!trimmed) return "Selected color";
  if (isHexColor(trimmed)) {
    const hex = trimmed.slice(1);
    const rgb = hex.length === 3 ? hex.split("").map((digit) => digit + digit).join("") : hex.slice(0, 6);
    const [r, g, b] = [0, 2, 4].map((offset) => parseInt(rgb.slice(offset, offset + 2), 16) / 255);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    let label: string;
    if (max < 0.18) label = "Black";
    else if (min > 0.9) label = "White";
    else if (delta < 0.12) label = "Gray";
    else {
      const hue = ((max === r ? (g - b) / delta : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4) * 60 + 360) % 360;
      label = hue < 15 || hue >= 345 ? "Red" : hue < 45 ? "Orange" : hue < 70 ? "Yellow" : hue < 165 ? "Green" : hue < 195 ? "Teal" : hue < 260 ? "Blue" : hue < 300 ? "Purple" : "Pink";
    }
    // The exact code keeps similar shades distinguishable without inventing variant names.
    return `${label} (${trimmed.toUpperCase()})`;
  }

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
