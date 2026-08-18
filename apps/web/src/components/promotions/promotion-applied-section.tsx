"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FormatPrice from "@/helpers/FormatPrice";
import { Gift } from "lucide-react";

type PromotionGiftItem = {
  productName: string;
  color: string;
  quantity: number;
  imageUrl: string;
  promotionName?: string;
  isPromotionGift?: boolean;
};

type PromotionAppliedSectionProps = {
  gifts: PromotionGiftItem[];
  summaries?: Array<{
    promotionName: string;
    freeQuantity: number;
    savingsAmount: number;
  }>;
  promotionSavingsTotal?: number;
  currency?: string;
};

export function PromotionAppliedSection({
  gifts,
  summaries = [],
  promotionSavingsTotal = 0,
  currency,
}: PromotionAppliedSectionProps) {
  if (gifts.length === 0 && summaries.length === 0) return null;

  return (
    <Card className="border-emerald-500/30 bg-emerald-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-emerald-700 dark:text-emerald-400">
          <Gift className="size-4" />
          Promotion applied
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {summaries.map((summary) => (
          <div
            key={summary.promotionName}
            className="rounded-lg border border-emerald-500/20 bg-background/80 px-3 py-2 text-sm"
          >
            <p className="font-medium">{summary.promotionName}</p>
            <p className="text-muted-foreground">
              {summary.freeQuantity} free item
              {summary.freeQuantity !== 1 ? "s" : ""} · You save{" "}
              <FormatPrice price={summary.savingsAmount} currency={currency} />
            </p>
          </div>
        ))}
        {gifts.map((gift, index) => (
          <div
            key={`${gift.productName}-${index}`}
            className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2"
          >
            <div className="relative size-12 shrink-0 overflow-hidden rounded-md border">
              {gift.imageUrl ? (
                <Image
                  src={gift.imageUrl}
                  alt={gift.productName}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{gift.productName}</p>
              <p className="text-xs text-muted-foreground">
                {gift.color} · Qty {gift.quantity}
              </p>
            </div>
            <Badge className="bg-emerald-600 hover:bg-emerald-600">FREE</Badge>
          </div>
        ))}
        {promotionSavingsTotal > 0 ? (
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            Total promotion savings:{" "}
            <FormatPrice price={promotionSavingsTotal} currency={currency} />
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
