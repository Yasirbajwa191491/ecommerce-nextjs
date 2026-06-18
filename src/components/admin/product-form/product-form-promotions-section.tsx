"use client";

import { useState } from "react";
import { useQuery } from "convex/react";import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";

type ProductFormPromotionsSectionProps = {
  productId?: Id<"products">;
};

export function ProductFormPromotionsSection({
  productId,
}: ProductFormPromotionsSectionProps) {
  const [now] = useState(() => Date.now());
  const promotions = useQuery(
    api.productPromotions.listForProduct,
    productId ? { productId, now } : "skip"
  );

  if (!productId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Promotions</CardTitle>
          <CardDescription>
            Save the product first, then create buy-one-get-one, free gift, or cross-product
            promotions linked to this item.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Promotions</CardTitle>
          <CardDescription>
            Promotions where this product is the buy or free item.
          </CardDescription>
        </div>
        <ButtonLink
          type="button"
          variant="outline"
          size="sm"
          href={`/admin/promotions/new?buyProductId=${productId}`}
        >
          <Plus className="mr-1 size-4" />
          Create promotion
        </ButtonLink>
      </CardHeader>
      <CardContent>
        {promotions === undefined ? (
          <Skeleton className="h-16 w-full" />
        ) : promotions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No promotions linked to this product yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {promotions.map((promo) => (
              <li
                key={promo._id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="font-medium">{promo.name}</p>
                  <p className="text-xs text-muted-foreground">{promo.typeLabel}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={promo.isActive ? "default" : "secondary"}>
                    {promo.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <ButtonLink
                    type="button"
                    variant="ghost"
                    size="sm"
                    href={`/admin/promotions/${promo._id}/edit`}
                  >
                    Edit
                  </ButtonLink>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
