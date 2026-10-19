import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAdmin } from "./lib/requireAdmin";
import {
  assertSnapshotDate,
  classifyOrder,
  claimDecision,
  insufficientHistory,
  lineIncluded,
  observeDay,
  qualityNote,
  toQualityLine,
  withinCutoff,
} from "./lib/forecasting/dataQuality";
import { utcDateFromMillis } from "./lib/forecasting/eligibility";

const PAGE_LIMIT = 25;
const ITEM_LIMIT = 40;

export const pageOrderLines = internalQuery({
  args: { cursor: v.union(v.string(), v.null()), cutoff: v.string() },
  handler: async (ctx, args) => {
    if (process.env.DEMAND_FORECAST_EXPORT_ENABLED?.trim() !== "true") {
      return { blocked: true as const, orders: [], lines: [], isDone: true, continueCursor: null };
    }
    const page = await ctx.db.query("orders").withIndex("by_created_at").order("asc").paginate({
      numItems: PAGE_LIMIT,
      cursor: args.cursor,
    });
    const orders: { orderKey: string; kind: "eligible" | "refund" | "ineligible" }[] = [];
    const lines: {
      lineKey: string;
      orderKey: string;
      productId: string;
      categoryId: string;
      quantity: number;
      date: string;
    }[] = [];
    for (const order of page.page) {
      const date = utcDateFromMillis(order.paidAt ?? order.createdAt);
      if (!withinCutoff(date, args.cutoff)) continue;
      const kind = classifyOrder({
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
      });
      orders.push({ orderKey: order._id, kind });
      if (kind !== "eligible") continue;
      const items = await ctx.db
        .query("orderItems")
        .withIndex("by_order_id", (q) => q.eq("orderId", order._id))
        .take(ITEM_LIMIT);
      for (const item of items) {
        if (!lineIncluded(kind, item.isPromotionGift === true)) continue;
        const product = await ctx.db.get(item.productId);
        lines.push(
          toQualityLine({
            lineKey: `${args.cutoff}:${item._id}`,
            orderKey: order._id,
            productId: item.productId,
            categoryId: product?.categoryId ?? "",
            quantity: item.quantity,
            date,
            customerEmail: order.customerEmail,
          })
        );
      }
    }
    return {
      blocked: false as const,
      orders,
      lines,
      isDone: page.isDone,
      continueCursor: page.isDone ? null : page.continueCursor,
    };
  },
});

export const beginQualityRun = internalMutation({
  args: { cutoff: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("forecastQualityRuns")
      .withIndex("by_cutoff", (q) => q.eq("cutoff", args.cutoff))
      .unique();
    if (existing) return existing;
    const id = await ctx.db.insert("forecastQualityRuns", {
      cutoff: args.cutoff,
      status: "building",
      cursor: null,
      eligibleOrderCount: 0,
      excludedRefundCount: 0,
      skippedIneligibleCount: 0,
      observationCount: 0,
      productCount: 0,
      missingDateRate: 0,
      insufficientHistoryCount: 0,
      duplicateLineCount: 0,
      startedAt: Date.now(),
      updatedAt: Date.now(),
      note: qualityNote(false),
    });
    const created = await ctx.db.get(id);
    if (!created) throw new Error("Forecast quality run was not created");
    return created;
  },
});

const orderValidator = v.object({
  orderKey: v.string(),
  kind: v.union(v.literal("eligible"), v.literal("refund"), v.literal("ineligible")),
});

const lineValidator = v.object({
  lineKey: v.string(),
  orderKey: v.string(),
  productId: v.string(),
  categoryId: v.string(),
  quantity: v.number(),
  date: v.string(),
});

