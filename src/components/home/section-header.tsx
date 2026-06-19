import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SECTION_ACTION_BUTTON_CLASS } from "@/lib/layout-constants";
import {
  SHOP_EYEBROW,
  SHOP_SECTION_ACTION,
  SHOP_SECTION_LEAD,
  SHOP_SECTION_TITLE,
} from "@/lib/typography";
import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  badge?: string;
  badgeIcon?: LucideIcon;
  title: string;
  description?: string;
  align?: "left" | "center";
  action?: {
    label: string;
    href: string;
  };
  className?: string;
};

export function SectionHeader({
  badge,
  badgeIcon: BadgeIcon,
  title,
  description,
  align = "left",
  action,
  className,
}: SectionHeaderProps) {
  const isCenter = align === "center";

  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6",
        isCenter && "sm:flex-col sm:items-center sm:text-center",
        className
      )}
    >
      <div className={cn("min-w-0 max-w-3xl", isCenter && "mx-auto text-center")}>
        {badge ? (
          <span className={SHOP_EYEBROW}>
            {BadgeIcon ? <BadgeIcon className="size-4 sm:size-5" /> : null}
            {badge}
          </span>
        ) : null}
        <h2 className={cn(SHOP_SECTION_TITLE, badge ? "mt-3" : "mt-0")}>
          {title}
        </h2>
        {description ? (
          <p className={cn(SHOP_SECTION_LEAD, isCenter && "mx-auto")}>{description}</p>
        ) : null}
      </div>

      {action ? (
        <Button
          render={<Link href={action.href} />}
          variant="outline"
          className={cn(
            SECTION_ACTION_BUTTON_CLASS,
            SHOP_SECTION_ACTION,
            isCenter && "self-center sm:self-center"
          )}
        >
          {action.label}
          <ArrowRight className="size-4 sm:size-5" />
        </Button>
      ) : null}
    </div>
  );
}
