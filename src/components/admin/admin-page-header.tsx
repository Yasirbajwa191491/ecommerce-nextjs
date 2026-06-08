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
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end lg:shrink-0">
            {action}
          </div>
        ) : actionLabel && onAction ? (
          <div className="w-full sm:w-auto lg:shrink-0">
            <Button
              size="sm"
              onClick={onAction}
              className="w-full sm:w-auto"
            >
              {actionLabel}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
