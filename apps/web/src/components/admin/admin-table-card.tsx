import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AdminTableCardProps = {
  children: ReactNode;
  className?: string;
};

export function AdminTableCard({ children, className }: AdminTableCardProps) {
  return (
    <div className={cn("min-w-0 rounded-lg border bg-background", className)}>
      {children}
    </div>
  );
}
