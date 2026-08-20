export type ContactFormValues = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

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

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

function validateEmail(email: string): string | undefined {
  const required = validateRequired(email, "Email");
  if (required) return required;
  if (!EMAIL_REGEX.test(email.trim())) {
    return "Enter a valid email address";
  }
  return undefined;
}

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

  const subjectRequired = validateRequired(values.subject, "Inquiry category");
  if (subjectRequired) errors.subject = subjectRequired;

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
