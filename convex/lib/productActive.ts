export function isProductActive(product: { active?: boolean | null }): boolean {
  return product.active !== false;
}
