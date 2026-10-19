import type { Doc } from "../../_generated/dataModel";
import {
  DELIVERY_METHOD_LABELS,
  WARRANTY_DURATION_LABELS,
  WARRANTY_TYPE_LABELS,
} from "../productValidators";
import { isProductActive } from "../productActive";

export type ProductSourcePayload = {
  source_id: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  highlights: string[];
  specifications: string[];
  warranty: string;
  delivery_options: string[];
  active: boolean;
};

export function productSourcePayload(
  product: Doc<"products">,
  categoryName: string
): ProductSourcePayload {
  const specifications = [
    product.colors.length > 0 ? `Colors: ${product.colors.join(", ")}` : "",
    product.sku ? `SKU: ${product.sku}` : "",
  ].filter(Boolean);
  const warrantyParts = [
    product.warrantyAvailable ? "Warranty is offered." : "",
    product.warrantyDuration ? WARRANTY_DURATION_LABELS[product.warrantyDuration] : "",
    product.warrantyType ? WARRANTY_TYPE_LABELS[product.warrantyType] : "",
    product.warrantyDetails ?? "",
  ].filter(Boolean);
  const delivery = (product.deliveryOptions ?? [])
    .filter((option) => option.enabled)
    .map((option) => `${DELIVERY_METHOD_LABELS[option.type]} (${option.estimate})`);
  return {
    source_id: product._id,
    name: product.name,
    brand: product.company,
    category: categoryName,
    description: product.description,
    highlights: product.highlights ?? [],
    specifications,
    warranty: warrantyParts.join(". "),
    delivery_options: delivery,
    active: isProductActive(product),
  };
}

export function productFact(product: Doc<"products">) {
  const discount = product.discountPercent ?? 0;
  const finalPrice = product.finalPrice ?? product.price * (1 - discount / 100);
  return {
    product_id: product._id,
    name: product.name,
    currency: product.currency ?? "USD",
    price: product.price,
    final_price: finalPrice,
    discount_percent: discount,
    stock: product.stock,
    available: isProductActive(product) && product.stock > 0,
  };
}
