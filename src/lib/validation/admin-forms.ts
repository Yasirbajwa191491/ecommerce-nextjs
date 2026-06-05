import {
  validateEmail,
  validatePersonName,
  validatePositiveNumber,
  validateRating,
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
  values: CategoryFormValues
): Partial<Record<keyof CategoryFormValues, string>> {
  const errors: Partial<Record<keyof CategoryFormValues, string>> = {};
  const nameRequired = validateRequired(values.name, "Category name");
  if (nameRequired) errors.name = nameRequired;
  else if (values.name.trim().length < 2) {
    errors.name = "Category name must be at least 2 characters";
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
  price: number;
  colors: string;
  imageUrls: string[];
  categoryId: string;
  stock: number;
  reviews: number;
  stars: number;
  description: string;
};

export function validateProductForm(
  values: ProductFormValues
): Partial<Record<keyof ProductFormValues | `imageUrls.${number}`, string>> {
  const errors: Partial<
    Record<keyof ProductFormValues | `imageUrls.${number}`, string>
  > = {};

  const name = validateRequired(values.name, "Product name");
  if (name) errors.name = name;

  const company = validateRequired(values.company, "Company / brand");
  if (company) errors.company = company;

  if (!values.categoryId) {
    errors.categoryId = "Select a category";
  }

  const price = validatePositiveNumber(values.price, "Price", { min: 0.01 });
  if (price) errors.price = price;

  const stock = validatePositiveNumber(values.stock, "Stock", {
    min: 0,
    allowZero: true,
  });
  if (stock) errors.stock = stock;

  const reviews = validatePositiveNumber(values.reviews, "Reviews", {
    min: 0,
    allowZero: true,
  });
  if (reviews) errors.reviews = reviews;

  const stars = validateRating(values.stars);
  if (stars) errors.stars = stars;

  const colors = values.colors
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  if (colors.length === 0) {
    errors.colors = "Add at least one color (comma-separated)";
  }

  const urls = values.imageUrls.map((u) => u.trim()).filter(Boolean);
  if (urls.length === 0) {
    errors.imageUrls = "Add at least one product image URL";
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

  return errors;
}
