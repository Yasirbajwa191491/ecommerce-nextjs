"use client";

import { ExternalLink } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StripeCheckoutCtaProps = {
  checkoutUrl: string;
  orderNumber?: string;
  className?: string;
  compact?: boolean;
};

export function StripeCheckoutCta({
  checkoutUrl,
  orderNumber,
  className,
  compact = false,
}: StripeCheckoutCtaProps) {
  if (compact) {
    return (
      <a
        href={checkoutUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          buttonVariants({ size: "sm" }),
          "mt-2 w-full",
          className
        )}
      >
        <ExternalLink className="mr-2 size-3.5" />
        Open Stripe checkout
      </a>
    );
  }

  return (
    <div
      className={cn(
        "mt-3 rounded-xl border-2 border-primary/30 bg-primary/5 px-4 py-3",
        className
      )}
    >
      <p className="text-sm font-semibold text-foreground">Stripe checkout</p>
      {orderNumber ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Order {orderNumber}
        </p>
      ) : null}
      <p className="mt-1 text-xs text-muted-foreground">
        Pay securely on Stripe&apos;s hosted page — card details never go through
        voice chat.
      </p>
      <a
        href={checkoutUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(buttonVariants(), "mt-3 w-full")}
      >
        <ExternalLink className="mr-2 size-4" />
        Open Stripe checkout session
      </a>
      <a
        href={checkoutUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 block truncate text-[11px] text-primary underline underline-offset-2"
      >
        {checkoutUrl}
      </a>
    </div>
  );
}
