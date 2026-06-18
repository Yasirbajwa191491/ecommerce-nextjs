"use client";

import { Truck } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatCurrencyAmount } from "@/lib/currencies";
import { cn } from "@/lib/utils";

export type DeliveryMethodOption = {
  type: string;
  label: string;
  charge: number;
  estimate: string;
};

type DeliveryMethodSelectorProps = {
  methods: DeliveryMethodOption[];
  value: string;
  onChange: (value: string) => void;
  currency: string;
  disabled?: boolean;
};

export function DeliveryMethodSelector({
  methods,
  value,
  onChange,
  currency,
  disabled,
}: DeliveryMethodSelectorProps) {
  if (methods.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Truck className="size-4 text-[#6254f3]" />
        <Label className="text-sm font-semibold">Delivery method</Label>
      </div>
      <RadioGroup
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        className="grid gap-2"
      >
        {methods.map((method) => (
          <label
            key={method.type}
            htmlFor={`delivery-${method.type}`}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
              value === method.type
                ? "border-[#6254f3] bg-[#6254f3]/5"
                : "border-border/70 hover:bg-muted/40"
            )}
          >
            <RadioGroupItem
              value={method.type}
              id={`delivery-${method.type}`}
              className="mt-0.5"
            />
            <div className="flex flex-1 flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{method.label}</span>
                <span className="text-sm font-semibold tabular-nums">
                  {method.charge <= 0
                    ? "Free"
                    : formatCurrencyAmount(method.charge, currency)}
                </span>
              </div>
              <span className="text-sm text-muted-foreground">
                {method.estimate}
              </span>
            </div>
          </label>
        ))}
      </RadioGroup>
    </div>
  );
}
