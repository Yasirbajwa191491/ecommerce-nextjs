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
import type * as email from "../email.js";
import type * as http from "../http.js";
import type * as lib_products from "../lib/products.js";
import type * as lib_requireAdmin from "../lib/requireAdmin.js";
import type * as migrations from "../migrations.js";
import type * as productCategories from "../productCategories.js";
import type * as products from "../products.js";
import type * as seed from "../seed.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminUsers: typeof adminUsers;
  auth: typeof auth;
  email: typeof email;
  http: typeof http;
  "lib/products": typeof lib_products;
  "lib/requireAdmin": typeof lib_requireAdmin;
  migrations: typeof migrations;
  productCategories: typeof productCategories;
  products: typeof products;
  seed: typeof seed;
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
