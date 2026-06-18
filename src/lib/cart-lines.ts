import type { Id } from "../../convex/_generated/dataModel";

export type CartLineLike = {
  id: string;
  productId: string;
  color: string;
  amount: number;
  name: string;
  image: string;
  price: number;
  max: number;
};

export type CheckoutCartLine = {
  productId: Id<"products">;
  color: string;
  quantity: number;
};

/** Stable delimiter avoids accidental id collisions when concatenating productId + color. */
const CART_LINE_SEP = "::";

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

export function resolveProductColorOrDefault(
  productColors: string[],
  selectedColor: string
): string {
  const resolved = resolveProductColor(productColors, selectedColor);
  if (resolved) return resolved;
  if (productColors[0]) return normalizeCartColor(productColors[0]);
  return normalizeCartColor(selectedColor);
}

export function resolveCartProductId(
  item: Pick<CartLineLike, "id" | "color" | "productId">
): string {
  const existing = item.productId?.trim();
  if (existing) return existing;

  if (item.id.includes(CART_LINE_SEP)) {
    return item.id.split(CART_LINE_SEP)[0] ?? item.id;
  }

  if (item.color && item.id.endsWith(item.color)) {
    return item.id.slice(0, item.id.length - item.color.length);
  }

  const colorIndex = item.color ? item.id.lastIndexOf(item.color) : -1;
  if (colorIndex > 0) {
    return item.id.slice(0, colorIndex);
  }

  return item.id;
}

export function buildCartLineId(productId: string, color: string): string {
  return `${productId}${CART_LINE_SEP}${normalizeCartColor(color)}`;
}

export function cartLineKey(productId: string, color: string): string {
  return buildCartLineId(productId, color);
}

export function findCartLineIndex(
  cart: CartLineLike[],
  productId: string,
  color: string
): number {
  const normalizedColor = normalizeCartColor(color);
  return cart.findIndex((item) => {
    const itemProductId = resolveCartProductId(item);
    return (
      itemProductId === productId &&
      normalizeCartColor(item.color) === normalizedColor
    );
  });
}

/** One cart row per product + color (sums quantities). */
export function consolidateCartItems(cart: CartLineLike[]): CartLineLike[] {
  const merged = new Map<string, CartLineLike>();

  for (const item of cart) {
    const productId = resolveCartProductId(item);
    const color = normalizeCartColor(item.color);
    const lineId = buildCartLineId(productId, color);
    const existing = merged.get(lineId);

    if (existing) {
      const max = Math.max(existing.max, item.max);
      merged.set(lineId, {
        ...existing,
        amount: Math.min(max, existing.amount + item.amount),
        max,
        name: existing.name || item.name,
        image: existing.image || item.image,
        price: item.price > 0 ? item.price : existing.price,
      });
    } else {
      merged.set(lineId, {
        ...item,
        id: lineId,
        productId,
        color,
      });
    }
  }

  return Array.from(merged.values());
}

export function cartItemsToCheckoutLines(cart: CartLineLike[]): CheckoutCartLine[] {
  return consolidateCartItems(cart).map((item) => ({
    productId: resolveCartProductId(item) as Id<"products">,
    color: normalizeCartColor(item.color),
    quantity: item.amount,
  }));
}
