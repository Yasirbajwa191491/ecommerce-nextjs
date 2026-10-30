import { useQuery } from "convex/react";
import { useCallback, useEffect, useState } from "react";

import {
  loadCheckoutCustomer,
  loadLastOrderInfo,
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
    const [customer, enrollmentProof, lastOrder] = await Promise.all([
      loadCheckoutCustomer(),
      loadPushEnrollmentProof(),
      loadLastOrderInfo(),
    ]);

    const customerEmail =
      (enrollmentProof?.mailboxVerified ? enrollmentProof.email.trim().toLowerCase() : undefined) ??
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
    const timer = setTimeout(() => {
      void refresh();
    }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  const clearProof = useCallback(() => {
    setProof(null);
    setReady(false);
  }, []);

  const accessAllowed = useQuery(
    api.inAppNotifications.checkCustomerAccess,
    ready && proof ? proof : "skip"
  );
  const verified = accessAllowed === true;

  return { proof, ready: ready && (!proof || accessAllowed !== undefined), verified, refresh, clearProof };
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
