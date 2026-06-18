import {
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { internal } from "../_generated/api";
import { ConvexError, v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { enrichProduct } from "../lib/products";
import { priceCheckoutCart } from "../lib/checkoutPricing";
import { mergeCartLines, quantityByProduct, resolveProductColor } from "../lib/cartLines";
import {
  formatAddToCartPromotionHint,
  formatAppliedPromotionSummary,
} from "../lib/promotions/offerCopy";
import { appliedPromotionSummaryValidator } from "../lib/promotions/types";
import {
  loadProductPromotionSummaries,
  vapiPromotionSummaryValidator,
} from "./promotionTools";
import {
  cartLineValidator,
  customerInfoValidator,
  validateCartLines,
  validateCustomerFields,
} from "../lib/checkoutValidation";
import { toVapiProductSummary } from "./dtos";
import { incrementDailyAnalytics } from "./analyticsHelpers";

const voiceCartItemValidator = v.object({
  productId: v.id("products"),
  color: v.string(),
  quantity: v.number(),
  name: v.string(),
  finalPrice: v.number(),
  lineTotal: v.number(),
});

const voiceCartGiftItemValidator = v.object({
  productId: v.id("products"),
  color: v.string(),
  quantity: v.number(),
  name: v.string(),
  promotionName: v.string(),
});

type CartLine = {
  productId: Id<"products">;
  color: string;
  quantity: number;
};

async function getCartDoc(
  ctx: QueryCtx | MutationCtx,
  conversationId: Id<"vapiConversations">
) {
  return await ctx.db
    .query("vapiVoiceCarts")
    .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
    .unique();
}

async function getOrCreateCartDoc(
  ctx: MutationCtx,
  conversationId: Id<"vapiConversations">
) {
  const existing = await getCartDoc(ctx, conversationId);

  if (existing) return existing;

  const cartId = await ctx.db.insert("vapiVoiceCarts", {
    conversationId,
    items: [],
    updatedAt: Date.now(),
  });

  const cart = await ctx.db.get(cartId);
  if (!cart) throw new ConvexError("Failed to create voice cart");
  return cart;
}

async function resolveDefaultColor(
  ctx: MutationCtx,
  productId: Id<"products">,
  color?: string
): Promise<string> {
  const product = await ctx.db.get(productId);
  if (!product) throw new ConvexError("Product not found");

  const trimmed = color?.trim();
  if (trimmed) {
    const match = resolveProductColor(product.colors, trimmed);
    if (!match) {
      throw new ConvexError(
        `Color "${trimmed}" is not available. Available colors: ${product.colors.join(", ")}`
      );
    }
    return match;
  }

  if (product.colors.length === 0) {
    throw new ConvexError("This product has no color options configured.");
  }

  return product.colors[0]!;
}

async function clearCartItems(
  ctx: MutationCtx,
  conversationId: Id<"vapiConversations">
) {
  const cart = await getCartDoc(ctx, conversationId);
  if (cart) {
    await ctx.db.patch(cart._id, { items: [], updatedAt: Date.now() });
  }
}

async function buildPromotionFeedbackForCart(
  ctx: MutationCtx,
  productId: Id<"products">,
  productName: string,
  cartItems: CartLine[]
) {
  const now = Date.now();
  const promotions = await loadProductPromotionSummaries(ctx, productId, now);
  const buyPromotions = promotions.filter((p) => p.buyProductId === productId);

  if (buyPromotions.length === 0) {
    return {
      promotionHint: "",
      promotionApplied: false,
      promotions: promotions,
      appliedPromotions: [] as Array<{
        promotionId: Id<"productPromotions">;
        promotionType: "bogo" | "buy_x_get_y" | "free_gift" | "cross_product";
        promotionName: string;
        promotionDescription?: string;
        buyProductId: Id<"products">;
        getProductId?: Id<"products">;
        freeQuantity: number;
        savingsAmount: number;
      }>,
    };
  }

  const priced = await priceCheckoutCart(ctx, cartItems, now);
  const appliedForProduct = priced.promotionSummaries.filter(
    (p) => p.buyProductId === productId
  );
  const qtyMap = quantityByProduct(mergeCartLines(cartItems));
  const cartBuyQuantity = qtyMap.get(productId) ?? 0;
  const primary = buyPromotions[0]!;

  const promotionHint = formatAddToCartPromotionHint(
    {
      productName,
      offerLine: primary.offerLine,
      promotionName: primary.name,
      buyQuantity: primary.buyQuantity,
      getProductName: primary.getProductName,
      getQuantity: primary.getQuantity,
      endsLabel: primary.endsLabel,
      cartBuyQuantity,
    },
    {
      qualified: appliedForProduct.length > 0,
      freeQuantity: appliedForProduct[0]?.freeQuantity,
      savingsAmount: appliedForProduct[0]?.savingsAmount,
      currency: priced.currency,
    }
  );

  return {
    promotionHint,
    promotionApplied: appliedForProduct.length > 0,
    promotions,
    appliedPromotions: appliedForProduct,
  };
}

export const addToCart = internalMutation({
  args: {
    conversationId: v.id("vapiConversations"),
    productId: v.id("products"),
    color: v.optional(v.string()),
    quantity: v.optional(v.number()),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    cartItemCount: v.number(),
    productName: v.string(),
    productId: v.id("products"),
    color: v.string(),
    quantity: v.number(),
    promotionHint: v.string(),
    promotionApplied: v.boolean(),
    promotions: v.array(vapiPromotionSummaryValidator),
    appliedPromotions: v.array(appliedPromotionSummaryValidator),
  }),
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product || !product.active) {
      throw new ConvexError("Product not found or unavailable");
    }
    if (product.stock <= 0) {
      throw new ConvexError(`${product.name} is out of stock`);
    }

    const quantity = args.quantity ?? 1;
    if (quantity < 1 || !Number.isInteger(quantity)) {
      throw new ConvexError("Quantity must be a positive whole number");
    }
    if (quantity > product.stock) {
      throw new ConvexError(
        `Only ${product.stock} units of ${product.name} are in stock`
      );
    }

    const resolvedColor = await resolveDefaultColor(
      ctx,
      args.productId,
      args.color
    );
    const cart = await getOrCreateCartDoc(ctx, args.conversationId);
    const items = [...cart.items];
    const existingIndex = items.findIndex(
      (line) =>
        line.productId === args.productId && line.color === resolvedColor
    );

    if (existingIndex >= 0) {
      const nextQty = items[existingIndex]!.quantity + quantity;
      if (nextQty > product.stock) {
        throw new ConvexError(
          `Cannot add ${quantity} more. Only ${product.stock} total available.`
        );
      }
      items[existingIndex] = {
        ...items[existingIndex]!,
        quantity: nextQty,
      };
    } else {
      items.push({
        productId: args.productId,
        color: resolvedColor,
        quantity,
      });
    }

    await ctx.db.patch(cart._id, { items, updatedAt: Date.now() });
    await incrementDailyAnalytics(ctx, "cartAdds");

    const cartItemCount = items.reduce((sum, line) => sum + line.quantity, 0);
    const lineQty =
      existingIndex >= 0
        ? items[existingIndex]!.quantity
        : quantity;
    const promotionFeedback = await buildPromotionFeedbackForCart(
      ctx,
      args.productId,
      product.name,
      items
    );

    const baseMessage = `Added ${quantity} ${product.name} (${resolvedColor}) to your cart. You now have ${lineQty} in your cart (${cartItemCount} item${cartItemCount === 1 ? "" : "s"} total).`;
    const message = promotionFeedback.promotionHint
      ? `${baseMessage}\n\n${promotionFeedback.promotionHint}`
      : baseMessage;

    return {
      success: true,
      message,
      cartItemCount,
      productName: product.name,
      productId: args.productId,
      color: resolvedColor,
      quantity,
      promotionHint: promotionFeedback.promotionHint,
      promotionApplied: promotionFeedback.promotionApplied,
      promotions: promotionFeedback.promotions,
      appliedPromotions: promotionFeedback.appliedPromotions,
    };
  },
});

