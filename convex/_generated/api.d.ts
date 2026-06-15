/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as aboutStats from "../aboutStats.js";
import type * as adminDashboard from "../adminDashboard.js";
import type * as adminOrders from "../adminOrders.js";
import type * as adminProductContent from "../adminProductContent.js";
import type * as adminReviews from "../adminReviews.js";
import type * as adminUsers from "../adminUsers.js";
import type * as auth from "../auth.js";
import type * as contactMessages from "../contactMessages.js";
import type * as email from "../email.js";
import type * as emailCampaigns from "../emailCampaigns.js";
import type * as emailHelpers from "../emailHelpers.js";
import type * as emailMarketingDashboard from "../emailMarketingDashboard.js";
import type * as emailTemplates from "../emailTemplates.js";
import type * as http from "../http.js";
import type * as lib_adminActivityLogs from "../lib/adminActivityLogs.js";
import type * as lib_adminAuth from "../lib/adminAuth.js";
import type * as lib_aiValidators from "../lib/aiValidators.js";
import type * as lib_ai_constants from "../lib/ai/constants.js";
import type * as lib_ai_getProvider from "../lib/ai/getProvider.js";
import type * as lib_ai_productContentGeneration from "../lib/ai/productContentGeneration.js";
import type * as lib_ai_productContentImages from "../lib/ai/productContentImages.js";
import type * as lib_ai_productContentTypes from "../lib/ai/productContentTypes.js";
import type * as lib_ai_productIntelligence from "../lib/ai/productIntelligence.js";
import type * as lib_ai_productIntelligenceHelpers from "../lib/ai/productIntelligenceHelpers.js";
import type * as lib_ai_productIntelligenceTypes from "../lib/ai/productIntelligenceTypes.js";
import type * as lib_ai_providers_anthropic from "../lib/ai/providers/anthropic.js";
import type * as lib_ai_providers_gemini from "../lib/ai/providers/gemini.js";
import type * as lib_ai_providers_groq from "../lib/ai/providers/groq.js";
import type * as lib_ai_providers_openai from "../lib/ai/providers/openai.js";
import type * as lib_ai_providers_remoteWorker from "../lib/ai/providers/remoteWorker.js";
import type * as lib_ai_providers_shared from "../lib/ai/providers/shared.js";
import type * as lib_ai_reviewIntelligence from "../lib/ai/reviewIntelligence.js";
import type * as lib_ai_tagIndex from "../lib/ai/tagIndex.js";
import type * as lib_ai_tagUtils from "../lib/ai/tagUtils.js";
import type * as lib_ai_types from "../lib/ai/types.js";
import type * as lib_authRoles from "../lib/authRoles.js";
import type * as lib_backfillOrderLogs from "../lib/backfillOrderLogs.js";
import type * as lib_campaignQueue from "../lib/campaignQueue.js";
import type * as lib_checkoutValidation from "../lib/checkoutValidation.js";
import type * as lib_dashboardAggregates from "../lib/dashboardAggregates.js";
import type * as lib_dashboardRange from "../lib/dashboardRange.js";
import type * as lib_emailFrom from "../lib/emailFrom.js";
import type * as lib_emailMarketingValidators from "../lib/emailMarketingValidators.js";
import type * as lib_emailPlaceholders from "../lib/emailPlaceholders.js";
import type * as lib_inventory from "../lib/inventory.js";
import type * as lib_orderItemSnapshot from "../lib/orderItemSnapshot.js";
import type * as lib_orderLogs from "../lib/orderLogs.js";
import type * as lib_orderNumbers from "../lib/orderNumbers.js";
import type * as lib_orderPricing from "../lib/orderPricing.js";
import type * as lib_orderValidators from "../lib/orderValidators.js";
import type * as lib_pagination from "../lib/pagination.js";
import type * as lib_pricing from "../lib/pricing.js";
import type * as lib_productActive from "../lib/productActive.js";
import type * as lib_products from "../lib/products.js";
import type * as lib_publicOrderDto from "../lib/publicOrderDto.js";
import type * as lib_rateLimit from "../lib/rateLimit.js";
import type * as lib_requireAdmin from "../lib/requireAdmin.js";
import type * as lib_reviewAggregates from "../lib/reviewAggregates.js";
import type * as lib_reviewCallErrors from "../lib/reviewCallErrors.js";
import type * as lib_reviewCallValidators from "../lib/reviewCallValidators.js";
import type * as lib_reviews from "../lib/reviews.js";
import type * as lib_search_hybridRank from "../lib/search/hybridRank.js";
import type * as lib_search_productTextMatch from "../lib/search/productTextMatch.js";
import type * as lib_search_queryParser from "../lib/search/queryParser.js";
import type * as lib_settingsHelpers from "../lib/settingsHelpers.js";
import type * as lib_siteUrl from "../lib/siteUrl.js";
import type * as lib_storeGuideContent from "../lib/storeGuideContent.js";
import type * as lib_subscriberTokens from "../lib/subscriberTokens.js";
import type * as migrations from "../migrations.js";
import type * as notifications from "../notifications.js";
import type * as orderTracking from "../orderTracking.js";
import type * as orders from "../orders.js";
import type * as productAi from "../productAi.js";
import type * as productAiActions from "../productAiActions.js";
import type * as productAiQueries from "../productAiQueries.js";
import type * as productCategories from "../productCategories.js";
import type * as productReviewInsights from "../productReviewInsights.js";
import type * as productReviewSearch from "../productReviewSearch.js";
import type * as productReviews from "../productReviews.js";
import type * as productSearch from "../productSearch.js";
import type * as productSearchQueries from "../productSearchQueries.js";
import type * as products from "../products.js";
import type * as reviewAi from "../reviewAi.js";
import type * as reviewAiActions from "../reviewAiActions.js";
import type * as reviewAiQueries from "../reviewAiQueries.js";
import type * as reviewCallActions from "../reviewCallActions.js";
import type * as reviewCalls from "../reviewCalls.js";
import type * as seed from "../seed.js";
import type * as settings from "../settings.js";
import type * as sms from "../sms.js";
import type * as stripe from "../stripe.js";
import type * as stripeWebhookNode from "../stripeWebhookNode.js";
import type * as stripeWebhooks from "../stripeWebhooks.js";
import type * as subscribers from "../subscribers.js";
import type * as vapi_admin from "../vapi/admin.js";
import type * as vapi_analyticsHelpers from "../vapi/analyticsHelpers.js";
import type * as vapi_assistantConfig from "../vapi/assistantConfig.js";
import type * as vapi_bundleBuilder from "../vapi/bundleBuilder.js";
import type * as vapi_dtos from "../vapi/dtos.js";
import type * as vapi_logging from "../vapi/logging.js";
import type * as vapi_reviewCallTools from "../vapi/reviewCallTools.js";
import type * as vapi_shoppingCheckoutActions from "../vapi/shoppingCheckoutActions.js";
import type * as vapi_shoppingTools from "../vapi/shoppingTools.js";
import type * as vapi_tools from "../vapi/tools.js";
import type * as vapi_voiceCheckout from "../vapi/voiceCheckout.js";
import type * as vapi_voiceSearchActions from "../vapi/voiceSearchActions.js";
import type * as vapi_webhook from "../vapi/webhook.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aboutStats: typeof aboutStats;
  adminDashboard: typeof adminDashboard;
  adminOrders: typeof adminOrders;
  adminProductContent: typeof adminProductContent;
  adminReviews: typeof adminReviews;
  adminUsers: typeof adminUsers;
  auth: typeof auth;
  contactMessages: typeof contactMessages;
  email: typeof email;
  emailCampaigns: typeof emailCampaigns;
  emailHelpers: typeof emailHelpers;
  emailMarketingDashboard: typeof emailMarketingDashboard;
  emailTemplates: typeof emailTemplates;
  http: typeof http;
  "lib/adminActivityLogs": typeof lib_adminActivityLogs;
  "lib/adminAuth": typeof lib_adminAuth;
  "lib/aiValidators": typeof lib_aiValidators;
  "lib/ai/constants": typeof lib_ai_constants;
  "lib/ai/getProvider": typeof lib_ai_getProvider;
  "lib/ai/productContentGeneration": typeof lib_ai_productContentGeneration;
  "lib/ai/productContentImages": typeof lib_ai_productContentImages;
  "lib/ai/productContentTypes": typeof lib_ai_productContentTypes;
  "lib/ai/productIntelligence": typeof lib_ai_productIntelligence;
  "lib/ai/productIntelligenceHelpers": typeof lib_ai_productIntelligenceHelpers;
  "lib/ai/productIntelligenceTypes": typeof lib_ai_productIntelligenceTypes;
  "lib/ai/providers/anthropic": typeof lib_ai_providers_anthropic;
  "lib/ai/providers/gemini": typeof lib_ai_providers_gemini;
  "lib/ai/providers/groq": typeof lib_ai_providers_groq;
  "lib/ai/providers/openai": typeof lib_ai_providers_openai;
  "lib/ai/providers/remoteWorker": typeof lib_ai_providers_remoteWorker;
  "lib/ai/providers/shared": typeof lib_ai_providers_shared;
  "lib/ai/reviewIntelligence": typeof lib_ai_reviewIntelligence;
  "lib/ai/tagIndex": typeof lib_ai_tagIndex;
  "lib/ai/tagUtils": typeof lib_ai_tagUtils;
  "lib/ai/types": typeof lib_ai_types;
  "lib/authRoles": typeof lib_authRoles;
  "lib/backfillOrderLogs": typeof lib_backfillOrderLogs;
  "lib/campaignQueue": typeof lib_campaignQueue;
  "lib/checkoutValidation": typeof lib_checkoutValidation;
  "lib/dashboardAggregates": typeof lib_dashboardAggregates;
  "lib/dashboardRange": typeof lib_dashboardRange;
  "lib/emailFrom": typeof lib_emailFrom;
  "lib/emailMarketingValidators": typeof lib_emailMarketingValidators;
  "lib/emailPlaceholders": typeof lib_emailPlaceholders;
  "lib/inventory": typeof lib_inventory;
  "lib/orderItemSnapshot": typeof lib_orderItemSnapshot;
  "lib/orderLogs": typeof lib_orderLogs;
  "lib/orderNumbers": typeof lib_orderNumbers;
  "lib/orderPricing": typeof lib_orderPricing;
  "lib/orderValidators": typeof lib_orderValidators;
  "lib/pagination": typeof lib_pagination;
  "lib/pricing": typeof lib_pricing;
  "lib/productActive": typeof lib_productActive;
  "lib/products": typeof lib_products;
  "lib/publicOrderDto": typeof lib_publicOrderDto;
  "lib/rateLimit": typeof lib_rateLimit;
  "lib/requireAdmin": typeof lib_requireAdmin;
  "lib/reviewAggregates": typeof lib_reviewAggregates;
  "lib/reviewCallErrors": typeof lib_reviewCallErrors;
  "lib/reviewCallValidators": typeof lib_reviewCallValidators;
  "lib/reviews": typeof lib_reviews;
  "lib/search/hybridRank": typeof lib_search_hybridRank;
  "lib/search/productTextMatch": typeof lib_search_productTextMatch;
  "lib/search/queryParser": typeof lib_search_queryParser;
  "lib/settingsHelpers": typeof lib_settingsHelpers;
  "lib/siteUrl": typeof lib_siteUrl;
  "lib/storeGuideContent": typeof lib_storeGuideContent;
  "lib/subscriberTokens": typeof lib_subscriberTokens;
  migrations: typeof migrations;
  notifications: typeof notifications;
  orderTracking: typeof orderTracking;
  orders: typeof orders;
  productAi: typeof productAi;
  productAiActions: typeof productAiActions;
  productAiQueries: typeof productAiQueries;
  productCategories: typeof productCategories;
  productReviewInsights: typeof productReviewInsights;
  productReviewSearch: typeof productReviewSearch;
  productReviews: typeof productReviews;
  productSearch: typeof productSearch;
  productSearchQueries: typeof productSearchQueries;
  products: typeof products;
  reviewAi: typeof reviewAi;
  reviewAiActions: typeof reviewAiActions;
  reviewAiQueries: typeof reviewAiQueries;
  reviewCallActions: typeof reviewCallActions;
  reviewCalls: typeof reviewCalls;
  seed: typeof seed;
  settings: typeof settings;
  sms: typeof sms;
  stripe: typeof stripe;
  stripeWebhookNode: typeof stripeWebhookNode;
  stripeWebhooks: typeof stripeWebhooks;
  subscribers: typeof subscribers;
  "vapi/admin": typeof vapi_admin;
  "vapi/analyticsHelpers": typeof vapi_analyticsHelpers;
  "vapi/assistantConfig": typeof vapi_assistantConfig;
  "vapi/bundleBuilder": typeof vapi_bundleBuilder;
  "vapi/dtos": typeof vapi_dtos;
  "vapi/logging": typeof vapi_logging;
  "vapi/reviewCallTools": typeof vapi_reviewCallTools;
  "vapi/shoppingCheckoutActions": typeof vapi_shoppingCheckoutActions;
  "vapi/shoppingTools": typeof vapi_shoppingTools;
  "vapi/tools": typeof vapi_tools;
  "vapi/voiceCheckout": typeof vapi_voiceCheckout;
  "vapi/voiceSearchActions": typeof vapi_voiceSearchActions;
  "vapi/webhook": typeof vapi_webhook;
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
