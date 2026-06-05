import {
  validateEmail,
  validateMaxLength,
  validateMinLength,
  validateRequired,
} from "./validators";

export type ContactFormValues = {
  name: string;
  email: string;
  message: string;
};

export function validateContactForm(
  values: ContactFormValues
): Partial<Record<keyof ContactFormValues, string>> {
  const errors: Partial<Record<keyof ContactFormValues, string>> = {};

  const nameRequired = validateRequired(values.name, "Name");
  if (nameRequired) errors.name = nameRequired;
  else {
    const nameMin = validateMinLength(values.name, 2, "Name");
    if (nameMin) errors.name = nameMin;
    else {
      const nameMax = validateMaxLength(values.name, 120, "Name");
      if (nameMax) errors.name = nameMax;
    }
  }

  const email = validateEmail(values.email);
  if (email) errors.email = email;

  const messageRequired = validateRequired(values.message, "Message");
  if (messageRequired) errors.message = messageRequired;
  else {
    const messageMin = validateMinLength(values.message, 10, "Message");
    if (messageMin) errors.message = messageMin;
    else {
      const messageMax = validateMaxLength(values.message, 2000, "Message");
      if (messageMax) errors.message = messageMax;
    }
  }

  return errors;
}
