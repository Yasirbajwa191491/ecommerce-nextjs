import {
  normalizeSettingName,
  settingKeyFromName,
} from "@/lib/setting-key";
import { isRichTextSettingKey } from "@/lib/legal-content";
import {
  validateMaxLength,
  validateMinLength,
  validateRequired,
} from "./validators";

const EMAIL_FROM_DISPLAY_REGEX =
  /^.+\s<[^\s@]+@[^\s@]+\.[^\s@]+>$/;

function validateEmailFrom(value: string) {
  const trimmed = value.trim();
  const required = validateRequired(trimmed, "Email from");
  if (required) return required;
  if (
    EMAIL_FROM_DISPLAY_REGEX.test(trimmed) ||
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
  ) {
    return undefined;
  }
  return 'Use an email (you@domain.com) or "Store Name <you@domain.com>"';
}

export type SettingFormValues = {
  name: string;
  value: string;
};

export function validateSettingForm(
  values: SettingFormValues,
  options?: {
    takenNames?: string[];
    takenKeys?: string[];
    settingKey?: string;
    isSystem?: boolean;
  }
): Partial<Record<keyof SettingFormValues, string>> {
  const errors: Partial<Record<keyof SettingFormValues, string>> = {};

  const nameRequired = validateRequired(values.name, "Setting name");
  if (nameRequired) errors.name = nameRequired;
  else {
    const nameMin = validateMinLength(values.name, 2, "Setting name");
    if (nameMin) errors.name = nameMin;
    else {
      const nameMax = validateMaxLength(values.name, 80, "Setting name");
      if (nameMax) errors.name = nameMax;
      else {
        const normalized = normalizeSettingName(values.name).toLowerCase();
        if (options?.takenNames?.includes(normalized)) {
          errors.name = "A setting with this name already exists";
        } else if (!options?.isSystem && options?.takenKeys?.length) {
          const key = settingKeyFromName(values.name);
          if (options.takenKeys.includes(key)) {
            errors.name = "A setting with this name already exists";
          }
        }
      }
    }
  }

  if (options?.settingKey === "email_from") {
    const emailFromError = validateEmailFrom(values.value);
    if (emailFromError) errors.value = emailFromError;
  } else if (isRichTextSettingKey(options?.settingKey)) {
    const valueRequired = validateRequired(values.value, "Content");
    if (valueRequired) {
      errors.value = valueRequired;
    } else {
      try {
        const parsed = JSON.parse(values.value) as { type?: string };
        if (parsed.type !== "doc") {
          errors.value = "Content must be valid rich text";
        }
      } catch {
        errors.value = "Content must be valid rich text";
      }
    }
  } else {
    const valueRequired = validateRequired(values.value, "Setting value");
    if (valueRequired) errors.value = valueRequired;
    else {
      const valueMax = validateMaxLength(values.value, 1000, "Setting value");
      if (valueMax) errors.value = valueMax;
    }
  }

  return errors;
}
