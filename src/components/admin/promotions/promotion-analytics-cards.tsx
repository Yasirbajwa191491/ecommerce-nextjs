import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrencyAmount } from "@/lib/currencies";

type PromotionAnalyticsCardsProps = {
  viewCount: number;
  clickCount: number;
  conversionCount: number;
  ordersCount: number;
  revenueGenerated: number;
  freeProductsGiven: number;
  currency?: string;
};

export function PromotionAnalyticsCards({
  viewCount,
  clickCount,
  conversionCount,
  ordersCount,
  revenueGenerated,
  freeProductsGiven,
  currency = "USD",
}: PromotionAnalyticsCardsProps) {
  const cards = [
    { label: "Views", value: viewCount },
    { label: "Clicks", value: clickCount },
    { label: "Conversions", value: conversionCount },
    { label: "Orders", value: ordersCount },
    {
      label: "Revenue",
      value: formatCurrencyAmount(revenueGenerated, currency),
    },
    { label: "Free items given", value: freeProductsGiven },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
