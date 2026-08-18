"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AdminSearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
  showClear?: boolean;
};

export function AdminSearchInput({
  value,
  onChange,
  placeholder = "Search",
  className,
  disabled,
  "aria-label": ariaLabel = "Search",
  showClear = true,
}: AdminSearchInputProps) {
  return (
    <div className={cn("relative min-w-0 w-full", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        className={cn("h-9 pl-8", showClear && value.length > 0 && "pr-8")}
      />
      {showClear && value.length > 0 ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute top-1/2 right-1 size-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onClick={() => onChange("")}
          aria-label="Clear search"
          disabled={disabled}
        >
          <X className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
