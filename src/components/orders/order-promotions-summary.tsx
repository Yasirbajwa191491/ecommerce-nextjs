import { formatCurrencyAmount } from "@/lib/currencies";

export type OrderPromotionSummary = {
  promotionName: string;
  promotionDescription?: string;
  freeQuantity: number;
  savingsAmount: number;
};

type OrderPromotionsSummaryProps = {
  promotions: OrderPromotionSummary[];
  currency: string;
  className?: string;
};

export function OrderPromotionsSummary({
  promotions,
  currency,
  className,
}: OrderPromotionsSummaryProps) {
  if (!promotions.length) return null;

  return (
    <div
      className={`space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 ${className ?? ""}`}
    >
      <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
        Promotions applied
      </p>
      {promotions.map((promo, index) => (
        <div key={`${promo.promotionName}-${index}`} className="text-sm">
          <span className="font-medium">{promo.promotionName}</span>
          <span className="text-muted-foreground">
            {" "}
            · {promo.freeQuantity} free · saved{" "}
            {formatCurrencyAmount(promo.savingsAmount, currency)}
          </span>
        </div>
      ))}
    </div>
  );
}
