import { expect, it } from "vitest";
import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import schema from "./schema";
import * as push from "./pushTokens";
import * as recovery from "./orderRecovery";
import * as delivery from "./pushNotificationsInternal";
import * as inbox from "./inAppNotifications";
import { tokenHash } from "./lib/capabilities";
const modules = { "./inAppNotifications.ts": async () => inbox, "./_generated/api.js": () => import("./_generated/api.js"), "./pushTokens.ts": async () => push, "./orderRecovery.ts": async () => recovery, "./pushNotificationsInternal.ts": async () => delivery };
const owner = "a".repeat(64), other = "b".repeat(64), email = "owner@example.invalid", expo = "ExpoPushToken[synthetic-owner-fixture]";
const register = makeFunctionReference<"mutation">("pushTokens:registerPushToken");
const touch = makeFunctionReference<"mutation">("pushTokens:touchPushToken");
const disable = makeFunctionReference<"mutation">("pushTokens:deactivatePushToken");
const disableAll = makeFunctionReference<"mutation">("pushTokens:deactivatePushTokensForVisitor");
const prefs = makeFunctionReference<"query">("pushTokens:getNotificationPreferences");
const sync = makeFunctionReference<"mutation">("pushTokens:syncNotificationPreferences");
async function fixture(bind = true) {
 const t = convexTest(schema, modules);
 await t.run(async ctx => {
  for (const guest of [owner, other]) await ctx.db.insert("guestCapabilities", { tokenHash: await tokenHash(guest), createdAt: Date.now() });
  if (bind) await ctx.db.insert("pushTokens", { visitorId: owner, customerEmail: email, expoPushToken: expo, platform: "ios", isActive: true, emailVerified: true, lastSeenAt: 1, createdAt: 1, updatedAt: 1 });
 });
 return t;
}
it("prevents a known Expo token from rebinding another guest and exposing email preferences", async () => {
 const t = await fixture();
 await expect(t.mutation(touch, { expoPushToken: expo, visitorId: other })).rejects.toThrow("ownership");
 await expect(t.mutation(register, { expoPushToken: expo, visitorId: other, customerEmail: email, platform: "ios" })).rejects.toThrow("verify");
 await expect(t.query(prefs, { customerEmail: email, visitorId: other })).rejects.toThrow("verified");
 await expect(t.mutation(disable, { expoPushToken: expo, visitorId: other })).rejects.toThrow("ownership");
 await expect(t.mutation(sync, { customerEmail: email, promotionalNotifications: true, paymentUpdates: false, orderUpdates: false })).rejects.toThrow("verified");
 expect(await t.query(prefs, { customerEmail: email, visitorId: owner })).toMatchObject({ orderUpdates: true });
});
it("preserves legitimate renewal and preferences while never reviving an inactive token on touch", async () => {
 const t = await fixture();
 await t.mutation(register, { expoPushToken: expo, visitorId: owner, customerEmail: email, platform: "ios" });
 await t.mutation(touch, { expoPushToken: expo, visitorId: owner });
 await t.mutation(sync, { customerEmail: email, visitorId: owner, promotionalNotifications: false, paymentUpdates: false, orderUpdates: true });
 expect(await t.query(prefs, { customerEmail: email, visitorId: owner })).toMatchObject({ paymentUpdates: false });
 await t.mutation(disable, { expoPushToken: expo, visitorId: owner });
 await t.mutation(touch, { expoPushToken: expo, visitorId: owner });
 expect(await t.run(ctx => ctx.db.query("pushTokens").first())).toMatchObject({ isActive: false, visitorId: owner });
});
it("rejects invented guest IDs and accepts order-capability enrollment for a fresh issued guest", async () => {
 const t = await fixture(false);
 const orderId = await t.run(ctx => ctx.db.insert("orders", { orderNumber: "FIXTURE-1", customerEmail: email, customerName: "Fixture", customerPhone: "000000", customerAddress: "Fixture", termsAccepted: true, privacyAccepted: true, status: "pending", paymentMethod: "cod", paymentStatus: "pending", subtotal: 10, tax: 0, shipping: 0, total: 10, currency: "USD", accessToken: "synthetic-checkout-capability", idempotencyKey: "fixture", createdAt: 1, updatedAt: 1 }));
 await expect(t.mutation(register, { expoPushToken: expo, visitorId: "c".repeat(64), customerEmail: email, platform: "ios", accessToken: "synthetic-checkout-capability" })).rejects.toThrow("guest");
 // An attacker can choose someone else's checkout email; checkout capability is not mailbox proof.
 await expect(t.mutation(register, { expoPushToken: expo, visitorId: owner, customerEmail: email, platform: "ios", accessToken: "synthetic-checkout-capability" })).rejects.toThrow("verify");
 await expect(t.query(prefs, { customerEmail: email, accessToken: "synthetic-checkout-capability" })).rejects.toThrow("verified");
 await t.run(ctx => ctx.db.insert("orderRecoveryChallenges", { email, orderNumber: "FIXTURE-1", challengeHash: "fixture-challenge-hash", otpHash: "fixture-code-hash", expiresAt: Date.now()+60000, attempts: 0, consumed: false }));
 const verified = await t.mutation(makeFunctionReference<"mutation">("orderRecovery:consume"), { challengeHash: "fixture-challenge-hash", otpHash: "fixture-code-hash" }) as { accessToken: string };
 expect(await t.run(ctx => ctx.db.get(orderId))).toHaveProperty("emailOwnershipVerifiedAt");
 await t.mutation(register, { expoPushToken: expo, visitorId: owner, customerEmail: email, platform: "ios", accessToken: verified.accessToken });
 expect(await t.query(prefs, { customerEmail: email, visitorId: owner })).toMatchObject({ orderUpdates: true });
});
it("deactivates every device through multiple bounded pages without touching other owners", async () => {
 const t = await fixture(false);
 await t.run(async ctx => { for (let i=0;i<61;i++) await ctx.db.insert("pushTokens", { visitorId: owner, customerEmail: email, expoPushToken: `ExpoPushToken[fixture-${i}]`, platform: "ios", isActive: true, emailVerified: true, lastSeenAt: 1, createdAt: 1, updatedAt: 1 }); await ctx.db.insert("pushTokens", { visitorId: other, customerEmail: "other@example.invalid", expoPushToken: "ExpoPushToken[other-fixture]", platform: "android", isActive: true, lastSeenAt: 1, createdAt: 1, updatedAt: 1 }); });
 expect(await t.query(makeFunctionReference<"query">("pushNotificationsInternal:getActiveTokensForEmail"), { customerEmail: email })).toHaveLength(61);
 expect(await t.mutation(disableAll, { visitorId: owner })).toBe(61);
 expect(await t.run(ctx => ctx.db.query("pushTokens").withIndex("by_visitor_email_active", q => q.eq("visitorId", other).eq("customerEmail", "other@example.invalid").eq("isActive", true)).first())).not.toBeNull();
});

