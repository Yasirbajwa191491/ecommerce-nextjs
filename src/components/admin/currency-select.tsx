"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  formatCurrencyLabel,
  getCurrencyByCode,
} from "@/lib/currencies";
import { Check, ChevronsUpDown } from "lucide-react";

type CurrencySelectProps = {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
};

export function CurrencySelect({
  value,
  onChange,
  disabled,
  className,
  "aria-invalid": ariaInvalid,
}: CurrencySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = getCurrencyByCode(value) ?? getCurrencyByCode(DEFAULT_CURRENCY);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return CURRENCIES;
    return CURRENCIES.filter(
      (c) =>
        c.code.toLowerCase().includes(term) ||
        c.name.toLowerCase().includes(term)
    );
  }, [search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        render={
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-invalid={ariaInvalid}
            disabled={disabled}
            className={cn(
              "w-full justify-between font-normal",
              ariaInvalid && "border-destructive ring-destructive/20",
              className
            )}
          >
            <span className="truncate">
              {selected ? formatCurrencyLabel(selected.code) : "Select currency"}
            </span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        }
      />
      <PopoverContent className="w-[var(--anchor-width)] min-w-[280px] p-0" align="start">
        <div className="border-b p-2">
          <Input
            placeholder="Search currency..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
          />
        </div>
        <ul className="max-h-60 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <li className="px-2 py-6 text-center text-sm text-muted-foreground">
              No currency found
            </li>
          ) : (
            filtered.map((currency) => {
              const isSelected = currency.code === value;
              return (
                <li key={currency.code}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent",
                      isSelected && "bg-accent"
                    )}
                    onClick={() => {
                      onChange(currency.code);
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    <Check
                      className={cn(
                        "size-4 shrink-0",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="font-medium">{currency.code}</span>
                    <span className="truncate text-muted-foreground">
                      {currency.name}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
