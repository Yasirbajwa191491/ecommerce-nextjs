"use client";

import { m, useReducedMotion } from "framer-motion";
import {
  Bot,
  MessageSquare,
  Search,
  Sparkles,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

const RESULT_ROWS = [
  { name: "ErgoFlex Chair", price: "$189", rating: 4.8 },
  { name: "Lumbar Pro Seat", price: "$164", rating: 4.6 },
] as const;

/** Lightweight CSS-only hero visual — product-contextual, no external images. */
export function AiShoppingHeroVisual({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  const floatProps = reduceMotion
    ? {}
    : {
        animate: { y: [0, -4, 0] },
        transition: { duration: 5, repeat: Infinity, ease: "easeInOut" as const },
      };

  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-md lg:max-w-none lg:min-h-[280px] xl:min-h-[300px]",
        className
      )}
      aria-hidden
    >
      <m.div
        {...floatProps}
        className="relative rounded-xl border border-border/80 bg-card shadow-lg shadow-black/[0.04]"
      >
        {/* Assistant header */}
        <div className="flex items-center gap-2.5 border-b border-border/60 px-4 py-3">
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
            <Bot className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground">Shopping Assistant</p>
            <p className="text-[0.65rem] text-muted-foreground">Semantic search · Ready</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-md bg-brand-primary/10 px-2 py-0.5 text-[0.6rem] font-semibold text-brand-primary">
            <Search className="size-2.5" />
            AI Search
          </span>
        </div>

        <div className="space-y-2.5 p-4">
          {/* User query */}
          <div className="max-w-[90%] rounded-lg rounded-tl-sm bg-muted/60 px-3 py-2 text-[0.7rem] leading-relaxed text-muted-foreground">
            Desk chair under $200 with good reviews
          </div>

          {/* AI response with product rows */}
          <div className="ml-2 rounded-lg border border-brand-primary/15 bg-brand-primary/[0.04] p-3">
            <p className="text-[0.7rem] font-medium text-foreground">
              8 matches found — top picks for your budget:
            </p>
            <ul className="mt-2.5 space-y-2">
              {RESULT_ROWS.map((row) => (
                <li
                  key={row.name}
                  className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-background px-2.5 py-2"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-[0.55rem] font-bold text-muted-foreground">
                    CH
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.7rem] font-semibold text-foreground">
                      {row.name}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <div className="flex items-center gap-px">
                        <Star className="size-2.5 fill-amber-400 text-amber-400" />
                        <span className="text-[0.6rem] tabular-nums text-muted-foreground">
                          {row.rating}
                        </span>
                      </div>
                      <span className="text-[0.65rem] font-bold tabular-nums text-brand-primary">
                        {row.price}
                      </span>
                    </div>
                  </div>
                  <Sparkles className="size-3 shrink-0 text-brand-primary/70" />
                </li>
              ))}
            </ul>
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2">
            <MessageSquare className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="text-[0.65rem] text-muted-foreground">Refine search or compare…</span>
          </div>
        </div>
      </m.div>

      <div
        className="pointer-events-none absolute -inset-4 -z-10 rounded-3xl opacity-50"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(98,84,243,0.06) 0%, transparent 70%)",
        }}
      />
    </div>
  );
}
