"use client";

import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { formatCurrencyAmount } from "@/lib/currencies";
import {
  PricingHealthBadge,
  type PricingHealthStatus,
} from "@/components/admin/pricing-health-badge";
import { ConfidenceIndicator } from "@/components/admin/confidence-indicator";
import { ProductPricingHistoryPanel } from "@/components/admin/product-pricing-history-panel";
import { cn } from "@/lib/utils";

export type ProductPricingFormContext = {
  productId?: Id<"products">;
  name: string;
  company: string;
  categoryName: string;
  categoryId?: Id<"productCategories">;
  description: string;
  highlights: string[];
  price: number;
  currency: string;
  discountPercent: number;
  stock: number;
  stars?: number;
  reviews?: number;
};

type PricingResult = {
  recommendationId: Id<"aiPricingRecommendations">;
  currentPrice: number;
  suggestedPrice: number;
  minRecommendedPrice: number;
  maxRecommendedPrice: number;
  confidence: number;
  healthStatus: PricingHealthStatus;
  reasoning: string[];
  currency: string;
  similarProductPrices?: number[];
  cached?: boolean;
};

type ProductFormAiPricingSectionProps = {
  context: ProductPricingFormContext;
  onApplyPrice: (price: number) => void;
};

export function ProductFormAiPricingSection({
  context,
  onApplyPrice,
}: ProductFormAiPricingSectionProps) {
  const generatePricing = useAction(api.adminProductPricing.generateProductPricingAction);
  const applyPricing = useMutation(
    api.productPricingRecommendations.applyPricingRecommendation
  );

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PricingResult | null>(null);
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);
  const [applying, setApplying] = useState(false);

  const handleGenerate = async () => {
    if (!context.name.trim()) {
      toastError("Enter a product name before generating pricing recommendations.");
      return;
    }
    if (context.price < 0.01) {
      toastError("Enter a valid price before generating recommendations.");
      return;
    }

    setLoading(true);
    try {
      const response = await generatePricing({
        context: {
          productId: context.productId,
          name: context.name,
          company: context.company,
          categoryName: context.categoryName,
          categoryId: context.categoryId,
          description: context.description || undefined,
          highlights: context.highlights.filter(Boolean),
          price: context.price,
          currency: context.currency,
          discountPercent: context.discountPercent,
          stock: context.stock,
          stars: context.stars,
          reviews: context.reviews,
        },
      });
      setResult(response as PricingResult);
      if (response.cached) {
        toastSuccess("Loaded cached pricing recommendation.");
      }
    } catch (error) {
      toastError(
        error instanceof Error ? error.message : "Failed to generate pricing recommendation."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApplyConfirm = async () => {
    if (!result) return;

    setApplying(true);
    try {
      if (context.productId) {
        await applyPricing({
          productId: context.productId,
          suggestedPrice: result.suggestedPrice,
          recommendationId: result.recommendationId,
          confidence: result.confidence,
        });
      }
      onApplyPrice(result.suggestedPrice);
      toastSuccess("Suggested price applied.");
      setShowApplyConfirm(false);
    } catch (error) {
      toastError(
        error instanceof Error ? error.message : "Failed to apply suggested price."
      );
    } finally {
      setApplying(false);
    }
  };

  const priceDiff = result ? result.suggestedPrice - result.currentPrice : 0;
  const priceDiffPercent =
    result && result.currentPrice > 0
      ? Math.round((priceDiff / result.currentPrice) * 100)
      : 0;

  return (
    <>
      <Card className="border-primary/15 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" />
            AI Pricing Assistant
          </CardTitle>
          <CardDescription>
            Get AI-powered pricing recommendations based on sales, inventory, and
            reviews. Prices are never changed automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            variant="default"
            onClick={() => void handleGenerate()}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 size-4" />
            )}
            Generate Pricing Recommendation
          </Button>

          {result ? (
            <div className="space-y-4 rounded-lg border bg-background/80 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <PricingHealthBadge status={result.healthStatus} />
                {result.cached ? (
                  <span className="text-xs text-muted-foreground">Cached result</span>
                ) : null}
              </div>

              <ConfidenceIndicator confidence={result.confidence} />

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Current Price</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {formatCurrencyAmount(result.currentPrice, result.currency)}
                  </p>
                </div>
                <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
                  <p className="text-xs text-muted-foreground">Suggested Price</p>
                  <p className="text-lg font-semibold tabular-nums text-primary">
                    {formatCurrencyAmount(result.suggestedPrice, result.currency)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm">
                {priceDiff !== 0 ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 font-medium",
                      priceDiff > 0 ? "text-emerald-600" : "text-red-500"
                    )}
                  >
                    {priceDiff > 0 ? (
                      <TrendingUp className="size-3.5" />
                    ) : (
                      <TrendingDown className="size-3.5" />
                    )}
                    {formatCurrencyAmount(Math.abs(priceDiff), result.currency)} (
                    {priceDiff > 0 ? "+" : ""}
                    {priceDiffPercent}%)
                  </span>
                ) : (
                  <span className="text-muted-foreground">No price change suggested</span>
                )}
                <span className="text-muted-foreground">
                  Range: {formatCurrencyAmount(result.minRecommendedPrice, result.currency)}
                  {" – "}
                  {formatCurrencyAmount(result.maxRecommendedPrice, result.currency)}
                </span>
              </div>

              {result.similarProductPrices && result.similarProductPrices.length > 0 ? (
                <div className="text-sm">
                  <p className="mb-1 font-medium text-foreground">Similar Product Prices</p>
                  <p className="text-muted-foreground">
                    {result.similarProductPrices
                      .slice(0, 5)
                      .map((p) => formatCurrencyAmount(p, result.currency))
                      .join(" · ")}
                  </p>
                </div>
              ) : null}

              <div>
                <p className="mb-2 text-sm font-medium text-foreground">
                  Why AI suggests this price
                </p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {result.reasoning.map((reason) => (
                    <li key={reason} className="flex gap-2">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => setShowApplyConfirm(true)}
                disabled={result.suggestedPrice === context.price}
              >
                Apply Suggested Price
              </Button>
            </div>
          ) : null}

          {context.productId ? (
            <ProductPricingHistoryPanel productId={context.productId} />
          ) : null}
        </CardContent>
      </Card>

      <AlertDialog open={showApplyConfirm} onOpenChange={setShowApplyConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply suggested price?</AlertDialogTitle>
            <AlertDialogDescription>
              This will update only the product price from{" "}
              {formatCurrencyAmount(context.price, context.currency)} to{" "}
              {result
                ? formatCurrencyAmount(result.suggestedPrice, result.currency)
                : ""}
              . Discount and other fields will not change.
              {context.productId
                ? " The change will be saved immediately."
                : " Save the product to persist this price."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={applying}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleApplyConfirm();
              }}
              disabled={applying}
            >
              {applying ? "Applying…" : "Apply price"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
