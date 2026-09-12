import {
  loadCheckoutCustomer,
  loadLastOrderInfo,
  loadPushEnrollmentProof,
} from "@/lib/checkout-customer-storage";

export type PushEnrollmentCredentials = {
  customerEmail: string;
  accessToken?: string;
};

/** Resolve the email + order proof used to register this device for push. */
export async function resolvePushEnrollmentCredentials(): Promise<PushEnrollmentCredentials | null> {
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

  if (!customerEmail) {
    return null;
  }

  const accessToken =
    enrollmentProof?.accessToken?.trim() ??
    lastOrder.accessToken?.trim() ??
    undefined;

  return {
    customerEmail,
    accessToken,
  };
}
