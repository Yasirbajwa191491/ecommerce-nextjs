import {
  validateEmail,
  validateMaxLength,
  validateMinLength,
  validatePersonName,
  validatePhone,
  validateRequired,
} from "./validators";

export type PaymentMethod = "cod" | "stripe";

export type CheckoutFormValues = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  paymentMethod: PaymentMethod | "";
  termsAccepted: boolean;
  privacyAccepted: boolean;
};

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
    const addressMin = validateMinLength(values.address, 10, "Address");
    if (addressMin) errors.address = addressMin;
    else {
      const addressMax = validateMaxLength(values.address, 500, "Address");
      if (addressMax) errors.address = addressMax;
    }
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
