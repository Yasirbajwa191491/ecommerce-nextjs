"use client";

import Link from "next/link";
import { m, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Camera,
  Mic,
  Search,
  Sparkles,
} from "lucide-react";
import type { AiCapability } from "@/lib/ai-shopping-content";
import { Button } from "@/components/ui/button";
import { fadeUp } from "@/lib/motion";
import { requestOpenVapiAssistant } from "@/lib/site";
import { cn } from "@/lib/utils";

function CapabilityMiniVisual({ id }: { id: AiCapability["id"] }) {
  switch (id) {
    case "search":
      return (
        <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
          <div className="flex items-center gap-2 rounded-md border border-border/60 bg-background px-2.5 py-1.5">
            <Search className="size-3.5 shrink-0 text-brand-primary" />
            <span className="truncate text-[0.65rem] text-muted-foreground">
              office chair under $200…
            </span>
          </div>
          <div className="mt-2 flex gap-1.5">
            {["Match 1", "Match 2"].map((label) => (
              <span
                key={label}
                className="rounded bg-brand-primary/10 px-1.5 py-0.5 text-[0.6rem] font-medium text-brand-primary"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      );
    case "voice":
      return (
        <div className="flex items-center justify-center gap-1 rounded-lg border border-border/60 bg-muted/30 px-3 py-4">
          {[0.35, 0.7, 1, 0.55, 0.85, 0.45].map((h, i) => (
            <span
              key={i}
              className="w-1 rounded-full bg-brand-primary/50"
              style={{ height: `${h * 1.25}rem` }}
            />
          ))}
        </div>
      );
    case "visual":
      return (
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 p-2.5">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-background">
            <Camera className="size-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="h-1.5 w-full rounded-full bg-muted" />
            <div className="h-1.5 w-4/5 rounded-full bg-muted" />
            <span className="text-[0.6rem] font-medium text-brand-primary">
              Similar items →
            </span>
          </div>
        </div>
      );
    case "recommendations":
      return (
        <div className="grid grid-cols-3 gap-1.5 rounded-lg border border-border/60 bg-muted/30 p-2.5">
          {["A", "B", "C"].map((label) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1 rounded-md border border-border/50 bg-background p-1.5"
            >
              <div className="size-7 rounded bg-muted text-[0.5rem] font-bold leading-7 text-muted-foreground">
                {label}
              </div>
              <Sparkles className="size-2.5 text-brand-primary/60" />
            </div>
          ))}
        </div>
      );
    default:
      return null;
  }
}

type AiShoppingFeatureCardProps = {
  capability: AiCapability;
  index?: number;
};

export function AiShoppingFeatureCard({
  capability,
  index = 0,
}: AiShoppingFeatureCardProps) {
  const reduceMotion = useReducedMotion();
  const Icon = capability.icon;
  const isFeatured = capability.featured === true;

  const actionButton =
    capability.action?.type === "link" ? (
      <Button
        variant="ghost"
        size="sm"
        render={<Link href={capability.action.href} />}
        className="h-8 gap-1 px-0 text-xs font-semibold text-brand-primary hover:bg-transparent hover:text-brand-primary-hover"
      >
        {capability.action.label}
        <ArrowRight className="size-3" />
      </Button>
    ) : capability.action?.type === "assistant" ? (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={requestOpenVapiAssistant}
        className="h-8 gap-1 px-0 text-xs font-semibold text-brand-primary hover:bg-transparent hover:text-brand-primary-hover"
      >
        {capability.action.label}
        <Mic className="size-3" />
      </Button>
    ) : null;

  return (
    <m.article
      id={capability.anchor}
      initial={reduceMotion ? false : "hidden"}
      whileInView={reduceMotion ? undefined : "visible"}
      viewport={{ once: true, margin: "-24px" }}
      variants={fadeUp}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "group relative flex h-full flex-col rounded-xl border bg-card p-4 shadow-sm transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-md sm:p-5",
        isFeatured
          ? "border-brand-primary/30 ring-1 ring-brand-primary/10 hover:border-brand-primary/40"
          : "border-border/70 hover:border-brand-primary/20"
      )}
    >
      {isFeatured ? (
        <span className="absolute -top-2.5 left-4 rounded-md bg-brand-primary px-2 py-0.5 text-[0.625rem] font-bold tracking-wide text-white uppercase">
          Core capability
        </span>
      ) : null}

      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "flex items-center justify-center rounded-lg border border-brand-primary/15 bg-brand-primary/[0.06] text-brand-primary transition-all duration-300 group-hover:bg-brand-primary group-hover:text-white",
            isFeatured ? "size-12" : "size-10"
          )}
        >
          <Icon className={cn(isFeatured ? "size-5" : "size-4")} aria-hidden />
        </span>
        <span className="rounded-md bg-muted px-2 py-0.5 text-[0.625rem] font-bold tracking-wide text-muted-foreground uppercase">
          {capability.badge}
        </span>
      </div>

      <CapabilityMiniVisual id={capability.id} />

      <h2
        className={cn(
          "mt-4 font-semibold tracking-tight text-foreground",
          isFeatured ? "text-lg" : "text-base"
        )}
      >
        {capability.title}
      </h2>

      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
        {capability.description}
      </p>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
        <p className="min-w-0 truncate text-xs italic text-muted-foreground">
          {capability.example}
        </p>
        {actionButton}
      </div>
    </m.article>
  );
}
