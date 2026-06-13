import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SECTION_ACTION_BUTTON_CLASS } from "@/lib/layout-constants";
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
      <div className={cn("min-w-0 max-w-2xl", isCenter && "mx-auto text-center")}>
        {badge ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-[#6254f3]/20 bg-[#6254f3]/5 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-[#6254f3] uppercase sm:text-xs">
            {BadgeIcon ? <BadgeIcon className="size-3.5" /> : null}
            {badge}
          </span>
        ) : null}
        <h2 className="mt-3 text-xl font-bold tracking-tight text-foreground sm:text-2xl md:text-3xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {description}
          </p>
        ) : null}
      </div>

      {action ? (
        <Button
          render={<Link href={action.href} />}
          variant="outline"
          className={cn(
            SECTION_ACTION_BUTTON_CLASS,
            isCenter && "self-center sm:self-center"
          )}
        >
          {action.label}
          <ArrowRight className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
