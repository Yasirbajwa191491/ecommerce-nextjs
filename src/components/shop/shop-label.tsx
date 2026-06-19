"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function ShopLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  return (
    <Label
      className={cn("text-base font-medium", className)}
      {...props}
    />
  );
}

export { ShopLabel };
