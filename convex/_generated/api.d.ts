/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adminUsers from "../adminUsers.js";
import type * as auth from "../auth.js";
import type * as contactMessages from "../contactMessages.js";
import type * as email from "../email.js";
import type * as http from "../http.js";
import type * as lib_authRoles from "../lib/authRoles.js";
import type * as lib_emailFrom from "../lib/emailFrom.js";
import type * as lib_pagination from "../lib/pagination.js";
import type * as lib_productActive from "../lib/productActive.js";
import type * as lib_products from "../lib/products.js";
import type * as lib_requireAdmin from "../lib/requireAdmin.js";
import type * as migrations from "../migrations.js";
import type * as productCategories from "../productCategories.js";
import type * as products from "../products.js";
import type * as seed from "../seed.js";
import type * as settings from "../settings.js";
import type * as subscribers from "../subscribers.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminUsers: typeof adminUsers;
  auth: typeof auth;
  contactMessages: typeof contactMessages;
  email: typeof email;
  http: typeof http;
  "lib/authRoles": typeof lib_authRoles;
  "lib/emailFrom": typeof lib_emailFrom;
  "lib/pagination": typeof lib_pagination;
  "lib/productActive": typeof lib_productActive;
  "lib/products": typeof lib_products;
  "lib/requireAdmin": typeof lib_requireAdmin;
  migrations: typeof migrations;
  productCategories: typeof productCategories;
  products: typeof products;
  seed: typeof seed;
  settings: typeof settings;
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
