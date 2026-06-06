/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adminDashboard from "../adminDashboard.js";
import type * as adminOrders from "../adminOrders.js";
import type * as adminUsers from "../adminUsers.js";
import type * as auth from "../auth.js";
import type * as contactMessages from "../contactMessages.js";
import type * as email from "../email.js";
import type * as http from "../http.js";
import type * as lib_adminActivityLogs from "../lib/adminActivityLogs.js";
import type * as lib_authRoles from "../lib/authRoles.js";
import type * as lib_backfillOrderLogs from "../lib/backfillOrderLogs.js";
import type * as lib_checkoutValidation from "../lib/checkoutValidation.js";
import type * as lib_dashboardAggregates from "../lib/dashboardAggregates.js";
import type * as lib_dashboardRange from "../lib/dashboardRange.js";
import type * as lib_emailFrom from "../lib/emailFrom.js";
import type * as lib_inventory from "../lib/inventory.js";
import type * as lib_orderLogs from "../lib/orderLogs.js";
import type * as lib_orderNumbers from "../lib/orderNumbers.js";
import type * as lib_orderPricing from "../lib/orderPricing.js";
import type * as lib_orderValidators from "../lib/orderValidators.js";
import type * as lib_pagination from "../lib/pagination.js";
import type * as lib_productActive from "../lib/productActive.js";
import type * as lib_products from "../lib/products.js";
import type * as lib_publicOrderDto from "../lib/publicOrderDto.js";
import type * as lib_rateLimit from "../lib/rateLimit.js";
import type * as lib_requireAdmin from "../lib/requireAdmin.js";
import type * as lib_settingsHelpers from "../lib/settingsHelpers.js";
import type * as lib_siteUrl from "../lib/siteUrl.js";
import type * as migrations from "../migrations.js";
import type * as orderTracking from "../orderTracking.js";
import type * as orders from "../orders.js";
import type * as productCategories from "../productCategories.js";
import type * as products from "../products.js";
import type * as seed from "../seed.js";
import type * as settings from "../settings.js";
import type * as stripe from "../stripe.js";
import type * as stripeWebhookNode from "../stripeWebhookNode.js";
import type * as stripeWebhooks from "../stripeWebhooks.js";
import type * as subscribers from "../subscribers.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminDashboard: typeof adminDashboard;
  adminOrders: typeof adminOrders;
  adminUsers: typeof adminUsers;
  auth: typeof auth;
  contactMessages: typeof contactMessages;
  email: typeof email;
  http: typeof http;
  "lib/adminActivityLogs": typeof lib_adminActivityLogs;
  "lib/authRoles": typeof lib_authRoles;
  "lib/backfillOrderLogs": typeof lib_backfillOrderLogs;
  "lib/checkoutValidation": typeof lib_checkoutValidation;
  "lib/dashboardAggregates": typeof lib_dashboardAggregates;
  "lib/dashboardRange": typeof lib_dashboardRange;
  "lib/emailFrom": typeof lib_emailFrom;
  "lib/inventory": typeof lib_inventory;
  "lib/orderLogs": typeof lib_orderLogs;
  "lib/orderNumbers": typeof lib_orderNumbers;
  "lib/orderPricing": typeof lib_orderPricing;
  "lib/orderValidators": typeof lib_orderValidators;
  "lib/pagination": typeof lib_pagination;
  "lib/productActive": typeof lib_productActive;
  "lib/products": typeof lib_products;
  "lib/publicOrderDto": typeof lib_publicOrderDto;
  "lib/rateLimit": typeof lib_rateLimit;
  "lib/requireAdmin": typeof lib_requireAdmin;
  "lib/settingsHelpers": typeof lib_settingsHelpers;
  "lib/siteUrl": typeof lib_siteUrl;
  migrations: typeof migrations;
  orderTracking: typeof orderTracking;
  orders: typeof orders;
  productCategories: typeof productCategories;
  products: typeof products;
  seed: typeof seed;
  settings: typeof settings;
  stripe: typeof stripe;
  stripeWebhookNode: typeof stripeWebhookNode;
  stripeWebhooks: typeof stripeWebhooks;
  subscribers: typeof subscribers;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("../betterAuth/_generated/component.js").ComponentApi<"betterAuth">;
};
