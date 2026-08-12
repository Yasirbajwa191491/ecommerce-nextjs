"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PAGE_GUTTER, HOME_SECTION_PADDING_Y } from "@/lib/layout-constants";
import { SHOP_EYEBROW, SHOP_SECTION_LEAD, SHOP_SECTION_TITLE } from "@/lib/typography";
import { cn } from "@/lib/utils";

type ShopSectionProps = {
  badge?: string;
  title: string;
  description?: string;
  action?: { href: string; label: string };
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  padding?: "home" | "content" | "none";
  bordered?: boolean;
  id?: string;
};

export function ShopSection({
  badge,
  title,
  description,
  action,
  children,
  className,
  innerClassName,
  padding = "home",
  bordered = false,
  id,
}: ShopSectionProps) {
  const paddingClass =
    padding === "home"
      ? HOME_SECTION_PADDING_Y
      : padding === "content"
        ? "py-4 sm:py-5 lg:py-6"
        : "";

  return (
    <section
      id={id}
      className={cn(
        bordered && "border-y border-border/60 bg-muted/20",
        paddingClass,
        className
      )}
    >
      <div
        className={cn("mx-auto w-full max-w-[1600px]", innerClassName)}
        style={PAGE_GUTTER}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="min-w-0">
            {badge ? <span className={SHOP_EYEBROW}>{badge}</span> : null}
            <h2 className={cn(SHOP_SECTION_TITLE, badge && "mt-3")}>{title}</h2>
            {description ? (
              <p className={SHOP_SECTION_LEAD}>{description}</p>
            ) : null}
          </div>
          {action ? (
            <Button
              variant="outline"
              render={<Link href={action.href} />}
              className="h-10 w-fit shrink-0 gap-2 self-start rounded-full border-brand-primary/30 px-5 text-sm font-semibold text-brand-primary hover:bg-brand-primary/5 sm:h-11 sm:self-auto sm:px-6 sm:text-base"
            >
              {action.label}
              <ArrowRight className="size-4" />
            </Button>
          ) : null}
        </div>
        {children}
      </div>
    </section>
  );
}
