"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
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

type ShopErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
};

export function ShopErrorState({
  title = "Something went wrong",
  description = "We couldn't load this content. Please try again.",
  onRetry,
  className,
}: ShopErrorStateProps) {
  return (
    <Empty
      className={cn(
        "rounded-2xl border border-destructive/20 bg-destructive/5 py-10",
        className
      )}
    >
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <AlertCircle className="size-6 text-destructive" />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {onRetry ? (
        <EmptyContent>
          <Button
            onClick={onRetry}
            variant="outline"
            className="gap-2 rounded-full"
          >
            <RefreshCw className="size-4" />
            Try again
          </Button>
        </EmptyContent>
      ) : null}
    </Empty>
  );
}
