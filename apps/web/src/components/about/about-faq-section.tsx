"use client";

import { HelpCircle } from "lucide-react";
import { AboutSectionHeader } from "@/components/about/about-section-header";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FAQ_ITEMS } from "@/lib/about-content";
import { PAGE_GUTTER } from "@/lib/layout-constants";

export function AboutFaqSection() {
  return (
    <section className="bg-muted/20 py-8 sm:py-10 md:py-12 lg:py-14">
      <div className="mx-auto w-full max-w-[1600px]" style={PAGE_GUTTER}>
        <AboutSectionHeader
          badge="FAQ"
          badgeIcon={HelpCircle}
          title="Frequently Asked Questions"
          description="Quick answers to common questions about ordering, payments, shipping, and support."
        />

        <Accordion className="mx-auto mt-8 max-w-3xl lg:mt-10">
          {FAQ_ITEMS.map((item, index) => (
            <AccordionItem key={item.question} value={`faq-${index}`}>
              <AccordionTrigger className="text-base font-semibold text-foreground hover:no-underline">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
