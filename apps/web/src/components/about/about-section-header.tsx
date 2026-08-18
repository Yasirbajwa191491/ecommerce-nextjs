import type { LucideIcon } from "lucide-react";
import {
  SHOP_EYEBROW,
  SHOP_SECTION_LEAD,
  SHOP_SECTION_TITLE,
} from "@/lib/typography";
import { cn } from "@/lib/utils";

type AboutSectionHeaderProps = {
  badge: string;
  badgeIcon: LucideIcon;
  title: string;
  description?: string;
  descriptionClassName?: string;
  align?: "left" | "center";
  className?: string;
};

export function AboutSectionHeader({
  badge,
  badgeIcon: BadgeIcon,
  title,
  description,
  descriptionClassName,
  align = "center",
  className,
}: AboutSectionHeaderProps) {
  return (
    <div
      className={cn(
        "mx-auto max-w-3xl",
        align === "center" && "text-center",
        align === "left" && "md:text-left",
        className
      )}
    >
      <span className={SHOP_EYEBROW}>
        <BadgeIcon className="size-3.5 sm:size-4" />
        {badge}
      </span>
      <h2 className={cn(SHOP_SECTION_TITLE, "mt-2")}>{title}</h2>
      {description ? (
        <p className={cn(SHOP_SECTION_LEAD, descriptionClassName)}>{description}</p>
      ) : null}
    </div>
  );
}
