import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AdminStickyFooterProps = {
  children: ReactNode;
  className?: string;
};

/** Sticky footer for admin forms — stays above main content, not the sidebar (lg:left-64). */
export function AdminStickyFooter({ children, className }: AdminStickyFooterProps) {
  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-30 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6 lg:left-64",
        className
      )}
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-end gap-2">
        {children}
      </div>
    </div>
  );
}
