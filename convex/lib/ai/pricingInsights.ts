import type { QueryCtx } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";
import {
  aggregateTopProducts,
  fetchOrdersInRange,
} from "../dashboardAggregates";
import {
  resolveDashboardRange,
  resolvePreviousPeriod,
} from "../dashboardRange";
import { calculateFinalPrice } from "../pricing";
import { isProductActive } from "../productActive";
import { getInventoryInsights } from "./businessIntelligence";

const PRODUCT_LIMIT = 30;

type SalesRow = {
  productId: Id<"products">;
  productName: string;
  unitsSold: number;
  revenue: number;
  orderCount: number;
  unitsGrowthPercent: number | null;
};

async function getProductSalesForPricing(
  ctx: QueryCtx,
  referenceNow: number
): Promise<SalesRow[]> {
  const currentRange = resolveDashboardRange(
    "month",
    undefined,
    undefined,
    referenceNow
  );
  const previousRange = resolvePreviousPeriod(currentRange);
  const [currentOrders, previousOrders] = await Promise.all([
    fetchOrdersInRange(ctx, currentRange),
    fetchOrdersInRange(ctx, previousRange),
  ]);
  const [currentProducts, previousProducts] = await Promise.all([
    aggregateTopProducts(ctx, currentOrders, 50),
    aggregateTopProducts(ctx, previousOrders, 50),
  ]);
  const previousById = new Map(previousProducts.map((p) => [p.productId, p]));
  return currentProducts.map((current) => {
    const previous = previousById.get(current.productId);
    const previousUnits = previous?.unitsSold ?? 0;
    const growth =
      previousUnits > 0
        ? ((current.unitsSold - previousUnits) / previousUnits) * 100
        : current.unitsSold > 0
          ? 100
          : null;
    return {
      productId: current.productId,
      productName: current.productName,
      unitsSold: current.unitsSold,
      revenue: current.revenue,
      orderCount: current.orderCount,
      unitsGrowthPercent: growth,
    };
  });
}

function computeHealthStatus(
  velocityRatio: number,
  stockRatio: number,
  rating: number
): "optimal" | "underpriced" | "overpriced" {
  if (velocityRatio > 1.2 && stockRatio < 0.5 && rating >= 4) {
    return "underpriced";
  }
  if (velocityRatio < 0.5 && stockRatio > 1.5) {
    return "overpriced";
  }
  return "optimal";
}

function computeSuggestedPrice(
  currentPrice: number,
  status: "optimal" | "underpriced" | "overpriced",
  velocityRatio: number
): number {
  if (status === "underpriced") {
    const bump = Math.min(0.15, 0.05 + (velocityRatio - 1) * 0.05);
    return Math.round(currentPrice * (1 + bump) * 100) / 100;
  }
  if (status === "overpriced") {
    const cut = Math.min(0.12, 0.05 + (1 - velocityRatio) * 0.05);
    return Math.round(currentPrice * (1 - cut) * 100) / 100;
  }
  return currentPrice;
}

function computeConfidence(
  reviews: number,
  unitsSold: number,
  status: "optimal" | "underpriced" | "overpriced"
): number {
  let score = 55;
  if (reviews >= 5) score += 10;
  if (reviews >= 20) score += 5;
  if (unitsSold >= 5) score += 10;
  if (unitsSold >= 20) score += 5;
  if (status !== "optimal") score += 7;
  return Math.min(92, score);
}

