import Link from "next/link";
import type { FunctionReturnType } from "convex/server";
import { api } from "@convex/_generated/api";

type StorefrontPromotion = FunctionReturnType<
  typeof api.productPromotions.listActiveForStorefront
>[number];

type PromotionsSeoSnapshotProps = {
  promotions: StorefrontPromotion[];
};

function formatDateRange(startAt: number, endAt: number) {
  const formatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
  return `${formatter.format(new Date(startAt))} – ${formatter.format(new Date(endAt))}`;
}

/**
 * Server-rendered promotion list for crawlers and no-JS clients.
 */
export function PromotionsSeoSnapshot({ promotions }: PromotionsSeoSnapshotProps) {
  if (promotions.length === 0) {
    return (
      <p className="sr-only">
        No active promotions at the moment. Browse products for current offers.
      </p>
    );
  }

  return (
    <section className="sr-only" aria-label="Active promotions">
      <ul>
        {promotions.map((promotion) => (
          <li key={promotion._id}>
            <Link href={`/product/${promotion.buyProductId}`}>
              {promotion.name}
              {promotion.buyProductName ? ` — ${promotion.buyProductName}` : ""}
              {promotion.endAt
                ? ` (${formatDateRange(promotion.startAt, promotion.endAt)})`
                : ""}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
