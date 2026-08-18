"use client";

import { useCallback, useMemo, useState } from "react";

export function useFormValidation<T extends object>(
  values: T,
  validateFn: (values: T) => Partial<Record<string, string>>
) {
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);

  const allErrors = useMemo(() => validateFn(values), [values, validateFn]);

  const visibleErrors = useMemo(() => {
    if (submitted) return allErrors;
    const partial: Partial<Record<string, string>> = {};
    for (const key of touched) {
      if (allErrors[key]) partial[key] = allErrors[key];
    }
    return partial;
  }, [allErrors, touched, submitted]);

  const touch = useCallback((field: string) => {
    setTouched((prev) => new Set(prev).add(field));
  }, []);

  const validateAll = useCallback(() => {
    setSubmitted(true);
    const errors = validateFn(values);
    const fields = new Set(Object.keys(values as object));
    for (const key of Object.keys(errors)) fields.add(key);
    setTouched(fields);
    return Object.keys(errors).length === 0;
  }, [validateFn, values]);

  const reset = useCallback(() => {
    setTouched(new Set());
    setSubmitted(false);
  }, []);

  const fieldError = useCallback(
    (field: string) => visibleErrors[field],
    [visibleErrors]
  );

  const hasVisibleErrors = Object.keys(visibleErrors).length > 0;

  return {
    touch,
    validateAll,
    reset,
    fieldError,
    visibleErrors,
    hasVisibleErrors,
    submitted,
  };
}
