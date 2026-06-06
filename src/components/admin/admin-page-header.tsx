import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

type AdminPageHeaderProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  action?: ReactNode;
};

export function AdminPageHeader({
  title,
  description,
  actionLabel,
  onAction,
  action,
}: AdminPageHeaderProps) {
  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl lg:text-2xl">
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {action ? (
          <div className="flex flex-wrap items-center gap-2 lg:shrink-0 lg:justify-end">
            {action}
          </div>
        ) : actionLabel && onAction ? (
          <Button size="sm" onClick={onAction} className="shrink-0">
            {actionLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
