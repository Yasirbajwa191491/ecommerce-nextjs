"use client";

import type { CopilotInsightCard as CopilotInsightCardType } from "@/lib/ai-copilot-content";
import { CopilotInsightCard } from "./copilot-insight-card";

type CopilotInsightCardsProps = {
  cards: CopilotInsightCardType[];
};

type SectionConfig = {
  key: string;
  title: string;
  types: CopilotInsightCardType["type"][];
  titles?: string[];
};

const SECTIONS: SectionConfig[] = [
  {
    key: "revenue",
    title: "Revenue Forecast",
    types: ["forecast"],
    titles: ["Revenue Forecast", "Top Sellers Next Month"],
  },
  {
    key: "growth",
    title: "Growth Forecast",
    types: ["forecast"],
    titles: [
      "Growth Forecast",
      "Products Expected to Grow",
      "Products Expected to Decline",
    ],
  },
  {
    key: "inventory",
    title: "Inventory Forecast",
    types: ["inventory"],
  },
  {
    key: "risk",
    title: "Risk Alerts",
    types: ["risk"],
  },
  {
    key: "opportunity",
    title: "Opportunities",
    types: ["opportunity"],
    titles: ["Growth Opportunities"],
  },
  {
    key: "pricing",
    title: "Pricing Insights",
    types: ["pricing"],
  },
  {
    key: "other",
    title: "Business Insights",
    types: ["promotion", "sentiment", "marketing", "search"],
  },
];

function cardMatchesSection(
  card: CopilotInsightCardType,
  section: SectionConfig
): boolean {
  if (!section.types.includes(card.type)) return false;
  if (section.titles && section.titles.length > 0) {
    return section.titles.includes(card.title);
  }
  if (section.key === "revenue" && card.type === "forecast") {
    return card.title === "Revenue Forecast" || card.title === "Top Sellers Next Month";
  }
  if (section.key === "growth" && card.type === "forecast") {
    return (
      card.title === "Growth Forecast" ||
      card.title === "Products Expected to Grow" ||
      card.title === "Products Expected to Decline"
    );
  }
  return true;
}

export function CopilotInsightCards({ cards }: CopilotInsightCardsProps) {
  if (cards.length === 0) return null;

  const used = new Set<string>();
  const sections = SECTIONS.map((section) => {
    const sectionCards = cards.filter((card) => {
      const key = `${card.title}-${card.productId ?? card.subtitle ?? ""}`;
      if (used.has(key)) return false;
      if (!cardMatchesSection(card, section)) return false;
      used.add(key);
      return true;
    });
    return { ...section, cards: sectionCards };
  }).filter((section) => section.cards.length > 0);

  const remaining = cards.filter((card) => {
    const key = `${card.title}-${card.productId ?? card.subtitle ?? ""}`;
    return !used.has(key);
  });

  return (
    <div className="space-y-5">
      {sections.map((section) => (
        <section key={section.key}>
          <h4 className="mb-2 text-sm font-semibold text-foreground">
            {section.title}
          </h4>
          <div className="grid gap-3 lg:grid-cols-2">
            {section.cards.map((card, index) => (
              <CopilotInsightCard
                key={`${section.key}-${card.title}-${card.productId ?? index}`}
                card={card}
              />
            ))}
          </div>
        </section>
      ))}
      {remaining.length > 0 ? (
        <section>
          <h4 className="mb-2 text-sm font-semibold text-foreground">
            Additional Insights
          </h4>
          <div className="grid gap-3 lg:grid-cols-2">
            {remaining.map((card, index) => (
              <CopilotInsightCard
                key={`remaining-${card.title}-${card.productId ?? index}`}
                card={card}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
