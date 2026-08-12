"use client";

import Link from "next/link";
import { m, useReducedMotion } from "framer-motion";
import { ArrowRight, Bot } from "lucide-react";
import { AiShoppingFeatureCard } from "@/components/ai-shopping/ai-shopping-feature-card";
import { Button } from "@/components/ui/button";
import { ShopSection } from "@/components/shop/shop-section";
import { AI_SHOPPING_CAPABILITIES } from "@/lib/ai-shopping-content";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { requestOpenVapiAssistant } from "@/lib/site";

export function AiShoppingSection() {
  const reduceMotion = useReducedMotion();

  return (
    <ShopSection
      id="ai-shopping"
      badge="Powered by AI"
      title="Shop Smarter with AI"
      description="Search naturally, shop by voice, discover similar products, and get session-based recommendations — all built into your shopping experience."
      action={{ href: "/ai-shopping", label: "Explore AI Shopping" }}
      bordered
    >
      <m.div
        className="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4 lg:gap-6"
        initial={reduceMotion ? false : "hidden"}
        whileInView={reduceMotion ? undefined : "visible"}
        viewport={{ once: true, margin: "-40px" }}
        variants={staggerContainer(0.08, 0.05)}
      >
        {AI_SHOPPING_CAPABILITIES.map((capability, index) => (
          <m.div key={capability.id} variants={staggerItem} className="h-full">
            <AiShoppingFeatureCard capability={capability} index={index} />
          </m.div>
        ))}
      </m.div>

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Button
          type="button"
          onClick={requestOpenVapiAssistant}
          className="h-11 gap-2 rounded-lg bg-brand-primary px-6 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary-hover sm:h-12 sm:text-base"
        >
          <Bot className="size-4" />
          Open AI Assistant
        </Button>
        <Button
          variant="outline"
          render={<Link href="/ai-shopping" />}
          className="h-11 gap-2 rounded-lg border-border px-6 text-sm font-semibold text-foreground hover:border-brand-primary/30 hover:bg-muted/40 sm:h-12 sm:text-base"
        >
          Learn more
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </ShopSection>
  );
}
