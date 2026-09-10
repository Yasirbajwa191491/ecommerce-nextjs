import { useQuery } from "convex/react";
import { useCallback, useEffect, useState } from "react";

import {
  loadCheckoutCustomer,
  loadLastOrderInfo,
  loadPushEnrollmentProof,
} from "@/lib/checkout-customer-storage";
import { api } from "@/lib/convex-api";
import { useVisitorId } from "@/lib/visitor-id";
import { usePushNotificationContextOptional } from "@/providers/PushNotificationProvider";

export type NotificationAccessProof = {
  customerEmail: string;
  visitorId: string;
  accessToken?: string;
};

export function useNotificationCenterAccess() {
  const visitorId = useVisitorId();
  const push = usePushNotificationContextOptional();
  const [proof, setProof] = useState<NotificationAccessProof | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const [customer, enrollmentProof, lastOrder] = await Promise.all([
      loadCheckoutCustomer(),
      loadPushEnrollmentProof(),
      loadLastOrderInfo(),
    ]);

    const customerEmail =
      customer?.email?.trim().toLowerCase() ??
      enrollmentProof?.email?.trim().toLowerCase() ??
      lastOrder.email?.trim().toLowerCase() ??
      null;

    if (!customerEmail || !visitorId) {
      setProof(null);
      setReady(true);
      return null;
    }

    const accessToken =
      enrollmentProof?.accessToken?.trim() ??
      lastOrder.accessToken?.trim() ??
      undefined;

    const nextProof: NotificationAccessProof = {
      customerEmail,
      visitorId,
      accessToken,
    };
    setProof(nextProof);
    setReady(true);
    return nextProof;
  }, [visitorId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const clearProof = useCallback(() => {
    setProof(null);
    setReady(false);
  }, []);

  const pushVerified =
    push?.permission === "granted" && Boolean(push.expoPushToken);
  const verified = Boolean(proof && (proof.accessToken || pushVerified));

  return { proof, ready, verified, refresh, clearProof };
}

export function useUnreadNotificationCount() {
  const { proof, ready, verified } = useNotificationCenterAccess();

  const unread = useQuery(
    api.inAppNotifications.getUnreadCount,
    ready && verified && proof
      ? {
          customerEmail: proof.customerEmail,
          visitorId: proof.visitorId,
          accessToken: proof.accessToken,
        }
      : "skip"
  );

  return {
    ready,
    count: unread?.count ?? 0,
    capped: unread?.capped ?? false,
    hasAccess: verified,
  };
}
