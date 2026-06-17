"use client";

import { usePaginatedQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, History } from "lucide-react";
import { formatCurrencyAmount } from "@/lib/currencies";
import { PricingHealthBadge, type PricingHealthStatus } from "@/components/admin/pricing-health-badge";

type ProductPricingHistoryPanelProps = {
  productId: Id<"products">;
};

function statusBadge(status: "pending" | "applied" | "dismissed") {
  if (status === "applied") {
    return <Badge variant="secondary" className="text-[10px]">Applied</Badge>;
  }
  if (status === "dismissed") {
    return <Badge variant="outline" className="text-[10px]">Dismissed</Badge>;
  }
  return <Badge variant="outline" className="text-[10px]">Pending</Badge>;
}

export function ProductPricingHistoryPanel({
  productId,
}: ProductPricingHistoryPanelProps) {
  const { results, status } = usePaginatedQuery(
    api.productPricingRecommendations.listByProduct,
    { productId },
    { initialNumItems: 5 }
  );

  if (status === "LoadingFirstPage") {
    return (
      <p className="text-xs text-muted-foreground">Loading recommendation history…</p>
    );
  }

  if (!results || results.length === 0) {
    return null;
  }

  return (
    <Collapsible>
      <CollapsibleTrigger
        className="flex h-auto w-full items-center justify-between rounded-md py-1 text-sm font-medium hover:bg-muted/50"
      >
        <span className="inline-flex items-center gap-1.5">
          <History className="size-3.5" />
          Past recommendations ({results.length})
        </span>
        <ChevronDown className="size-4" />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        <ul className="space-y-2">
          {results.map((item) => (
            <li
              key={item._id}
              className="rounded-md border bg-muted/30 px-3 py-2 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
                <div className="flex items-center gap-1.5">
                  {statusBadge(item.status)}
                  <PricingHealthBadge
                    status={item.healthStatus as PricingHealthStatus}
                    className="text-[10px]"
                  />
                </div>
              </div>
              <p className="mt-1 tabular-nums">
                {formatCurrencyAmount(item.currentPrice, item.currency)}
                {" → "}
                <span className="font-medium">
                  {formatCurrencyAmount(item.suggestedPrice, item.currency)}
                </span>
                <span className="ml-2 text-xs text-muted-foreground">
                  ({item.confidence}% confidence)
                </span>
              </p>
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
