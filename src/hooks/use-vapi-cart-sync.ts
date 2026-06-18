"use client";

import { useCallback } from "react";
import { useConvex } from "convex/react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useCartContext } from "@/context/cart_context";
import { buildCartLineId } from "@/lib/cart-lines";
import { parseToolResultPayload } from "@/lib/vapi-activity";
import type { Product } from "@/types/product";

type CartLineSync = {
  productId: Id<"products">;
  color: string;
  quantity: number;
};

function isProductId(value: unknown): value is Id<"products"> {
  return typeof value === "string" && value.length > 0;
}

export function useVapiCartSync() {
  const convex = useConvex();
  const { addToCart, removeItem, clearCart } = useCartContext();

  const syncLines = useCallback(
    async (lines: CartLineSync[]) => {
      if (!lines.length) return;

      const ids = lines
        .map((line) => line.productId)
        .filter(isProductId);

      if (!ids.length) return;

      const products = await convex.query(api.products.listByIds, { ids });
      const productById = new Map<string, Product>(
        products.map((product) => [product._id, product as Product])
      );

      for (const line of lines) {
        const product = productById.get(line.productId);
        if (!product) continue;
        addToCart(line.productId, line.color, line.quantity, product);
      }
    },
    [addToCart, convex]
  );

  const syncToolResult = useCallback(
    async (
      toolName: string,
      parameters: Record<string, unknown>,
      result: unknown
    ) => {
      const payload = parseToolResultPayload(result);
      if (!payload || typeof payload.error === "string") return;

      switch (toolName) {
        case "addToCart": {
          if (Array.isArray(payload.addedItems) && payload.addedItems.length > 0) {
            const lines = payload.addedItems
              .map((item) => {
                if (typeof item !== "object" || item === null) return null;
                const record = item as Record<string, unknown>;
                if (
                  !isProductId(record.productId) ||
                  typeof record.color !== "string"
                ) {
                  return null;
                }
                return {
                  productId: record.productId,
                  color: record.color,
                  quantity:
                    typeof record.quantity === "number" ? record.quantity : 1,
                };
              })
              .filter((line): line is CartLineSync => line !== null);

            await syncLines(lines);
            toast.success(
              `Added ${lines.length} item${lines.length === 1 ? "" : "s"} to your cart`
            );
            break;
          }

          const productId = payload.productId ?? parameters.productId;
          const color = payload.color ?? parameters.color;
          const quantity = payload.quantity ?? parameters.quantity ?? 1;
          if (!isProductId(productId) || typeof color !== "string") return;

          await syncLines([
            {
              productId,
              color,
              quantity: typeof quantity === "number" ? quantity : 1,
            },
          ]);

          if (typeof payload.productName === "string") {
            if (
              typeof payload.promotionHint === "string" &&
              payload.promotionHint.length > 0
            ) {
              toast.success(`Added ${payload.productName} to your cart`, {
                description: payload.promotionHint,
                duration: 8000,
              });
            } else {
              toast.success(`Added ${payload.productName} to your cart`);
            }
          }
          break;
        }
        case "addMultipleToCart": {
          const addedItems = payload.addedItems;
          if (Array.isArray(addedItems) && addedItems.length > 0) {
            const lines = addedItems
              .map((item) => {
                if (typeof item !== "object" || item === null) return null;
                const record = item as Record<string, unknown>;
                if (
                  !isProductId(record.productId) ||
                  typeof record.color !== "string"
                ) {
                  return null;
                }
                return {
                  productId: record.productId,
                  color: record.color,
                  quantity:
                    typeof record.quantity === "number" ? record.quantity : 1,
                };
              })
              .filter((line): line is CartLineSync => line !== null);

            await syncLines(lines);
            toast.success(
              `Added ${lines.length} item${lines.length === 1 ? "" : "s"} to your cart`
            );
            break;
          }

          if (Array.isArray(parameters.productIds)) {
            const ids = parameters.productIds.filter(isProductId);
            if (!ids.length) break;

            const products = await convex.query(api.products.listByIds, { ids });
            for (const product of products) {
              const color = product.colors[0] ?? "default";
              addToCart(product._id, color, 1, product as Product);
            }
            if (products.length) {
              toast.success(
                `Added ${products.length} item${products.length === 1 ? "" : "s"} to your cart`
              );
            }
          }
          break;
        }
        case "removeFromCart": {
          if (payload.clearedAll === true) {
            clearCart();
            toast.success("Cart cleared");
            break;
          }

          const productId = payload.removedProductId ?? parameters.productId;
          const color = payload.removedColor ?? parameters.color;
          if (!isProductId(productId)) break;

          const cartLineId =
            typeof color === "string"
              ? buildCartLineId(productId, color)
              : undefined;
          if (cartLineId) {
            removeItem(cartLineId);
            toast.success("Item removed from cart");
          }
          break;
        }
        case "createCashOrder":
        case "createCheckoutSession": {
          clearCart();
          if (typeof payload.orderNumber === "string") {
            toast.success(`Order ${payload.orderNumber} started`);
          }
          break;
        }
        default:
          break;
      }
    },
    [clearCart, removeItem, syncLines]
  );

  return { syncToolResult };
}
