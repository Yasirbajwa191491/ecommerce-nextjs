"use client";

import { useQuery } from "convex/react";
import { BarChart3 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { AboutSectionHeader } from "@/components/about/about-section-header";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { STATS_LABELS } from "@/lib/about-content";
import { PAGE_GUTTER } from "@/lib/layout-constants";

export function AboutStatsSection() {
  const stats = useQuery(api.aboutStats.getPublicStats);

  return (
    <section className="bg-background py-8 sm:py-10 md:py-12 lg:py-14">
      <div className="mx-auto w-full max-w-[1600px]" style={PAGE_GUTTER}>
        <AboutSectionHeader
          badge="By the Numbers"
          badgeIcon={BarChart3}
          title="Our Store at a Glance"
          description="Real-time figures from our catalog and order history."
        />

        <div className="mt-8 grid grid-cols-2 gap-4 lg:mt-10 lg:grid-cols-4 lg:gap-5">
          {STATS_LABELS.map(({ key, label }) => (
            <Card
              key={key}
              className="border-border/60 bg-card text-center shadow-sm"
            >
              <CardContent className="flex flex-col items-center p-5 sm:p-6">
                {stats === undefined ? (
                  <>
                    <Skeleton className="h-9 w-16" />
                    <Skeleton className="mt-3 h-4 w-24" />
                  </>
                ) : (
                  <>
                    <p className="text-3xl font-bold tracking-tight text-[#6254f3] sm:text-4xl">
                      <AnimatedCounter value={stats[key]} />
                    </p>
                    <p className="mt-2 text-xs font-medium text-muted-foreground sm:text-sm">
                      {label}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
