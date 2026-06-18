import type { PromotionFormState } from "@/components/admin/promotions/promotion-form";
import { validatePositiveNumber, validateRequired } from "@/lib/validation/validators";

export function validatePromotionForm(
  values: PromotionFormState
): Partial<Record<keyof PromotionFormState, string>> {
  const errors: Partial<Record<keyof PromotionFormState, string>> = {};

  const name = validateRequired(values.name, "Promotion name");
  if (name) errors.name = name;

  if (!values.buyProductId) {
    errors.buyProductId = "Select a buy product";
  }

  const needsGetProduct =
    values.type === "buy_x_get_y" ||
    values.type === "free_gift" ||
    values.type === "cross_product";

  if (needsGetProduct && !values.getProductId) {
    errors.getProductId =
      values.type === "free_gift"
        ? "Select a gift product"
        : "Select a free product";
  }

  if (
    values.type === "cross_product" &&
    values.buyProductId &&
    values.getProductId &&
    values.buyProductId === values.getProductId
  ) {
    errors.getProductId = "Choose a different product for the free item";
  }

  const buyQuantity = validatePositiveNumber(values.buyQuantity, "Buy quantity", {
    min: 1,
  });
  if (buyQuantity) errors.buyQuantity = buyQuantity;

  const getQuantity = validatePositiveNumber(values.getQuantity, "Free quantity", {
    min: 1,
  });
  if (getQuantity) errors.getQuantity = getQuantity;

  if (!values.startAt.trim()) {
    errors.startAt = "Start date is required";
  } else if (!Number.isFinite(new Date(values.startAt).getTime())) {
    errors.startAt = "Enter a valid start date";
  }

  if (!values.endAt.trim()) {
    errors.endAt = "End date is required";
  } else if (!Number.isFinite(new Date(values.endAt).getTime())) {
    errors.endAt = "Enter a valid end date";
  }

  if (
    !errors.startAt &&
    !errors.endAt &&
    Number.isFinite(new Date(values.startAt).getTime()) &&
    Number.isFinite(new Date(values.endAt).getTime()) &&
    new Date(values.endAt).getTime() <= new Date(values.startAt).getTime()
  ) {
    errors.endAt = "End date must be after start date";
  }

  return errors;
}