it("never uses legacy unverified push bindings for account reads or private delivery", async () => {
 const t = await fixture(false);
 await t.run(async ctx => {
  await ctx.db.insert("pushTokens", { visitorId: other, customerEmail: email, expoPushToken: "ExpoPushToken[legacy-unverified]", platform: "ios", isActive: true, lastSeenAt: 1, createdAt: 1, updatedAt: 1 });
  await ctx.db.insert("pushTokens", { visitorId: owner, customerEmail: email, expoPushToken: expo, platform: "ios", isActive: true, emailVerified: true, lastSeenAt: 1, createdAt: 1, updatedAt: 1 });
 });
 await expect(t.query(prefs, { customerEmail: email, visitorId: other })).rejects.toThrow("verified");
 const tokens = await t.query(makeFunctionReference<"query">("pushNotificationsInternal:getActiveTokensForEmail"), { customerEmail: email });
 expect(tokens).toHaveLength(1); expect(tokens[0]).toHaveProperty("expoPushToken",expo);
});

it("reports unauthorized inbox access without throwing and preserves the private query boundary", async () => {
 const t = await fixture();
 const check = makeFunctionReference<"query">("inAppNotifications:checkCustomerAccess");
 expect(await t.query(check, { customerEmail: email, visitorId: other })).toBe(false);
 expect(await t.query(check, { customerEmail: email, visitorId: owner })).toBe(true);
 await expect(t.query(makeFunctionReference<"query">("inAppNotifications:getUnreadCount"), { customerEmail: email, visitorId: other })).rejects.toThrow("verified");
});
