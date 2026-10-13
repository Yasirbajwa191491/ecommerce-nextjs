import { useCallback } from "react";
import type { PaymentSheetCheckoutResult } from "./usePaymentSheetCheckout";

export function usePaymentSheetCheckout() {
  const presentPayment = useCallback(async (): Promise<PaymentSheetCheckoutResult> => ({
    type: "init_failed",
    message: "Open the Android or iOS app to pay by card.",
  }), []);
  return { presentPayment };
}
