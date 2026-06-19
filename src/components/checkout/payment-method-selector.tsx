"use client";

import { Banknote, CreditCard } from "lucide-react";
import { ShopLabel } from "@/components/shop";
import { SHOP_BODY_SM } from "@/lib/typography";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/lib/validation/checkout-form";

type PaymentMethodSelectorProps = {
  value: PaymentMethod | "";
  onChange: (value: PaymentMethod) => void;
  onBlur?: () => void;
  disabled?: boolean;
  error?: string;
};

const options = [
  {
    value: "cod" as const,
    label: "Cash on Delivery",
    description: "Pay when your order arrives at your doorstep.",
    icon: Banknote,
  },
  {
    value: "stripe" as const,
    label: "Credit / Debit Card",
    description: "Secure payment powered by Stripe Checkout.",
    icon: CreditCard,
  },
];

export function PaymentMethodSelector({
  value,
  onChange,
  onBlur,
  disabled,
  error,
}: PaymentMethodSelectorProps) {
  return (
    <div className="space-y-3">
      <ShopLabel>
        Payment method <span className="text-destructive">*</span>
      </ShopLabel>
      <RadioGroup
        value={value}
        onValueChange={(next) => onChange(next as PaymentMethod)}
        onBlur={onBlur}
        disabled={disabled}
        className="grid gap-3"
        aria-invalid={!!error}
      >
        {options.map(({ value: optionValue, label, description, icon: Icon }) => {
          const selected = value === optionValue;
          return (
            <label
              key={optionValue}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border p-5 transition-colors",
                selected
                  ? "border-[#6254f3]/50 bg-[#6254f3]/5 ring-1 ring-[#6254f3]/20"
                  : "border-border/60 bg-card hover:bg-muted/20",
                disabled && "cursor-not-allowed opacity-60"
              )}
            >
              <RadioGroupItem value={optionValue} className="mt-0.5" />
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-[#6254f3]">
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold text-foreground">
                  {label}
                </span>
                <span className={cn("mt-0.5 block", SHOP_BODY_SM)}>
                  {description}
                </span>
              </span>
            </label>
          );
        })}
      </RadioGroup>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
