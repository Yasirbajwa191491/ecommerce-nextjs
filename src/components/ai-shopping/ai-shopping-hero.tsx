"use client";

import Link from "next/link";
import { m, useReducedMotion } from "framer-motion";
import { ArrowRight, Bot, Sparkles } from "lucide-react";
import { AiShoppingHeroVisual } from "@/components/ai-shopping/ai-shopping-hero-visual";
import { Button } from "@/components/ui/button";
import { AI_SHOPPING_JOURNEY } from "@/lib/ai-shopping-content";
import { fadeUp } from "@/lib/motion";
import { requestOpenVapiAssistant } from "@/lib/site";
import { cn } from "@/lib/utils";

export function AiShoppingHero() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-background via-background to-muted/30 px-5 py-8 sm:px-7 sm:py-9 lg:rounded-3xl lg:px-10 lg:py-10 xl:px-14 xl:py-11 2xl:px-16">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 85% 15%, rgba(98,84,243,0.07) 0%, transparent 55%), radial-gradient(ellipse 40% 35% at 10% 90%, rgba(10,20,53,0.04) 0%, transparent 50%)",
        }}
      />

      <div className="relative grid items-center gap-8 lg:grid-cols-2 lg:gap-12 xl:gap-16">
        <m.div
          initial={reduceMotion ? false : "hidden"}
          animate="visible"
          variants={fadeUp}
          className="max-w-xl xl:max-w-2xl"
        >
          <span className="inline-flex items-center gap-2 rounded-md border border-brand-primary/20 bg-brand-primary/[0.06] px-2.5 py-1 text-[0.6875rem] font-semibold tracking-[0.12em] text-brand-primary uppercase">
            <Sparkles className="size-3" aria-hidden />
            AI-Powered Shopping
          </span>

          <h1 className="mt-4 font-heading text-[clamp(1.75rem,4vw,2.75rem)] font-bold leading-[1.12] tracking-tight text-brand-navy">
            Everything you need.
            <span className="mt-0.5 block text-foreground/90">Smarter shopping.</span>
          </h1>

          <p className="mt-3 max-w-lg text-base leading-relaxed text-muted-foreground xl:max-w-xl">
            Discover products with AI-powered search, voice assistance, visual
            discovery, and personalized recommendations — built into every step of
            your shopping journey.
          </p>

          <p className="mt-2 text-sm font-medium text-foreground/80">
            AI helps customers discover, understand, compare, and purchase products.
          </p>

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <Button
              type="button"
              onClick={requestOpenVapiAssistant}
              className="h-11 gap-2 rounded-lg bg-brand-primary px-6 text-sm font-semibold text-white shadow-sm shadow-brand-primary/20 transition-all hover:bg-brand-primary-hover hover:shadow-md active:scale-[0.98]"
            >
              <Bot className="size-4" aria-hidden />
              Open AI Assistant
            </Button>
            <Button
              variant="outline"
              render={<Link href="/products" />}
              className="h-11 gap-2 rounded-lg border-border bg-background px-6 text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-brand-primary/30 hover:bg-muted/40"
            >
              Shop Now
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          </div>

          <ul className="mt-6 flex flex-wrap gap-x-1 gap-y-1.5 text-xs text-muted-foreground sm:text-sm">
            {AI_SHOPPING_JOURNEY.map((step, index) => (
              <li key={step} className="flex items-center gap-1">
                {index > 0 ? (
                  <span className="mx-1 text-border" aria-hidden>
                    →
                  </span>
                ) : null}
                <span className={cn(index === 0 && "font-medium text-brand-primary")}>
                  {step}
                </span>
              </li>
            ))}
          </ul>
        </m.div>

        <AiShoppingHeroVisual className="w-full lg:max-w-none lg:justify-self-stretch xl:max-w-2xl xl:justify-self-end 2xl:max-w-3xl" />
      </div>
    </section>
  );
}
