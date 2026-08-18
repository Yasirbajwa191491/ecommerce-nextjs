import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function ShopButton({
  className,
  size = "lg",
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      size={size}
      className={cn(
        "h-12 px-6 text-base font-semibold",
        className
      )}
      {...props}
    />
  );
}

export { ShopButton };