export const applyQualityPage = internalMutation({
  args: {
    cutoff: v.string(),
    orders: v.array(orderValidator),
    lines: v.array(lineValidator),
    cursor: v.union(v.string(), v.null()),
    isDone: v.boolean(),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db
      .query("forecastQualityRuns")
      .withIndex("by_cutoff", (q) => q.eq("cutoff", args.cutoff))
      .unique();
    if (!run) throw new Error("Forecast quality run was not found");
    let eligible = run.eligibleOrderCount;
    let refunds = run.excludedRefundCount;
    let ineligible = run.skippedIneligibleCount;
    let duplicates = run.duplicateLineCount;
    let observations = run.observationCount;
    for (const order of args.orders.slice(0, PAGE_LIMIT)) {
      const claimed = await ctx.db
        .query("forecastOrderClaims")
        .withIndex("by_order", (q) => q.eq("orderKey", order.orderKey).eq("cutoff", args.cutoff))
        .unique();
      if (claimDecision(claimed != null) === "skip") continue;
      await ctx.db.insert("forecastOrderClaims", {
        orderKey: order.orderKey,
        cutoff: args.cutoff,
        kind: order.kind,
      });
      if (order.kind === "eligible") eligible += 1;
      if (order.kind === "refund") refunds += 1;
      if (order.kind === "ineligible") ineligible += 1;
    }
    for (const line of args.lines.slice(0, PAGE_LIMIT * 4)) {
      if (!withinCutoff(line.date, args.cutoff)) continue;
      const claimed = await ctx.db
        .query("forecastDemandClaims")
        .withIndex("by_line", (q) => q.eq("lineKey", line.lineKey))
        .unique();
      if (claimDecision(claimed != null) === "skip") {
        duplicates += 1;
        continue;
      }
      await ctx.db.insert("forecastDemandClaims", {
        lineKey: line.lineKey,
        cutoff: args.cutoff,
        productId: line.productId,
        snapshotDate: line.date,
        units: line.quantity,
      });
      const day = await ctx.db
        .query("forecastDemandDays")
        .withIndex("by_cutoff_product_date", (q) =>
          q.eq("cutoff", args.cutoff).eq("productId", line.productId).eq("snapshotDate", line.date)
        )
        .unique();
      if (day) {
        await ctx.db.patch(day._id, { units: day.units + line.quantity });
      } else {
        await ctx.db.insert("forecastDemandDays", {
          cutoff: args.cutoff,
          productId: line.productId,
          snapshotDate: line.date,
          units: line.quantity,
          categoryId: line.categoryId,
        });
        observations += 1;
      }
      const coverage = await ctx.db
        .query("forecastProductCoverage")
        .withIndex("by_cutoff_product", (q) => q.eq("cutoff", args.cutoff).eq("productId", line.productId))
        .unique();
      const parsedDates = coverage ? (JSON.parse(coverage.datesJson) as string[]) : [];
      const next = observeDay(
        coverage
          ? {
              observedDays: coverage.observedDays,
              units: coverage.units,
              firstDate: coverage.firstDate,
              lastDate: coverage.lastDate,
              dates: parsedDates,
            }
          : undefined,
        line.date,
        line.quantity
      );
      if (coverage) {
        await ctx.db.patch(coverage._id, {
          observedDays: next.observedDays,
          units: next.units,
          firstDate: next.firstDate,
          lastDate: next.lastDate,
          datesJson: JSON.stringify(next.dates.slice(0, 400)),
        });
      } else {
        await ctx.db.insert("forecastProductCoverage", {
          cutoff: args.cutoff,
          productId: line.productId,
          observedDays: next.observedDays,
          units: next.units,
          firstDate: next.firstDate,
          lastDate: next.lastDate,
          datesJson: JSON.stringify(next.dates),
          scanned: false,
        });
      }
    }
    await ctx.db.patch(run._id, {
      eligibleOrderCount: eligible,
      excludedRefundCount: refunds,
      skippedIneligibleCount: ineligible,
      duplicateLineCount: duplicates,
      observationCount: observations,
      cursor: args.cursor,
      updatedAt: Date.now(),
      note: qualityNote(false),
    });
    if (args.isDone) {
      await ctx.scheduler.runAfter(0, internal.forecastQuality.finalizeCoverage, { cutoff: args.cutoff });
    }
    return { isDone: args.isDone };
  },
});

export const finalizeCoverage = internalMutation({
  args: { cutoff: v.string() },
  handler: async (ctx, args) => {
    const run = await ctx.db
      .query("forecastQualityRuns")
      .withIndex("by_cutoff", (q) => q.eq("cutoff", args.cutoff))
      .unique();
    if (!run) return;
    const rows = await ctx.db
      .query("forecastProductCoverage")
      .withIndex("by_cutoff_scanned", (q) => q.eq("cutoff", args.cutoff).eq("scanned", false))
      .take(40);
    let insufficient = run.insufficientHistoryCount;
    let gapSum = run.missingDateRate * Math.max(run.productCount, 1);
    let products = run.productCount;
    if (run.productCount === 0) gapSum = 0;
    for (const row of rows) {
      products += 1;
      if (insufficientHistory(row.observedDays)) insufficient += 1;
      const start = Date.parse(`${row.firstDate}T00:00:00.000Z`);
      const end = Date.parse(`${row.lastDate}T00:00:00.000Z`);
      const span = Math.round((end - start) / 86_400_000) + 1;
      gapSum += span > 0 ? 1 - row.observedDays / span : 0;
      await ctx.db.patch(row._id, { scanned: true });
    }
    const done = rows.length < 40;
    await ctx.db.patch(run._id, {
      productCount: products,
      insufficientHistoryCount: insufficient,
      missingDateRate: products > 0 ? gapSum / products : 0,
      status: done ? "complete" : "building",
      completedAt: done ? Date.now() : undefined,
      updatedAt: Date.now(),
      note: qualityNote(done),
    });
    if (!done) {
      await ctx.scheduler.runAfter(0, internal.forecastQuality.finalizeCoverage, { cutoff: args.cutoff });
    }
  },
});

