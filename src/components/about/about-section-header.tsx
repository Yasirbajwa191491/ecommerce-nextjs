import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type AboutSectionHeaderProps = {
  badge: string;
  badgeIcon: LucideIcon;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
};

export function AboutSectionHeader({
  badge,
  badgeIcon: BadgeIcon,
  title,
  description,
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
      <span className="inline-flex items-center gap-2 rounded-full border border-[#6254f3]/20 bg-[#6254f3]/5 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-[#6254f3] uppercase sm:text-xs">
        <BadgeIcon className="size-3.5" />
        {badge}
      </span>
      <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {description}
        </p>
      ) : null}
    </div>
  );
}
