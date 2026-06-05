"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  DEFAULT_COLOR_PRESETS,
  isLightColor,
  normalizeHexColor,
} from "@/lib/color-presets";
import { X } from "lucide-react";

type ColorInputProps = {
  value: string[];
  onChange: (colors: string[]) => void;
  presets?: readonly string[];
  className?: string;
};

export function ColorInput({
  value,
  onChange,
  presets = DEFAULT_COLOR_PRESETS,
  className,
}: ColorInputProps) {
  const [customInput, setCustomInput] = useState("");

  const togglePreset = (hex: string) => {
    const normalized = normalizeHexColor(hex);
    if (!normalized) return;
    if (value.some((c) => normalizeHexColor(c) === normalized)) {
      onChange(value.filter((c) => normalizeHexColor(c) !== normalized));
    } else {
      onChange([...value, normalized]);
    }
  };

  const addCustomColor = () => {
    const normalized = normalizeHexColor(customInput);
    if (!normalized) return;
    if (!value.some((c) => normalizeHexColor(c) === normalized)) {
      onChange([...value, normalized]);
    }
    setCustomInput(normalized);
  };

  const removeColor = (hex: string) => {
    const normalized = normalizeHexColor(hex);
    onChange(value.filter((c) => normalizeHexColor(c) !== normalized));
  };

  const isSelected = (hex: string) => {
    const normalized = normalizeHexColor(hex);
    return value.some((c) => normalizeHexColor(c) === normalized);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
        {presets.map((hex) => {
          const selected = isSelected(hex);
          const light = isLightColor(hex);
          return (
            <button
              key={hex}
              type="button"
              aria-label={`Color ${hex}`}
              aria-pressed={selected}
              onClick={() => togglePreset(hex)}
              className={cn(
                "size-8 rounded-md transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-ring",
                light && "border border-border",
                selected && "ring-2 ring-foreground ring-offset-2 ring-offset-background"
              )}
              style={{ backgroundColor: hex }}
            />
          );
        })}
      </div>

      <Input
        value={customInput}
        onChange={(e) => setCustomInput(e.target.value)}
        onBlur={addCustomColor}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addCustomColor();
          }
        }}
        placeholder="#EB7185"
        className="font-mono text-sm"
        aria-label="Custom color hex code"
      />

      {value.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {value.map((hex) => {
            const normalized = normalizeHexColor(hex) ?? hex;
            const light = isLightColor(normalized);
            return (
              <span
                key={normalized}
                className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 py-0.5 pr-1 pl-1.5 text-xs"
              >
                <span
                  className={cn(
                    "size-4 shrink-0 rounded-full",
                    light && "border border-border"
                  )}
                  style={{ backgroundColor: normalized }}
                />
                <span className="font-mono">{normalized}</span>
                <button
                  type="button"
                  onClick={() => removeColor(normalized)}
                  className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={`Remove ${normalized}`}
                >
                  <X className="size-3" />
                </button>
              </span>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Select preset colors or enter a hex code above.
        </p>
      )}
    </div>
  );
}
