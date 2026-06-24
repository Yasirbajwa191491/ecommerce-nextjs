"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { m, useReducedMotion } from "framer-motion";
import { Minus, Plus, ShoppingBag, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { useCartContext } from "@/context/cart_context";
import { useActivePromotionsForProduct } from "@/hooks/use-storefront-promotions";
import type { ActiveProductPromotions } from "@/hooks/use-storefront-promotions";
import { useStableNow } from "@/hooks/use-stable-now";
import { getPromotionDisplay } from "@/lib/promotion-display";
import { resolveProductColorOrDefault } from "@/lib/cart-lines";
import { PromotionOfferBanner } from "@/components/promotions/promotion-offer-banner";
import { Product } from "@/types/product";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SHOP_BODY_SM, SHOP_META_LABEL } from "@/lib/typography";
import { cn } from "@/lib/utils";

type AddToCartProps = {
  product: Product;
  variant?: "default" | "detail";
  /** Preloaded promotions — avoids duplicate query and tab-focus flash on PDP. */
  promotions?: ActiveProductPromotions;
  hidePromotionBanner?: boolean;
};

export default function AddToCart({
  product,
  variant = "default",
  promotions: promotionsProp,
  hidePromotionBanner = false,
}: AddToCartProps) {
  const router = useRouter();
  const { addToCart, total_item } = useCartContext();
  const [amount, setAmount] = useState(1);
  const [color, setColor] = useState(() =>
    resolveProductColorOrDefault(product.colors, product.colors[0] ?? "#000000")
  );
  const isDetail = variant === "detail";
  const reduceMotion = useReducedMotion();
  const hasColors = product.colors.length > 0;
  const now = useStableNow();
  const queriedPromotions = useActivePromotionsForProduct(
    promotionsProp === undefined ? product._id : null
  );
  const activePromotions = promotionsProp ?? queriedPromotions;

  const handleAdd = () => {
    addToCart(product._id, color, amount, product);
    const promo = activePromotions?.[0];
    if (promo) {
      const { subtitle } = getPromotionDisplay(promo);
      toast.success("Added to cart — promotion applies!", {
        description: subtitle,
      });
    } else {
      toast.success("Added to cart", {
        description: `${amount}× ${product.name}`,
      });
    }
  };

  const quantityControl = (
    <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
      <Label className={SHOP_META_LABEL}>Quantity</Label>
      <div className="inline-flex items-center rounded-full border border-border/80 bg-background">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setAmount((a) => Math.max(1, a - 1))}
          aria-label="Decrease quantity"
          className={cn("rounded-full", isDetail && "size-8 sm:size-9")}
        >
          <Minus className="size-4" />
        </Button>
        <span
          className={cn(
            "min-w-8 text-center font-semibold tabular-nums sm:min-w-10",
            isDetail ? "text-base sm:text-lg" : "text-base"
          )}
        >
          {amount}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setAmount((a) => Math.min(product.stock, a + 1))}
          aria-label="Increase quantity"
          className={cn("rounded-full", isDetail && "size-8 sm:size-9")}
        >
          <Plus className="size-4" />
        </Button>
      </div>
      <span className={SHOP_BODY_SM}>
        {product.stock} available
      </span>
    </div>
  );

  const addToCartButton = (
    <m.div whileTap={reduceMotion ? undefined : { scale: 0.97 }}>
      <Button
        type="button"
        size={isDetail ? "default" : "lg"}
        onClick={handleAdd}
        className={cn(
          "gap-2 rounded-full font-semibold",
          isDetail
            ? "h-11 bg-[#6254f3] px-6 text-base hover:bg-[#5548e0] sm:h-12 sm:px-8 lg:h-12 lg:px-8"
            : "h-11 px-6 text-base sm:h-12 sm:px-8"
        )}
      >
        <ShoppingBag className="size-4" />
        Add to cart
      </Button>
    </m.div>
  );

  const viewCartButton = isDetail ? (
    <Button
      type="button"
      variant="outline"
      onClick={() => router.push("/cart")}
      className="h-11 gap-2 rounded-full border-border/80 px-6 text-base font-semibold hover:border-[#6254f3]/40 hover:bg-[#6254f3]/5 hover:text-[#6254f3] sm:h-12 sm:px-8"
    >
      <ShoppingCart className="size-4" />
      View cart
      {total_item > 0 ? (
        <Badge className="pointer-events-none h-5 min-w-5 rounded-full bg-[#6254f3] px-1.5 text-sm font-bold text-white hover:bg-[#6254f3]">
          {total_item}
        </Badge>
      ) : null}
    </Button>
  ) : null;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:gap-4",
        isDetail
          ? "rounded-2xl border border-border/60 bg-card p-3 sm:p-4 lg:p-5"
          : "mt-6"
      )}
    >
      {activePromotions && activePromotions.length > 0 && !hidePromotionBanner ? (
        <PromotionOfferBanner
          promotion={activePromotions[0]!}
          variant="compact"
          now={now}
        />
      ) : null}

      {hasColors ? (
        <div>
          <Label className={cn(SHOP_META_LABEL, "mb-2 block")}>Color</Label>
          <div className="flex flex-wrap gap-2 sm:gap-2.5">
            {product.colors.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Color ${c}`}
                className={cn(
                  "rounded-full border-2 transition-shadow",
                  isDetail ? "size-8 sm:size-9" : "size-8",
                  color === c
                    ? "border-[#6254f3] ring-2 ring-[#6254f3]/30"
                    : "border-border"
                )}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {isDetail ? (
        <div className="flex flex-col gap-4">
          {quantityControl}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {addToCartButton}
            {viewCartButton}
          </div>
        </div>
      ) : (
        <>
          {quantityControl}
          {addToCartButton}
        </>
      )}
    </div>
  );
}
