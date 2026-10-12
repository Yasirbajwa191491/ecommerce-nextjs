import { isValidPhoneNumber } from "libphonenumber-js";

export type PaymentMethod = "cod" | "stripe";

export type CheckoutFormValues = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  structuredAddress?: boolean;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  notes: string;
  paymentMethod: PaymentMethod | "";
  termsAccepted: boolean;
  privacyAccepted: boolean;
};

/** Preserve saved free-form addresses; only compose fields the shopper entered. */
export function formatCheckoutAddress(values: CheckoutFormValues): string {
  if (!values.structuredAddress) return values.address.trim();
  return [values.address, values.city, values.region, values.postalCode, values.country]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
}

export const CHECKOUT_FIELD_ORDER: (keyof CheckoutFormValues)[] = [
  "fullName", "email", "phone", "address", "city", "region", "postalCode", "country",
  "notes", "paymentMethod", "termsAccepted", "privacyAccepted",
];

export function getFirstCheckoutError(errors: Partial<Record<keyof CheckoutFormValues, string>>) {
  return CHECKOUT_FIELD_ORDER.find((field) => errors[field]);
}

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

function validateRequired(value: string, label: string): string | undefined {
  if (!value.trim()) return `${label} is required`;
  return undefined;
}

function validateMinLength(value: string, min: number, label: string): string | undefined {
  if (value.trim().length < min) return `${label} must be at least ${min} characters`;
  return undefined;
}

function validateMaxLength(value: string, max: number, label: string): string | undefined {
  if (value.trim().length > max) return `${label} must be ${max} characters or fewer`;
  return undefined;
}

function validatePersonName(name: string, label = "Name"): string | undefined {
  const required = validateRequired(name, label);
  if (required) return required;
  const trimmed = name.trim();
  if (trimmed.length < 2) return `${label} must be at least 2 characters`;
  if (!/^[\p{L}\p{M}'\s.-]+$/u.test(trimmed)) {
    return `${label} contains invalid characters`;
  }
  return undefined;
}

function validateEmail(email: string): string | undefined {
  const required = validateRequired(email, "Email");
  if (required) return required;
  if (!EMAIL_REGEX.test(email.trim())) {
    return "Enter a valid email address";
  }
  return undefined;
}

function validatePhone(phone: string): string | undefined {
  const required = validateRequired(phone, "Phone number");
  if (required) return required;
  if (!isValidPhoneNumber(phone.trim())) {
    return "Enter a valid phone number with country code";
  }
  return undefined;
}

export function validateCheckoutForm(
  values: CheckoutFormValues
): Partial<Record<keyof CheckoutFormValues, string>> {
  const errors: Partial<Record<keyof CheckoutFormValues, string>> = {};

  const name = validatePersonName(values.fullName, "Full name");
  if (name) errors.fullName = name;

  const email = validateEmail(values.email);
  if (email) errors.email = email;

  const phone = validatePhone(values.phone);
  if (phone) errors.phone = phone;

  const addressRequired = validateRequired(values.address, "Address");
  if (addressRequired) errors.address = addressRequired;
  else {
    const addressMin = validateMinLength(values.address, values.structuredAddress ? 3 : 10, "Address");
    if (addressMin) errors.address = addressMin;
    else {
      const addressMax = validateMaxLength(values.address, 500, "Address");
      if (addressMax) errors.address = addressMax;
    }
  }

  if (values.structuredAddress) {
    const city = validateRequired(values.city ?? "", "City");
    if (city) errors.city = city;
    const country = validateRequired(values.country ?? "", "Country");
    if (country) errors.country = country;
    for (const field of ["city", "region", "postalCode", "country"] as const) {
      const max = validateMaxLength(values[field] ?? "", field === "postalCode" ? 20 : 100, field === "region" ? "State / province" : field === "postalCode" ? "Postal code" : field === "city" ? "City" : "Country");
      if (max) errors[field] = max;
    }
    if (formatCheckoutAddress(values).length > 500) errors.address = "Complete address must be 500 characters or fewer";
  }

  if (values.notes.trim()) {
    const notesMax = validateMaxLength(values.notes, 1000, "Order notes");
    if (notesMax) errors.notes = notesMax;
  }

  if (!values.paymentMethod) {
    errors.paymentMethod = "Select a payment method";
  }

  if (!values.termsAccepted) {
    errors.termsAccepted = "You must accept the Terms & Conditions";
  }

  if (!values.privacyAccepted) {
    errors.privacyAccepted = "You must accept the Privacy Policy";
  }

  return errors;
}
