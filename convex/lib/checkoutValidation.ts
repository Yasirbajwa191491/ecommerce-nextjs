import { v } from "convex/values";

export const cartLineValidator = v.object({
  productId: v.id("products"),
  color: v.string(),
  quantity: v.number(),
});

export const customerInfoValidator = v.object({
  fullName: v.string(),
  email: v.string(),
  phone: v.string(),
  address: v.string(),
  notes: v.optional(v.string()),
  termsAccepted: v.boolean(),
  privacyAccepted: v.boolean(),
});

export function validateCustomerFields(customer: {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  termsAccepted: boolean;
  privacyAccepted: boolean;
}): void {
  const name = customer.fullName.trim();
  if (name.length < 2) {
    throw new Error("Full name must be at least 2 characters");
  }
  if (name.length > 120) {
    throw new Error("Full name must be 120 characters or fewer");
  }

  const email = customer.email.trim();
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(email)) {
    throw new Error("Enter a valid email address");
  }

  const phone = customer.phone.trim();
  if (phone.length < 8) {
    throw new Error("Enter a valid phone number");
  }

  const address = customer.address.trim();
  if (address.length < 10) {
    throw new Error("Address must be at least 10 characters");
  }
  if (address.length > 500) {
    throw new Error("Address must be 500 characters or fewer");
  }

  if (!customer.termsAccepted) {
    throw new Error("You must accept the Terms & Conditions");
  }
  if (!customer.privacyAccepted) {
    throw new Error("You must accept the Privacy Policy");
  }
}

export function validateCartLines(
  lines: Array<{ productId: string; color: string; quantity: number }>
): void {
  if (!lines.length) {
    throw new Error("Your cart is empty");
  }
  for (const line of lines) {
    if (line.quantity < 1 || !Number.isInteger(line.quantity)) {
      throw new Error("Invalid quantity in cart");
    }
    if (!line.color.trim()) {
      throw new Error("Each cart item must have a selected color");
    }
  }
}
