"use client";

import { Badge } from "@/components/ui/badge";
import { toastSuccess } from "@/lib/app-toast";

const PLACEHOLDERS = [
  "{{subscriber_email}}",
  "{{current_date}}",
  "{{company_name}}",
  "{{company_email}}",
  "{{company_phone}}",
  "{{unsubscribe_link}}",
] as const;

export function PlaceholderReference() {
  return (
    <div className="flex flex-wrap gap-2">
      {PLACEHOLDERS.map((token) => (
        <button
          key={token}
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(token);
            toastSuccess("Copied", { description: `${token} copied to clipboard.` });
          }}
        >
          <Badge variant="secondary" className="cursor-pointer font-mono text-xs">
            {token}
          </Badge>
        </button>
      ))}
    </div>
  );
}
