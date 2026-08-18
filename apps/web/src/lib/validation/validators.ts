import { isValidPhoneNumber } from "libphonenumber-js";

export type ValidationResult = string | undefined;

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const URL_REGEX =
  /^https?:\/\/[\w.-]+(?:\.[\w.-]+)+[\w\-._~:/?#[\]@!$&'()*+,;=.]*$/i;

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateRequired(
  value: string,
  label: string
): ValidationResult {
  if (!value.trim()) return `${label} is required`;
  return undefined;
}

export function validateMinLength(
  value: string,
  min: number,
  label: string
): ValidationResult {
  if (value.trim().length < min) {
    return `${label} must be at least ${min} characters`;
  }
  return undefined;
}

export function validateMaxLength(
  value: string,
  max: number,
  label: string
): ValidationResult {
  if (value.trim().length > max) {
    return `${label} must be ${max} characters or fewer`;
  }
  return undefined;
}

export function validateEmail(email: string): ValidationResult {
  const required = validateRequired(email, "Email");
  if (required) return required;
  if (!EMAIL_REGEX.test(email.trim())) {
    return "Enter a valid email address";
  }
  return undefined;
}

export type PasswordChecks = {
  minLength: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
};

export function getPasswordChecks(password: string): PasswordChecks {
  return {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

export function validateStrongPassword(password: string): ValidationResult {
  if (!password) return "Password is required";
  const checks = getPasswordChecks(password);
  if (!checks.minLength) return "Password must be at least 8 characters";
  if (!checks.uppercase) return "Include at least one uppercase letter (A–Z)";
  if (!checks.lowercase) return "Include at least one lowercase letter (a–z)";
  if (!checks.number) return "Include at least one number (0–9)";
  if (!checks.special) return "Include at least one special character (!@#$…)";
  return undefined;
}

export function validatePersonName(name: string, label = "Name"): ValidationResult {
  const required = validateRequired(name, label);
  if (required) return required;
  const trimmed = name.trim();
  if (trimmed.length < 2) return `${label} must be at least 2 characters`;
  if (!/^[\p{L}\p{M}'\s.-]+$/u.test(trimmed)) {
    return `${label} contains invalid characters`;
  }
  return undefined;
}

export function validateUrl(url: string, required = false): ValidationResult {
  const trimmed = url.trim();
  if (!trimmed) return required ? "Image URL is required" : undefined;
  if (!URL_REGEX.test(trimmed)) {
    return "Enter a valid URL starting with http:// or https://";
  }
  return undefined;
}

export function validateSlug(slug: string): ValidationResult {
  const required = validateRequired(slug, "Slug");
  if (required) return required;
  const trimmed = slug.trim().toLowerCase();
  if (!SLUG_REGEX.test(trimmed)) {
    return "Use lowercase letters, numbers, and hyphens only";
  }
  return undefined;
}

export function validatePositiveNumber(
  value: number,
  label: string,
  options?: { min?: number; max?: number; allowZero?: boolean }
): ValidationResult {
  if (Number.isNaN(value)) return `${label} must be a valid number`;
  const min = options?.min ?? (options?.allowZero ? 0 : 0.01);
  if (value < min) {
    return options?.allowZero && min === 0
      ? `${label} cannot be negative`
      : `${label} must be greater than ${min === 0.01 ? "0" : String(min)}`;
  }
  if (options?.max !== undefined && value > options.max) {
    return `${label} must be ${options.max} or less`;
  }
  return undefined;
}

export function validateRating(stars: number): ValidationResult {
  return validatePositiveNumber(stars, "Rating", { min: 0, max: 5, allowZero: true });
}

export function validatePhone(phone: string): ValidationResult {
  const required = validateRequired(phone, "Phone number");
  if (required) return required;

  if (!isValidPhoneNumber(phone.trim())) {
    return "Enter a valid phone number";
  }
  return undefined;
}
