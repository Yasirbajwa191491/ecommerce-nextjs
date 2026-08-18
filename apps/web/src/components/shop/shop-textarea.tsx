import * as React from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

function ShopTextarea({
  className,
  ...props
}: React.ComponentProps<typeof Textarea>) {
  return (
    <Textarea
      className={cn(
        "min-h-32 px-4 py-3 text-base leading-relaxed md:text-base",
        className
      )}
      {...props}
    />
  );
}

export { ShopTextarea };
