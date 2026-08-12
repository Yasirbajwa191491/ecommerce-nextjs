"use client";

import { Bot, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AiShoppingFeatureCard } from "@/components/ai-shopping/ai-shopping-feature-card";
import { AiShoppingHero } from "@/components/ai-shopping/ai-shopping-hero";
import { AI_SHOPPING_CAPABILITIES, AI_SHOPPING_FAQ } from "@/lib/ai-shopping-content";
import {
  AI_SHOPPING_WIDE_WIDTH,
  CONTENT_SECTION_PADDING_Y,
  PAGE_GUTTER,
} from "@/lib/layout-constants";
import { requestOpenVapiAssistant } from "@/lib/site";
import { SHOP_BODY, SHOP_SECTION_TITLE } from "@/lib/typography";
import { cn } from "@/lib/utils";

export function AiShoppingPageView() {
  return (
    <div className={cn("bg-background pb-24 sm:pb-8", CONTENT_SECTION_PADDING_Y)}>
      <div className={AI_SHOPPING_WIDE_WIDTH} style={PAGE_GUTTER}>
        <AiShoppingHero />

        <section className="mt-10 lg:mt-12" aria-labelledby="ai-capabilities-heading">
          <div className="max-w-2xl xl:max-w-3xl">
            <p className="text-xs font-semibold tracking-[0.14em] text-brand-primary uppercase">
              Intelligent capabilities
            </p>
            <h2 id="ai-capabilities-heading" className={cn("mt-2", SHOP_SECTION_TITLE)}>
              How AI improves your shopping experience
            </h2>
            <p className={cn("mt-2", SHOP_BODY)}>
              Start with natural-language search, then explore voice, visual discovery,
              and session-based recommendations.
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:mt-8 lg:grid-cols-4 lg:gap-5 xl:gap-6">
            {AI_SHOPPING_CAPABILITIES.map((capability, index) => (
              <AiShoppingFeatureCard
                key={capability.id}
                capability={capability}
                index={index}
              />
            ))}
          </div>
        </section>
      </div>

      <div className="mx-auto mt-10 w-full max-w-6xl lg:mt-12" style={PAGE_GUTTER}>
        {/* FAQ → CTA transition */}
        <div className="relative">
          <div
            className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-gradient-to-b from-transparent to-muted/30"
            aria-hidden
          />

          <section className="overflow-hidden rounded-xl border border-border/60 bg-gradient-to-b from-muted/30 to-muted/10">
            <div className="border-b border-border/60 px-5 py-4 sm:px-7 sm:py-5">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-lg bg-background text-brand-primary shadow-sm">
                  <HelpCircle className="size-4" aria-hidden />
                </span>
                <div>
                  <h2 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
                    Frequently asked questions
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    How AI shopping works in this store
                  </p>
                </div>
              </div>
            </div>
            <div className="px-5 py-2 sm:px-7 sm:py-3">
              <Accordion className="divide-y divide-border/60">
                {AI_SHOPPING_FAQ.map((item, index) => (
                  <AccordionItem
                    key={item.question}
                    value={`faq-${index}`}
                    className="border-0"
                  >
                    <AccordionTrigger className="py-4 text-left text-sm font-semibold hover:no-underline sm:text-base">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className={cn(SHOP_BODY, "pb-4")}>
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>

          <div className="relative mt-6 overflow-hidden rounded-xl border border-brand-primary/20 bg-gradient-to-br from-brand-primary/[0.06] via-background to-background px-6 py-8 text-center shadow-sm sm:px-10 sm:py-9">
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              aria-hidden
              style={{
                background:
                  "radial-gradient(ellipse 60% 80% at 50% 0%, rgba(98,84,243,0.12) 0%, transparent 60%)",
              }}
            />
            <div className="relative">
              <p className="text-xs font-semibold tracking-[0.12em] text-brand-primary uppercase">
                Get started
              </p>
              <h2 className="mt-2 text-lg font-bold tracking-tight text-foreground sm:text-xl">
                Ready to shop smarter?
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Open the assistant to search, compare, and checkout — or browse the
                catalog directly.
              </p>
              <div className="mt-5 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
                <Button
                  type="button"
                  onClick={requestOpenVapiAssistant}
                  className="h-11 gap-2 rounded-lg bg-brand-primary px-7 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary-hover"
                >
                  <Bot className="size-4" aria-hidden />
                  Start shopping with AI
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