export async function getPricingInsights(ctx: QueryCtx, referenceNow: number) {
  const [sales, inventory, products] = await Promise.all([
    getProductSalesForPricing(ctx, referenceNow),
    getInventoryInsights(ctx, referenceNow),
    ctx.db.query("products").collect(),
  ]);

  const activeProducts = products.filter(isProductActive);
  const productMap = new Map(activeProducts.map((p) => [p._id, p]));
  const salesMap = new Map(sales.map((s) => [s.productId, s]));

  const inventoryMap = new Map(
    (inventory.reorderCandidates ?? []).map((item) => [item.productId, item])
  );

  const scored = activeProducts
    .map((product) => {
      const sale = salesMap.get(product._id);
      const inv = inventoryMap.get(product._id);
      const velocity = sale?.unitsSold ?? 0;
      const categoryAvgVelocity =
        sales.filter((s) => {
          const p = productMap.get(s.productId);
          return p?.categoryId === product.categoryId;
        }).reduce((sum, s) => sum + s.unitsSold, 0) /
        Math.max(
          1,
          activeProducts.filter((p) => p.categoryId === product.categoryId).length
        );
      const velocityRatio =
        categoryAvgVelocity > 0 ? velocity / categoryAvgVelocity : velocity > 0 ? 1.5 : 0.5;
      const stock = product.stock;
      const monthlySold = inv?.monthlyUnitsSold ?? velocity;
      const stockRatio = monthlySold > 0 ? stock / monthlySold : stock > 10 ? 2 : 0.5;

      const healthStatus = computeHealthStatus(
        velocityRatio,
        stockRatio,
        product.stars
      );
      const suggestedPrice = computeSuggestedPrice(
        product.price,
        healthStatus,
        velocityRatio
      );
      const confidence = computeConfidence(
        product.reviews,
        velocity,
        healthStatus
      );
      const healthScore =
        healthStatus === "optimal"
          ? 75 + Math.min(20, product.stars * 4)
          : healthStatus === "underpriced"
            ? 60 + confidence * 0.2
            : 50 + confidence * 0.15;

      return {
        productId: product._id,
        name: product.name,
        currentPrice: product.price,
        suggestedPrice,
        finalPrice: calculateFinalPrice(
          product.price,
          product.discountPercent ?? 0
        ),
        discountPercent: product.discountPercent ?? 0,
        currency: product.currency ?? "USD",
        unitsSold: velocity,
        revenue: sale?.revenue ?? 0,
        orderCount: sale?.orderCount ?? 0,
        stock,
        daysOfCover: inv?.daysOfCover ?? null,
        stars: product.stars,
        reviews: product.reviews,
        featured: product.featured,
        healthStatus,
        healthScore: Math.round(healthScore),
        confidence,
        priceDifferencePercent: Math.round(
          ((suggestedPrice - product.price) / product.price) * 100
        ),
        unitsGrowthPercent: sale?.unitsGrowthPercent ?? null,
        reasons: [
          velocity > categoryAvgVelocity * 1.2 ? "High sales velocity" : null,
          product.stars >= 4 ? "Strong review ratings" : null,
          stock < 10 && velocity > 0 ? "Low inventory remaining" : null,
          product.featured ? "Featured product visibility" : null,
          (product.discountPercent ?? 0) > 0
            ? `${product.discountPercent}% active discount`
            : null,
          velocity < categoryAvgVelocity * 0.5 && stock > monthlySold * 2
            ? "Slow sales with high stock"
            : null,
        ].filter((r): r is string => Boolean(r)),
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, PRODUCT_LIMIT);

  const avgHealthScore =
    scored.length > 0
      ? Math.round(
          scored.reduce((sum, p) => sum + p.healthScore, 0) / scored.length
        )
      : 0;

  return {
    storeHealthScore: avgHealthScore,
    currency: scored[0]?.currency ?? "USD",
    products: scored,
    underpriced: scored
      .filter((p) => p.healthStatus === "underpriced")
      .slice(0, 6),
    overpriced: scored
      .filter((p) => p.healthStatus === "overpriced")
      .slice(0, 6),
    discountCandidates: scored
      .filter(
        (p) =>
          p.healthStatus === "overpriced" ||
          (p.unitsSold < 3 && p.stock > 15)
      )
      .slice(0, 6),
    increaseCandidates: scored
      .filter((p) => p.healthStatus === "underpriced")
      .slice(0, 6),
  };
}
