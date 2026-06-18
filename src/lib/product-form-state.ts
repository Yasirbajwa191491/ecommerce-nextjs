import type { Id } from "../../convex/_generated/dataModel";
import { DEFAULT_CURRENCY } from "@/lib/currencies";
import type { Product } from "@/types/product";
import {
  DEFAULT_DELIVERY_OPTIONS,
  normalizeDeliveryOptionsForm,
  type DeliveryOptionForm,
  type WarrantyDurationForm,
  type WarrantyTypeForm,
} from "@/lib/delivery-form-defaults";

export type ProductForm = {
  name: string;
  company: string;
  sku: string;
  price: number;
  currency: string;
  colors: string[];
  imageUrls: string[];
  imageAlts: string[];
  primaryImageIndex: number;
  categoryId: string;
  featured: boolean;
  shipping: boolean;
  discountPercent: number;
  shippingCharges: number;
  stock: number;
  description: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  highlights: string[];
  active: boolean;
  warrantyAvailable: boolean;
  warrantyDuration: WarrantyDurationForm;
  warrantyType: WarrantyTypeForm;
  warrantyDetails: string;
  deliveryOptions: DeliveryOptionForm[];
};

export function emptyForm(): ProductForm {
  return {
    name: "",
    company: "",
    sku: "",
    price: 0,
    currency: DEFAULT_CURRENCY,
    colors: [],
    imageUrls: [""],
    imageAlts: [""],
    primaryImageIndex: 0,
    categoryId: "",
    featured: false,
    shipping: true,
    discountPercent: 0,
    shippingCharges: 0,
    stock: 0,
    description: "",
    seoTitle: "",
    seoDescription: "",
    seoKeywords: "",
    highlights: [""],
    active: true,
    warrantyAvailable: false,
    warrantyDuration: "",
    warrantyType: "",
    warrantyDetails: "",
    deliveryOptions: DEFAULT_DELIVERY_OPTIONS.map((option) => ({ ...option })),
  };
}

function productFlag(value: boolean | undefined | null) {
  return value === true;
}

function isProductActive(product: Product) {
  return product.active !== false;
}

export function productToForm(product: Product): ProductForm {
  const imageUrls = product.image.length ? product.image.map((i) => i.url) : [""];
  const imageAlts = product.image.length
    ? product.image.map((i) => i.alt ?? "")
    : [""];
  const primaryImageIndex =
    product.primaryImageIndex !== undefined
      ? product.primaryImageIndex
      : 0;

  return {
    name: product.name,
    company: product.company,
    sku: product.sku ?? "",
    price: product.price,
    currency: product.currency ?? DEFAULT_CURRENCY,
    colors: [...product.colors],
    imageUrls,
    imageAlts,
    primaryImageIndex: Math.min(
      Math.max(0, primaryImageIndex),
      Math.max(0, imageUrls.filter((u) => u.trim()).length - 1)
    ),
    categoryId: product.categoryId,
    featured: productFlag(product.featured),
    shipping: productFlag(product.shipping),
    discountPercent: product.discountPercent ?? 0,
    shippingCharges: product.shippingCharges ?? 0,
    stock: product.stock,
    description: product.description,
    seoTitle: product.seoTitle ?? "",
    seoDescription: product.seoDescription ?? "",
    seoKeywords: product.seoKeywords?.join(", ") ?? "",
    highlights: product.highlights?.length ? [...product.highlights] : [""],
    active: isProductActive(product),
    warrantyAvailable: product.warrantyAvailable === true,
    warrantyDuration: product.warrantyDuration ?? "",
    warrantyType: product.warrantyType ?? "",
    warrantyDetails: product.warrantyDetails ?? "",
    deliveryOptions: normalizeDeliveryOptionsForm(product.deliveryOptions),
  };
}

export function serializeProductForm(form: ProductForm): string {
  return JSON.stringify(form);
}

export function normalizeImagesForSave(form: ProductForm) {
  const imagePairs = form.imageUrls
    .map((url, i) => ({
      url: url.trim(),
      alt: form.imageAlts[i]?.trim() || undefined,
    }))
    .filter((entry) => entry.url.length > 0);

  if (imagePairs.length === 0) {
    return { image: imagePairs, primaryImageIndex: 0 };
  }

  const safePrimary = Math.min(
    Math.max(0, form.primaryImageIndex),
    imagePairs.length - 1
  );
  const reordered = [
    imagePairs[safePrimary]!,
    ...imagePairs.filter((_, i) => i !== safePrimary),
  ];

  return { image: reordered, primaryImageIndex: 0 };
}

/** Align form image fields with what was persisted (reordered primary-first). */
export function applySavedImagesToForm(
  form: ProductForm,
  payload: Pick<ReturnType<typeof formToPayload>, "image" | "primaryImageIndex">
): ProductForm {
  if (payload.image.length === 0) {
    return { ...form, imageUrls: [""], imageAlts: [""], primaryImageIndex: 0 };
  }
  return {
    ...form,
    imageUrls: payload.image.map((entry) => entry.url),
    imageAlts: payload.image.map((entry) => entry.alt ?? ""),
    primaryImageIndex: payload.primaryImageIndex ?? 0,
  };
}

export function formToPayload(form: ProductForm) {
  const { image, primaryImageIndex } = normalizeImagesForSave(form);

  const keywords = form.seoKeywords
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  const highlights = form.highlights.map((h) => h.trim()).filter(Boolean);

  return {
    name: form.name.trim(),
    company: form.company.trim(),
    sku: form.sku.trim() || undefined,
    price: Number(form.price),
    currency: form.currency.trim() || DEFAULT_CURRENCY,
    colors: form.colors.map((c) => c.trim()).filter(Boolean),
    image,
    primaryImageIndex,
    categoryId: form.categoryId as Id<"productCategories">,
    featured: form.featured,
    shipping: form.shipping,
    discountPercent: Number(form.discountPercent) || 0,
    shippingCharges: form.shipping ? 0 : Number(form.shippingCharges) || 0,
    stock: Number(form.stock),
    description: form.description.trim(),
    seoTitle: form.seoTitle.trim() || undefined,
    seoDescription: form.seoDescription.trim() || undefined,
    seoKeywords: keywords.length ? keywords : undefined,
    highlights: highlights.length ? highlights : undefined,
    active: form.active,
    warrantyAvailable: form.warrantyAvailable,
    warrantyDuration: form.warrantyAvailable && form.warrantyDuration
      ? form.warrantyDuration
      : undefined,
    warrantyType: form.warrantyAvailable && form.warrantyType
      ? form.warrantyType
      : undefined,
    warrantyDetails:
      form.warrantyAvailable && form.warrantyDetails.trim()
        ? form.warrantyDetails.trim()
        : undefined,
    deliveryOptions: normalizeDeliveryOptionsForm(form.deliveryOptions),
  };
}