export const failQualityRun = internalMutation({
  args: { cutoff: v.string(), reason: v.string() },
  handler: async (ctx, args) => {
    const run = await ctx.db
      .query("forecastQualityRuns")
      .withIndex("by_cutoff", (q) => q.eq("cutoff", args.cutoff))
      .unique();
    if (!run) return;
    await ctx.db.patch(run._id, {
      status: "failed",
      note: args.reason.slice(0, 180),
      updatedAt: Date.now(),
    });
  },
});

export const continueQualityRun = internalAction({
  args: { cutoff: v.string(), cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, args): Promise<{ blocked: true } | { blocked: false; done: boolean }> => {
    if (process.env.DEMAND_FORECAST_EXPORT_ENABLED?.trim() !== "true") {
      await ctx.runMutation(internal.forecastQuality.failQualityRun, {
        cutoff: args.cutoff,
        reason: "export_gate",
      });
      return { blocked: true as const };
    }
    const page = await ctx.runQuery(internal.forecastQuality.pageOrderLines, {
      cursor: args.cursor,
      cutoff: args.cutoff,
    });
    if (page.blocked) {
      await ctx.runMutation(internal.forecastQuality.failQualityRun, {
        cutoff: args.cutoff,
        reason: "export_gate",
      });
      return { blocked: true as const };
    }
    await ctx.runMutation(internal.forecastQuality.applyQualityPage, {
      cutoff: args.cutoff,
      orders: page.orders,
      lines: page.lines,
      cursor: page.continueCursor,
      isDone: page.isDone,
    });
    if (!page.isDone && page.continueCursor) {
      await ctx.scheduler.runAfter(0, internal.forecastQuality.continueQualityRun, {
        cutoff: args.cutoff,
        cursor: page.continueCursor,
      });
    }
    return { blocked: false as const, done: page.isDone };
  },
});

export const startQualityBuild = action({
  args: {},
  handler: async (ctx): Promise<{ cutoff: string; status: string }> => {
    await requireAdmin(ctx);
    if (process.env.DEMAND_FORECAST_EXPORT_ENABLED?.trim() !== "true") {
      throw new Error("export_gate");
    }
    const cutoff = new Date().toISOString().slice(0, 10);
    await ctx.runMutation(internal.forecastQuality.beginQualityRun, { cutoff });
    await ctx.runAction(internal.forecastQuality.continueQualityRun, { cutoff, cursor: null });
    return { cutoff, status: "building" };
  },
});

export const recordStockPage = internalMutation({
  args: { cursor: v.union(v.string(), v.null()), snapshotDate: v.string() },
  handler: async (ctx, args) => {
    if (process.env.INVENTORY_SNAPSHOTS_ENABLED?.trim() !== "true") {
      return { skipped: true as const, done: true };
    }
    const today = new Date().toISOString().slice(0, 10);
    assertSnapshotDate(args.snapshotDate, today);
    let run = await ctx.db
      .query("inventorySnapshotRuns")
      .withIndex("by_date", (q) => q.eq("snapshotDate", args.snapshotDate))
      .unique();
    if (!run) {
      const id = await ctx.db.insert("inventorySnapshotRuns", {
        snapshotDate: args.snapshotDate,
        status: "building",
        cursor: null,
        recordedCount: 0,
        startedAt: Date.now(),
        updatedAt: Date.now(),
      });
      run = await ctx.db.get(id);
    }
    if (!run) return { skipped: false as const, done: true };
    const page = await ctx.db.query("products").paginate({
      numItems: PAGE_LIMIT,
      cursor: args.cursor,
    });
    let recorded = run.recordedCount;
    for (const product of page.page) {
      const existing = await ctx.db
        .query("inventorySnapshots")
        .withIndex("by_product_date", (q) =>
          q.eq("productId", product._id).eq("snapshotDate", args.snapshotDate)
        )
        .unique();
      if (existing) continue;
      await ctx.db.insert("inventorySnapshots", {
        productId: product._id,
        snapshotDate: args.snapshotDate,
        availableStock: product.stock,
        productStatus: product.active === false ? "inactive" : "active",
        recordedAt: Date.now(),
      });
      recorded += 1;
    }
    await ctx.db.patch(run._id, {
      recordedCount: recorded,
      cursor: page.isDone ? null : page.continueCursor,
      status: page.isDone ? "complete" : "building",
      updatedAt: Date.now(),
    });
    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.forecastQuality.recordStockPage, {
        cursor: page.continueCursor,
        snapshotDate: args.snapshotDate,
      });
    }
    return { skipped: false as const, done: page.isDone };
  },
});

export const collectStockSnapshots = internalMutation({
  args: {},
  handler: async (ctx) => {
    if (process.env.INVENTORY_SNAPSHOTS_ENABLED?.trim() !== "true") return { skipped: true as const };
    const snapshotDate = new Date().toISOString().slice(0, 10);
    await ctx.scheduler.runAfter(0, internal.forecastQuality.recordStockPage, {
      cursor: null,
      snapshotDate,
    });
    return { skipped: false as const, snapshotDate };
  },
});
