export const PROMOTION_TYPE_OPTIONS = [
  { value: "bogo", label: "Buy One Get One Free" },
  { value: "buy_x_get_y", label: "Buy X Get Y Free" },
  { value: "free_gift", label: "Free Gift with Product" },
  { value: "cross_product", label: "Cross-Product Promotion" },
] as const;

export type PromotionType = (typeof PROMOTION_TYPE_OPTIONS)[number]["value"];

export const PROMOTION_TYPE_FILTER_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "bogo", label: "BOGO" },
  { value: "buy_x_get_y", label: "Buy X Get Y" },
  { value: "free_gift", label: "Free gift" },
  { value: "cross_product", label: "Cross-product" },
] as const;

export type PromotionTypeFilter =
  (typeof PROMOTION_TYPE_FILTER_OPTIONS)[number]["value"];

export function promotionTypeLabel(type: PromotionType): string {
  return (
    PROMOTION_TYPE_OPTIONS.find((option) => option.value === type)?.label ??
    type
  );
}

export function promotionTypeFilterLabel(value: PromotionTypeFilter): string {
  return (
    PROMOTION_TYPE_FILTER_OPTIONS.find((option) => option.value === value)
      ?.label ?? value
  );
}

export function promotionStatusLabel(status: "active" | "inactive"): string {
  return status === "active" ? "Active" : "Inactive";
}
