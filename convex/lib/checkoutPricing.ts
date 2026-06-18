import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import type { CartLineInput, OrderTotals, PricedLineItem } from "./orderPricing";
import { mergeCartLines } from "./cartLines";
import { priceCartLines } from "./orderPricing";
import { evaluatePromotionsForCart } from "./promotions/evaluate";
import { mergePricedCartWithPromotions } from "./promotions/apply";
import type { AppliedPromotionSummary } from "./promotions/types";
import { roundMoney } from "./pricing";
import {
  calculateDeliveryChargeForMethod,
  getDefaultDeliveryMethod,
  resolveAvailableDeliveryMethods,
  type DeliveryMethodOption,
} from "./deliveryPricing";
import {
  DELIVERY_METHOD_LABELS,
  deliveryMethodTypeValidator,
  type DeliveryMethodType,
} from "./productValidators";

type DbCtx = QueryCtx | MutationCtx;

export { deliveryMethodTypeValidator };
export type { DeliveryMethodType, DeliveryMethodOption };

export type CheckoutPricingResult = OrderTotals & {
  items: PricedLineItem[];
  promotionSummaries: AppliedPromotionSummary[];
  promotionSavingsTotal: number;
  deliveryMethod: DeliveryMethodType;
  deliveryMethodLabel: string;
  deliveryCharge: number;
  deliveryEstimate: string;
  availableDeliveryMethods: DeliveryMethodOption[];
};

async function loadCartProducts(
  ctx: DbCtx,
  lines: CartLineInput[]
) {
  const productIds = [...new Set(lines.map((line) => line.productId))];
  const products = await Promise.all(
    productIds.map((productId) => ctx.db.get(productId))
  );
  return products.filter(
    (product): product is NonNullable<typeof product> => product !== null
  );
}

export async function priceCheckoutCart(
  ctx: DbCtx,
  lines: CartLineInput[],
  now: number,
  deliveryMethod?: DeliveryMethodType
): Promise<CheckoutPricingResult> {
  const mergedLines = mergeCartLines(lines);
  const products = await loadCartProducts(ctx, mergedLines);
  const availableDeliveryMethods = resolveAvailableDeliveryMethods(products);

  const selectedMethod =
    deliveryMethod && availableDeliveryMethods.some((m) => m.type === deliveryMethod)
      ? deliveryMethod
      : getDefaultDeliveryMethod(products);

  const useStandardShipping = selectedMethod === "standard";
  const priced = await priceCartLines(ctx, mergedLines, useStandardShipping);
  const evaluation = await evaluatePromotionsForCart(ctx, mergedLines, now);
  const items = mergePricedCartWithPromotions(priced.items, evaluation);

  const discountTotal = priced.discountTotal + evaluation.totalPromotionSavings;

  let shipping = priced.shipping;
  let deliveryCharge = 0;
  let deliveryEstimate = "3-5 Business Days";
  let deliveryMethodLabel = DELIVERY_METHOD_LABELS.standard;

  if (selectedMethod === "standard") {
    const standardOption = availableDeliveryMethods.find(
      (method) => method.type === "standard"
    );
    if (standardOption) {
      shipping = standardOption.charge;
      deliveryEstimate = standardOption.estimate;
    }
  } else {
    shipping = 0;
    const delivery = calculateDeliveryChargeForMethod(products, selectedMethod);
    deliveryCharge = delivery.charge;
    deliveryEstimate = delivery.estimate;
    deliveryMethodLabel = delivery.label;
  }

  const total = roundMoney(
    priced.subtotal - discountTotal + shipping + deliveryCharge + priced.tax
  );

  return {
    subtotal: priced.subtotal,
    discountTotal,
    tax: priced.tax,
    shipping,
    total,
    currency: priced.currency,
    items,
    promotionSummaries: evaluation.summaries,
    promotionSavingsTotal: evaluation.totalPromotionSavings,
    deliveryMethod: selectedMethod,
    deliveryMethodLabel,
    deliveryCharge,
    deliveryEstimate,
    availableDeliveryMethods,
  };
}
