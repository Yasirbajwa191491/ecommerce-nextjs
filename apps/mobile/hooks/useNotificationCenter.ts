import { useQuery } from "convex/react";
import { useCallback, useEffect, useState } from "react";

import {
  loadCheckoutCustomer,
  loadPushEnrollmentProof,
} from "@/lib/checkout-customer-storage";
import { api } from "@/lib/convex-api";
import { useVisitorId } from "@/lib/visitor-id";

export type NotificationAccessProof = {
  customerEmail: string;
  visitorId: string;
  accessToken?: string;
};

export function useNotificationCenterAccess() {
  const visitorId = useVisitorId();
  const [proof, setProof] = useState<NotificationAccessProof | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const [customer, enrollmentProof] = await Promise.all([
      loadCheckoutCustomer(),
      loadPushEnrollmentProof(),
    ]);

    const customerEmail =
      customer?.email?.trim().toLowerCase() ??
      enrollmentProof?.email?.trim().toLowerCase() ??
      null;

    if (!customerEmail || !visitorId) {
      setProof(null);
      setReady(true);
      return null;
    }

    const nextProof: NotificationAccessProof = {
      customerEmail,
      visitorId,
      accessToken: enrollmentProof?.accessToken ?? undefined,
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

  return { proof, ready, refresh, clearProof };
}

export function useUnreadNotificationCount() {
  const { proof, ready } = useNotificationCenterAccess();

  const unread = useQuery(
    api.inAppNotifications.getUnreadCount,
    proof
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
    hasAccess: Boolean(proof),
  };
}
