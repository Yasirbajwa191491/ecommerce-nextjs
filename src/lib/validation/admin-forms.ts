import { isValidCurrencyCode } from "@/lib/currencies";
import {
  validateEmail,
  validatePersonName,
  validatePositiveNumber,
  validateRequired,
  validateSlug,
  validateStrongPassword,
  validateUrl,
} from "./validators";

export type CreateUserFormValues = {
  name: string;
  email: string;
  password: string;
  role: string;
};

export function validateCreateUserForm(
  values: CreateUserFormValues
): Partial<Record<keyof CreateUserFormValues, string>> {
  const errors: Partial<Record<keyof CreateUserFormValues, string>> = {};
  const name = validatePersonName(values.name, "Full name");
  if (name) errors.name = name;
  const email = validateEmail(values.email);
  if (email) errors.email = email;
  const password = validateStrongPassword(values.password);
  if (password) errors.password = password;
  if (!values.role) errors.role = "Select a role";
  return errors;
}

export type CategoryFormValues = {
  name: string;
  slug: string;
  description: string;
};

export function validateCategoryForm(
  values: CategoryFormValues,
  options?: { takenNames?: string[] }
): Partial<Record<keyof CategoryFormValues, string>> {
  const errors: Partial<Record<keyof CategoryFormValues, string>> = {};
  const nameRequired = validateRequired(values.name, "Category name");
  if (nameRequired) errors.name = nameRequired;
  else if (values.name.trim().length < 2) {
    errors.name = "Category name must be at least 2 characters";
  } else if (options?.takenNames?.length) {
    const normalized = values.name.trim().toLowerCase();
    if (options.takenNames.includes(normalized)) {
      errors.name = "A category with this name already exists";
    }
  }
  const slug = validateSlug(values.slug);
  if (slug) errors.slug = slug;
  if (values.description.trim().length > 500) {
    errors.description = "Description must be 500 characters or fewer";
  }
  return errors;
}

export type ProductFormValues = {
  name: string;
  company: string;
  sku?: string;
  price: number;
  currency: string;
  colors: string[];
  imageUrls: string[];
  categoryId: string;
  stock: number;
  description: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  shipping?: boolean;
  discountPercent?: number;
  shippingCharges?: number;
};

export type ProductFormWarnings = Partial<
  Record<"seoTitle" | "seoDescription", string>
>;

export function getProductFormWarnings(
  values: Pick<ProductFormValues, "seoTitle" | "seoDescription">
): ProductFormWarnings {
  const warnings: ProductFormWarnings = {};
  const titleLen = values.seoTitle?.trim().length ?? 0;
  const descLen = values.seoDescription?.trim().length ?? 0;
  if (titleLen > 70) {
    warnings.seoTitle = "SEO titles over 70 characters may be truncated in search results";
  }
  if (descLen > 160) {
    warnings.seoDescription =
      "Meta descriptions over 160 characters may be truncated in search results";
  }
  return warnings;
}

export function validateProductForm(
  values: ProductFormValues,
  options?: { takenNames?: string[] }
): Partial<
  Record<
    keyof ProductFormValues | `imageUrls.${number}`,
    string
  >
> {
  const errors: Partial<
    Record<keyof ProductFormValues | `imageUrls.${number}`, string>
  > = {};

  const name = validateRequired(values.name, "Product name");
  if (name) errors.name = name;
  else if (options?.takenNames?.length) {
    const normalized = values.name.trim().toLowerCase();
    if (options.takenNames.includes(normalized)) {
      errors.name = "A product with this name already exists";
    }
  }

  const company = validateRequired(values.company, "Company / brand");
  if (company) errors.company = company;

  if (!values.categoryId) {
    errors.categoryId = "Select a category";
  }

  const price = validatePositiveNumber(values.price, "Price", { min: 0.01 });
  if (price) errors.price = price;

  if (!values.currency?.trim()) {
    errors.currency = "Select a currency";
  } else if (!isValidCurrencyCode(values.currency.trim())) {
    errors.currency = "Select a valid currency";
  }

  const stock = validatePositiveNumber(values.stock, "Stock", {
    min: 0,
    allowZero: true,
  });
  if (stock) errors.stock = stock;

  const colors = values.colors.map((c) => c.trim()).filter(Boolean);
  if (colors.length === 0) {
    errors.colors = "Select at least one color";
  }

  const urls = values.imageUrls.map((u) => u.trim()).filter(Boolean);
  if (urls.length === 0) {
    errors.imageUrls = "Add at least one product image";
  } else {
    values.imageUrls.forEach((url, i) => {
      const trimmed = url.trim();
      if (!trimmed) return;
      const urlError = validateUrl(trimmed);
      if (urlError) errors[`imageUrls.${i}`] = urlError;
    });
  }

  const description = validateRequired(values.description, "Description");
  if (description) errors.description = description;
  else if (values.description.trim().length < 10) {
    errors.description = "Description must be at least 10 characters";
  }

  const discountPercent = values.discountPercent ?? 0;
  if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
    errors.discountPercent = "Discount must be between 0 and 100";
  }

  const freeShipping = values.shipping !== false;
  if (!freeShipping) {
    const shippingCharges = values.shippingCharges ?? 0;
    const shippingError = validatePositiveNumber(
      shippingCharges,
      "Shipping charges",
      { min: 0, allowZero: true }
    );
    if (shippingError) errors.shippingCharges = shippingError;
  }

  return errors;
}
