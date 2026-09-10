import { useEffect } from "react";

import {
  loadCheckoutCustomer,
  loadPushEnrollmentProof,
} from "@/lib/checkout-customer-storage";
import {
  clearMonitoringUserContext,
  setMonitoringUserContext,
} from "@/lib/monitoring/sentry";
import { useVisitorId } from "@/lib/visitor-id";

/** Keeps Sentry user context aligned with the current guest session. */
export function MonitoringUserContext() {
  const visitorId = useVisitorId();

  useEffect(() => {
    if (!visitorId) {
      clearMonitoringUserContext();
      return;
    }

    void (async () => {
      const [customer, enrollmentProof] = await Promise.all([
        loadCheckoutCustomer(),
        loadPushEnrollmentProof(),
      ]);

      const customerEmail =
        customer?.email?.trim().toLowerCase() ??
        enrollmentProof?.email?.trim().toLowerCase() ??
        null;

      setMonitoringUserContext({
        visitorId,
        customerEmail,
      });
    })();
  }, [visitorId]);

  return null;
}
