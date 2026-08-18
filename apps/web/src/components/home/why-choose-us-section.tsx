"use client";

import { ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedSectionHeader } from "@/components/home/animated-section-header";
import { StaggerGroup, StaggerItem } from "@/components/home/scroll-reveal";
import { SHOP_BODY, SHOP_CARD_TITLE } from "@/lib/typography";
import { WHY_CHOOSE_US_FEATURES } from "@/lib/home-content";
import { PAGE_GUTTER, HOME_SECTION_PADDING_Y } from "@/lib/layout-constants";
import { cn } from "@/lib/utils";

export function WhyChooseUsSection() {
  return (
    <section className={cn("bg-background", HOME_SECTION_PADDING_Y)}>
      <div className="mx-auto w-full max-w-[1600px]" style={PAGE_GUTTER}>
        <AnimatedSectionHeader
          badge="Why Us"
          badgeIcon={ShieldCheck}
          title="Why Choose Us"
          description="We combine secure payments, reliable delivery, and responsive support so you can shop with confidence."
          align="center"
          className="sm:items-center sm:text-center"
        />

        <StaggerGroup className="mt-8 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:mt-10 lg:grid-cols-4 lg:gap-5">
          {WHY_CHOOSE_US_FEATURES.map(({ title, description, icon: Icon }, index) => (
            <StaggerItem key={title} index={index} variant="scale" className="h-full w-full">
              <Card
                className={cn(
                  "h-full w-full border-border/60 bg-card shadow-sm",
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
                  <h3 className={cn("mt-4", SHOP_CARD_TITLE)}>
                    {title}
                  </h3>
                  <p className={cn("mt-2", SHOP_BODY)}>
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
