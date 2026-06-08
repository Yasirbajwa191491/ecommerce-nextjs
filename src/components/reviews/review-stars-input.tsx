"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type ReviewStarsInputProps = {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
  className?: string;
};

export function ReviewStarsInput({
  value,
  onChange,
  disabled,
  className,
}: ReviewStarsInputProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: 5 }).map((_, index) => {
        const starValue = index + 1;
        const filled = value >= starValue;
        return (
          <button
            key={starValue}
            type="button"
            disabled={disabled}
            onClick={() => onChange(starValue)}
            className="rounded p-0.5 transition hover:scale-110 disabled:opacity-50"
            aria-label={`${starValue} star${starValue === 1 ? "" : "s"}`}
          >
            <Star
              className={cn(
                "size-7",
                filled
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/40"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
