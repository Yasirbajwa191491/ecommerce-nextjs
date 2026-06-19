"use client";

import { useQuery } from "convex/react";
import { BarChart3 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { AnimatedSectionHeader } from "@/components/home/animated-section-header";
import { StaggerGroup, StaggerItem } from "@/components/home/scroll-reveal";
import { SHOP_BODY_SM } from "@/lib/typography";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { Card, CardContent } from "@/components/ui/card";
import { MotionSkeleton } from "@/components/motion";
import { STATS_LABELS } from "@/lib/about-content";
import { PAGE_GUTTER, HOME_SECTION_PADDING_Y } from "@/lib/layout-constants";
import { cn } from "@/lib/utils";

export function StoreStatsSection() {
  const stats = useQuery(api.aboutStats.getPublicStats);

  return (
    <section className={cn("bg-background", HOME_SECTION_PADDING_Y)}>
      <div className="mx-auto w-full max-w-[1600px]" style={PAGE_GUTTER}>
        <AnimatedSectionHeader
          badge="By the Numbers"
          badgeIcon={BarChart3}
          title="Store Statistics"
          description="Live figures from our catalog, orders, and growing community of shoppers."
          align="center"
          className="sm:items-center sm:text-center"
        />

        <StaggerGroup className="mt-8 grid grid-cols-2 gap-4 lg:mt-10 lg:grid-cols-4 lg:gap-5">
          {STATS_LABELS.map(({ key, label }, index) => (
            <StaggerItem key={key} index={index} variant="scale">
              <Card
                className={cn(
                  "border-border/60 bg-card text-center shadow-sm",
                  "transition-[transform,box-shadow,border-color] duration-500",
                  "hover:-translate-y-1 hover:border-[#6254f3]/20 hover:shadow-md"
                )}
              >
                <CardContent className="flex flex-col items-center p-5 sm:p-6">
                  {stats === undefined ? (
                    <>
                      <MotionSkeleton shimmer className="h-9 w-16" />
                      <MotionSkeleton shimmer className="mt-3 h-4 w-24" />
                    </>
                  ) : (
                    <>
                      <p className="text-3xl font-bold tracking-tight text-[#6254f3] sm:text-4xl">
                        <AnimatedCounter value={stats[key]} />
                      </p>
                      <p className={cn("mt-2 font-medium", SHOP_BODY_SM)}>
                        {label}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
