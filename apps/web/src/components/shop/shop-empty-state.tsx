"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

type ShopEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { href: string; label: string };
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
};

export function ShopEmptyState({
  icon: Icon,
  title,
  description,
  action,
  onAction,
  actionLabel,
  className,
}: ShopEmptyStateProps) {
  return (
    <Empty
      className={cn(
        "rounded-2xl border border-dashed border-border/60 bg-muted/20 py-12",
        className
      )}
    >
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon className="size-6 text-brand-primary" />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description ? <EmptyDescription>{description}</EmptyDescription> : null}
      </EmptyHeader>
      {(action || onAction) && (
        <EmptyContent>
          {action ? (
            <Button
              render={<Link href={action.href} />}
              className="rounded-full bg-brand-primary hover:bg-brand-primary-hover"
            >
              {action.label}
            </Button>
          ) : onAction && actionLabel ? (
            <Button
              onClick={onAction}
              variant="outline"
              className="rounded-full border-brand-primary/30 text-brand-primary hover:bg-brand-primary/5"
            >
              {actionLabel}
            </Button>
          ) : null}
        </EmptyContent>
      )}
    </Empty>
  );
}
