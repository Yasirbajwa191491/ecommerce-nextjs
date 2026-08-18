"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { AdminFormField, invalidInputClass } from "@/components/admin/admin-form-field";
import { Input } from "@/components/ui/input";
import { getPasswordChecks } from "@/lib/validation/validators";
import { cn } from "@/lib/utils";

type PasswordFieldProps = {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  showHints?: boolean;
};

export function PasswordField({
  id = "password",
  label = "Password",
  value,
  onChange,
  onBlur,
  error,
  showHints = true,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const checks = getPasswordChecks(value);
  const showChecklist = showHints && (value.length > 0 || !!error);

  return (
    <AdminFormField
      label={label}
      htmlFor={id}
      error={error}
      required
      description={
        !showChecklist
          ? "At least 8 characters with upper, lower, number, and symbol"
          : undefined
      }
    >
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={!!error}
          className={cn("pr-11", invalidInputClass(error))}
        />
        <button
          type="button"
          aria-label={visible ? "Hide password" : "Show password"}
          onClick={() => setVisible((v) => !v)}
          className="absolute top-1/2 right-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {showChecklist ? (
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          <CheckItem ok={checks.minLength} label="8+ characters" />
          <CheckItem ok={checks.uppercase} label="Uppercase letter" />
          <CheckItem ok={checks.lowercase} label="Lowercase letter" />
          <CheckItem ok={checks.number} label="Number" />
          <CheckItem ok={checks.special} label="Special character" />
        </ul>
      ) : null}
    </AdminFormField>
  );
}

function CheckItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li
      className={cn(
        "flex items-center gap-2",
        ok ? "text-emerald-600 dark:text-emerald-500" : ""
      )}
    >
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          ok ? "bg-emerald-500" : "bg-muted-foreground/40"
        )}
        aria-hidden
      />
      {label}
    </li>
  );
}
