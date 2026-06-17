"use client";

import type { CopilotInsightCard as CopilotInsightCardType } from "@/lib/ai-copilot-content";
import { CopilotInsightCard } from "./copilot-insight-card";

type CopilotInsightCardsProps = {
  cards: CopilotInsightCardType[];
};

export function CopilotInsightCards({ cards }: CopilotInsightCardsProps) {
  if (cards.length === 0) return null;

  return (
    <section>
      <h4 className="mb-2 text-sm font-semibold text-foreground">Business Insights</h4>
      <div className="grid gap-3 lg:grid-cols-2">
        {cards.map((card, index) => (
          <CopilotInsightCard key={`${card.title}-${card.productId ?? index}`} card={card} />
        ))}
      </div>
    </section>
  );
}
