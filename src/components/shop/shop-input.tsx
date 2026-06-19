import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function ShopInput({ className, ...props }: React.ComponentProps<typeof Input>) {
  return (
    <Input
      className={cn(
        "h-12 px-4 py-2 text-base md:text-base",
        className
      )}
      {...props}
    />
  );
}

export { ShopInput };
