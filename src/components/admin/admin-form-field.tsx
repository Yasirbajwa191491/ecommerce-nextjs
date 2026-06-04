"use client";

import { cn } from "@/lib/utils";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";

type AdminFormFieldProps = {
  label: string;
  htmlFor?: string;
  error?: string;
  description?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
};

export function AdminFormField({
  label,
  htmlFor,
  error,
  description,
  required,
  className,
  children,
}: AdminFormFieldProps) {
  return (
    <Field className={className} data-invalid={!!error}>
      <FieldLabel htmlFor={htmlFor}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </FieldLabel>
      <FieldContent>
        {children}
        {description && !error ? (
          <FieldDescription>{description}</FieldDescription>
        ) : null}
        <FieldError>{error}</FieldError>
      </FieldContent>
    </Field>
  );
}

export function invalidInputClass(error?: string) {
  return cn(
    error &&
      "border-destructive/80 focus-visible:border-destructive focus-visible:ring-destructive/20"
  );
}
