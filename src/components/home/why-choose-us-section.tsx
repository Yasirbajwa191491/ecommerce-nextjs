"use client";

import { ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "@/components/home/section-header";
import { ScrollReveal, StaggerGroup, StaggerItem } from "@/components/home/scroll-reveal";
import { WHY_CHOOSE_US_FEATURES } from "@/lib/home-content";
import { PAGE_GUTTER } from "@/lib/layout-constants";
import { cn } from "@/lib/utils";

export function WhyChooseUsSection() {
  return (
    <section className="bg-background py-10 sm:py-14 md:py-16">
      <div className="mx-auto w-full max-w-[1600px]" style={PAGE_GUTTER}>
        <ScrollReveal variant="fade">
          <SectionHeader
            badge="Why Us"
            badgeIcon={ShieldCheck}
            title="Why Choose Us"
            description="We combine secure payments, reliable delivery, and responsive support so you can shop with confidence."
            align="center"
            className="sm:items-center sm:text-center"
          />
        </ScrollReveal>

        <StaggerGroup className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:mt-10 lg:grid-cols-4 lg:gap-5">
          {WHY_CHOOSE_US_FEATURES.map(({ title, description, icon: Icon }, index) => (
            <StaggerItem key={title} index={index} variant="scale">
              <Card
                className={cn(
                  "h-full border-border/60 bg-card shadow-sm",
                  "transition-[transform,box-shadow,border-color] duration-500 ease-out",
                  "hover:-translate-y-1 hover:border-[#6254f3]/25 hover:shadow-lg hover:shadow-[#6254f3]/5"
                )}
              >
                <CardContent className="p-6">
                  <span
                    className={cn(
                      "flex size-11 items-center justify-center rounded-xl bg-[#6254f3]/10 text-[#6254f3]",
                      "transition-transform duration-500 group-hover:scale-105"
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-foreground">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