const voiceCartLineSyncValidator = v.object({
  productId: v.id("products"),
  color: v.string(),
  quantity: v.number(),
  name: v.string(),
});

export const addMultipleToCart = internalMutation({
  args: {
    conversationId: v.id("vapiConversations"),
    productIds: v.array(v.id("products")),
  },
  returns: v.object({
    success: v.boolean(),
    added: v.array(v.string()),
    addedItems: v.array(voiceCartLineSyncValidator),
    cartItemCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const added: string[] = [];
    const addedItems: Array<{
      productId: Id<"products">;
      color: string;
      quantity: number;
      name: string;
    }> = [];
    for (const productId of args.productIds) {
      const product = await ctx.db.get(productId);
      if (!product || !product.active || product.stock <= 0) continue;

      const resolvedColor = await resolveDefaultColor(ctx, productId);
      const cart = await getOrCreateCartDoc(ctx, args.conversationId);
      const items = [...cart.items];
      const existingIndex = items.findIndex(
        (line) => line.productId === productId && line.color === resolvedColor
      );

      const addedQuantity = 1;
      if (existingIndex >= 0) {
        items[existingIndex] = {
          ...items[existingIndex]!,
          quantity: items[existingIndex]!.quantity + addedQuantity,
        };
      } else {
        items.push({
          productId,
          color: resolvedColor,
          quantity: addedQuantity,
        });
      }

      await ctx.db.patch(cart._id, { items, updatedAt: Date.now() });
      added.push(product.name);
      addedItems.push({
        productId,
        color: resolvedColor,
        quantity: addedQuantity,
        name: product.name,
      });
      await incrementDailyAnalytics(ctx, "cartAdds");
    }

    const cart = await getOrCreateCartDoc(ctx, args.conversationId);
    return {
      success: true,
      added,
      addedItems,
      cartItemCount: cart.items.reduce((sum, line) => sum + line.quantity, 0),
    };
  },
});

export const getCart = internalQuery({
  args: {
    conversationId: v.id("vapiConversations"),
    now: v.number(),
  },
  returns: v.object({
    items: v.array(voiceCartItemValidator),
    giftItems: v.array(voiceCartGiftItemValidator),
    itemCount: v.number(),
    subtotal: v.number(),
    discountTotal: v.number(),
    promotionSavingsTotal: v.number(),
    total: v.number(),
    currency: v.string(),
    isEmpty: v.boolean(),
    promotions: v.array(appliedPromotionSummaryValidator),
    promotionSummary: v.string(),
  }),
  handler: async (ctx, args) => {
    const cart = await getCartDoc(ctx, args.conversationId);

    if (!cart || cart.items.length === 0) {
      return {
        items: [],
        giftItems: [],
        itemCount: 0,
        subtotal: 0,
        discountTotal: 0,
        promotionSavingsTotal: 0,
        total: 0,
        currency: "USD",
        isEmpty: true,
        promotions: [],
        promotionSummary: "",
      };
    }

    try {
      validateCartLines(cart.items);
      const priced = await priceCheckoutCart(ctx, cart.items, args.now);
      const paidLines = priced.items.filter((line) => !line.isPromotionGift);
      const giftLines = priced.items.filter((line) => line.isPromotionGift);

      const items = paidLines.map((line) => ({
        productId: line.productId,
        color: line.color,
        quantity: line.quantity,
        name: line.productName,
        finalPrice: line.finalUnitPrice,
        lineTotal: line.lineTotal,
      }));

      const giftItems = giftLines.map((line) => ({
        productId: line.productId,
        color: line.color,
        quantity: line.quantity,
        name: line.productName,
        promotionName: line.promotionName ?? "Promotion",
      }));

      const promotionSummary = formatAppliedPromotionSummary(
        priced.promotionSummaries,
        priced.currency
      );

      return {
        items,
        giftItems,
        itemCount: items.reduce((sum, line) => sum + line.quantity, 0),
        subtotal: priced.subtotal,
        discountTotal: priced.discountTotal,
        promotionSavingsTotal: priced.promotionSavingsTotal,
        total: priced.total,
        currency: priced.currency,
        isEmpty: false,
        promotions: priced.promotionSummaries,
        promotionSummary,
      };
    } catch (error) {
      throw new ConvexError(
        error instanceof Error ? error.message : "Unable to price cart"
      );
    }
  },
});

export const removeFromCart = internalMutation({
  args: {
    conversationId: v.id("vapiConversations"),
    productId: v.optional(v.id("products")),
    color: v.optional(v.string()),
    clearAll: v.optional(v.boolean()),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    cartItemCount: v.number(),
    clearedAll: v.boolean(),
    removedProductId: v.optional(v.id("products")),
    removedColor: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const cart = await getCartDoc(ctx, args.conversationId);

    if (!cart) {
      return {
        success: true,
        message: "Your cart is already empty.",
        cartItemCount: 0,
        clearedAll: false,
      };
    }

    if (args.clearAll) {
      await ctx.db.patch(cart._id, { items: [], updatedAt: Date.now() });
      return {
        success: true,
        message: "Cart cleared.",
        cartItemCount: 0,
        clearedAll: true,
      };
    }

    if (!args.productId) {
      throw new ConvexError("Provide productId or set clearAll to true.");
    }

    const removedLine = cart.items.find((line) => {
      if (line.productId !== args.productId) return false;
      if (args.color && line.color.toLowerCase() !== args.color.toLowerCase()) {
        return false;
      }
      return true;
    });

    const nextItems = cart.items.filter((line) => {
      if (line.productId !== args.productId) return true;
      if (args.color && line.color.toLowerCase() !== args.color.toLowerCase()) {
        return true;
      }
      return false;
    });

    await ctx.db.patch(cart._id, {
      items: nextItems,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: "Item removed from cart.",
      cartItemCount: nextItems.reduce((sum, line) => sum + line.quantity, 0),
      clearedAll: false,
      removedProductId: removedLine?.productId,
      removedColor: removedLine?.color,
    };
  },
});

export const getCartLines = internalQuery({
  args: { conversationId: v.id("vapiConversations") },
  returns: v.array(cartLineValidator),
  handler: async (ctx, args): Promise<CartLine[]> => {
    const cart = await getCartDoc(ctx, args.conversationId);
    return cart?.items ?? [];
  },
});

export const clearCartAfterCheckout = internalMutation({
  args: { conversationId: v.id("vapiConversations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await clearCartItems(ctx, args.conversationId);
    return null;
  },
});

export const createCashOrder = internalMutation({
  args: {
    conversationId: v.id("vapiConversations"),
    customer: customerInfoValidator,
    idempotencyKey: v.string(),
  },
  returns: v.object({
    orderNumber: v.string(),
    total: v.number(),
    currency: v.string(),
    paymentMethod: v.literal("cod"),
    message: v.string(),
    promotions: v.array(appliedPromotionSummaryValidator),
    promotionSummary: v.string(),
  }),
  handler: async (ctx, args) => {
    const cart = await getCartDoc(ctx, args.conversationId);
    const lines = cart?.items ?? [];
    validateCartLines(lines);
    validateCustomerFields(args.customer);

    const result: { orderId: Id<"orders">; orderNumber: string } =
      await ctx.runMutation(internal.orders.createCashOrderInternal, {
        lines,
        customer: args.customer,
        idempotencyKey: args.idempotencyKey,
      });

    await clearCartItems(ctx, args.conversationId);
    await incrementDailyAnalytics(ctx, "checkoutStarts");

    const order = await ctx.db.get("orders", result.orderId);
    if (!order) {
      throw new ConvexError("Order was created but could not be loaded");
    }

    const orderPromotions = await ctx.db
      .query("orderPromotions")
      .withIndex("by_order_id", (q) => q.eq("orderId", result.orderId))
      .collect();

    const promotions = orderPromotions.map((promo) => ({
      promotionId: promo.promotionId,
      promotionType: promo.promotionType,
      promotionName: promo.promotionName,
      promotionDescription: promo.promotionDescription,
      buyProductId: promo.buyProductId,
      getProductId: promo.getProductId,
      freeQuantity: promo.freeQuantity,
      savingsAmount: promo.savingsAmount,
    }));

    const promotionSummary = formatAppliedPromotionSummary(
      promotions,
      order.currency
    );

    const promotionMessage = promotionSummary
      ? `\nPromotions applied:\n${promotionSummary}`
      : "";

    return {
      orderNumber: result.orderNumber,
      total: order.total,
      currency: order.currency,
      paymentMethod: "cod" as const,
      message: `Order confirmed!\nOrder number: ${result.orderNumber}\nTotal: ${order.currency} ${order.total.toFixed(2)}${promotionMessage}\nPayment: Cash on delivery\nPay when your order arrives.`,
      promotions,
      promotionSummary,
    };
  },
});

export const getProductColorOptions = internalQuery({
  args: { productId: v.id("products") },
  returns: v.object({
    productId: v.id("products"),
    name: v.string(),
    colors: v.array(v.string()),
    inStock: v.boolean(),
    defaultColor: v.union(v.string(), v.null()),
    summary: v.union(
      v.object({
        id: v.string(),
        name: v.string(),
        finalPrice: v.number(),
        currency: v.string(),
        category: v.union(v.string(), v.null()),
        rating: v.number(),
        reviewsCount: v.number(),
        url: v.string(),
        inStock: v.boolean(),
      }),
      v.null()
    ),
  }),
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new ConvexError("Product not found");
    }
    const enriched = await enrichProduct(ctx, product);
    const summary = toVapiProductSummary(enriched, { includeStock: true });
    return {
      productId: args.productId,
      name: enriched.name,
      colors: enriched.colors,
      inStock: enriched.stock > 0,
      defaultColor: enriched.colors[0] ?? null,
      summary,
    };
  },
});
