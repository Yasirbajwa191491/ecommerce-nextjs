import type { CartLineInput } from "./orderPricing";

function expandHexShorthand(hex: string): string {
  if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
    const [r, g, b] = hex.slice(1);
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return hex;
}

export function normalizeCartColor(color: string): string {
  const trimmed = color.trim();
  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) {
    return expandHexShorthand(trimmed).toLowerCase();
  }
  return trimmed;
}

/** Match selected color to a product option (case-insensitive hex). */
export function resolveProductColor(
  productColors: string[],
  selectedColor: string
): string | null {
  const normalized = normalizeCartColor(selectedColor);
  for (const color of productColors) {
    if (normalizeCartColor(color) === normalized) {
      return normalizeCartColor(color);
    }
  }
  return null;
}

/** Merge duplicate product + color rows (client may send duplicates). */
export function mergeCartLines(lines: CartLineInput[]): CartLineInput[] {
  const merged = new Map<string, CartLineInput>();

  for (const line of lines) {
    if (line.quantity < 1 || !Number.isInteger(line.quantity)) {
      throw new Error("Invalid quantity in cart");
    }
    const color = normalizeCartColor(line.color);
    if (!color) {
      throw new Error("Each cart item must have a selected color");
    }

    const key = `${line.productId}::${color}`;
    const existing = merged.get(key);
    if (existing) {
      existing.quantity += line.quantity;
    } else {
      merged.set(key, {
        productId: line.productId,
        color,
        quantity: line.quantity,
      });
    }
  }

  return Array.from(merged.values());
}

export function primaryColorForProduct(
  lines: CartLineInput[],
  productId: string
): string | undefined {
  const matches = lines.filter((line) => line.productId === productId);
  if (matches.length === 0) return undefined;
  return matches.sort((a, b) => b.quantity - a.quantity)[0]?.color;
}

export function quantityByProduct(lines: CartLineInput[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const line of lines) {
    map.set(line.productId, (map.get(line.productId) ?? 0) + line.quantity);
  }
  return map;
}
