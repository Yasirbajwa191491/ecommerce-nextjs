import { APP_NAME } from "@ecommerce/shared";
import {
  PaymentSheetError,
  useStripe,
  type PaymentSheet,
} from "@stripe/stripe-react-native";
import * as Linking from "expo-linking";
import { useCallback } from "react";

import type { ColorPalette } from "@/constants/theme";
import { useTheme } from "@/providers/theme-context";

export type PaymentSheetCustomerDetails = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
};

export type PaymentSheetCheckoutResult =
  | { type: "completed" }
  | { type: "canceled" }
  | { type: "init_failed"; message: string }
  | { type: "failed"; message: string };

function mapPaymentSheetError(error: { code: PaymentSheetError; message: string }): string {
  if (error.code === PaymentSheetError.Canceled) {
    return "Payment was cancelled.";
  }
  if (error.code === PaymentSheetError.Timeout) {
    return "Payment timed out. Please try again.";
  }
  return error.message || "Payment could not be completed. Please try again.";
}

function buildPaymentSheetAppearance(
  colors: ColorPalette,
  isDark: boolean
): PaymentSheet.AppearanceParams {
  const appearanceColors: PaymentSheet.AppearanceParams["colors"] = {
    primary: colors.cta,
    background: colors.background,
    componentBackground: colors.surface,
    componentBorder: colors.border,
    componentDivider: colors.borderLight,
    primaryText: colors.ctaForeground,
    secondaryText: colors.textSecondary,
    componentText: colors.foreground,
    placeholderText: colors.muted,
    icon: colors.foreground,
    error: colors.destructive,
  };

  return {
    colors: {
      light: appearanceColors,
      dark: appearanceColors,
    },
    shapes: {
      borderRadius: 12,
      borderWidth: 1,
    },
  };
}

export function usePaymentSheetCheckout() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { colors, isDark } = useTheme();

  const presentPayment = useCallback(
    async (
      clientSecret: string,
      customer: PaymentSheetCustomerDetails
    ): Promise<PaymentSheetCheckoutResult> => {
      const returnURL = Linking.createURL("stripe-redirect");

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: APP_NAME,
        paymentIntentClientSecret: clientSecret,
        returnURL,
        style: isDark ? "alwaysDark" : "alwaysLight",
        defaultBillingDetails: {
          name: customer.fullName.trim(),
          email: customer.email.trim(),
          phone: customer.phone.trim(),
          address: {
            line1: customer.address.trim(),
          },
        },
        appearance: buildPaymentSheetAppearance(colors, isDark),
        allowsDelayedPaymentMethods: false,
      });

      if (initError) {
        return { type: "init_failed", message: mapPaymentSheetError(initError) };
      }

      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code === PaymentSheetError.Canceled) {
          return { type: "canceled" };
        }
        return { type: "failed", message: mapPaymentSheetError(presentError) };
      }

      return { type: "completed" };
    },
    [colors, initPaymentSheet, isDark, presentPaymentSheet]
  );

  return { presentPayment };
}
