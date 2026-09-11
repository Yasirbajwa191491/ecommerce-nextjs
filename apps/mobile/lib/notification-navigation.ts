import { type Href } from "expo-router";

import type { PushNotificationData } from "@/lib/push-notifications";

export type NotificationNavigationCredentials = {
  customerEmail?: string;
  accessToken?: string;
};

function appendCredentials(
  params: Record<string, string>,
  credentials?: NotificationNavigationCredentials
): Record<string, string> {
  const next = { ...params };
  if (credentials?.customerEmail) {
    next.customerEmail = credentials.customerEmail;
  }
  if (credentials?.accessToken) {
    next.accessToken = credentials.accessToken;
  }
  return next;
}

/** Converts server deep-link paths into Expo Router destinations. */
export function resolveNotificationHref(
  deepLinkPath: string,
  credentials?: NotificationNavigationCredentials
): Href {
  const trimmed = deepLinkPath.trim();
  const [pathname, queryString = ""] = trimmed.split("?");
  const queryParams = Object.fromEntries(new URLSearchParams(queryString));

  if (pathname === "/checkout/success") {
    return {
      pathname: "/checkout/success",
      params: appendCredentials(queryParams, credentials),
    } as Href;
  }

  const orderMatch = pathname.match(/^\/order\/([^/?#]+)/);
  if (orderMatch) {
    const orderNumber = decodeURIComponent(orderMatch[1] ?? "");
    return {
      pathname: "/order/[id]",
      params: appendCredentials(
        {
          id: orderNumber,
          orderNumber,
          ...queryParams,
        },
        credentials
      ),
    } as Href;
  }

  return trimmed as Href;
}

export function resolveNotificationTargetHref(args: {
  parsed: PushNotificationData;
  deepLinkPath?: string | null;
  orderNumber?: string | null;
  credentials?: NotificationNavigationCredentials;
}): Href | null {
  const deepLinkPath = args.deepLinkPath ?? args.parsed.deepLinkPath;
  if (deepLinkPath) {
    return resolveNotificationHref(deepLinkPath, args.credentials);
  }

  const orderNumber = args.orderNumber ?? args.parsed.orderNumber;
  if (orderNumber) {
    return {
      pathname: "/order/[id]",
      params: appendCredentials(
        {
          id: orderNumber,
          orderNumber,
        },
        args.credentials
      ),
    } as Href;
  }

  return null;
}
