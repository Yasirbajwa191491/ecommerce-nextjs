import { APP_NAME } from "@ecommerce/shared";
import {
  PaymentSheetError,
  useStripe,
  type PaymentSheet,
} from "@stripe/stripe-react-native";
import * as Linking from "expo-linking";
import { useCallback, useMemo } from "react";

import {
  darkColors,
  lightColors,
  sizes,
  type ColorPalette,
  type ThemePreference,
} from "@/constants/theme";
import { logAppError } from "@/lib/errors";
import { addMonitoringBreadcrumb } from "@/lib/monitoring/sentry";
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

function buildGlobalColors(colors: ColorPalette): PaymentSheet.GlobalColorConfig {
  return {
    primary: colors.cta,
    background: colors.background,
    componentBackground: colors.surface,
    componentBorder: colors.border,
    componentDivider: colors.borderLight,
    primaryText: colors.foreground,
    secondaryText: colors.textSecondary,
    componentText: colors.foreground,
    placeholderText: colors.muted,
    icon: colors.foreground,
    error: colors.destructive,
  };
}

function buildPrimaryButtonColors(
  colors: ColorPalette
): PaymentSheet.PrimaryButtonColorConfig {
  return {
    background: colors.cta,
    text: colors.ctaForeground,
    border: colors.cta,
  };
}

function buildPaymentSheetAppearance(): PaymentSheet.AppearanceParams {
  return {
    colors: {
      light: buildGlobalColors(lightColors),
      dark: buildGlobalColors(darkColors),
    },
    shapes: {
      borderRadius: 12,
      borderWidth: 1,
    },
    primaryButton: {
      colors: {
        light: buildPrimaryButtonColors(lightColors),
        dark: buildPrimaryButtonColors(darkColors),
      },
      shapes: {
        borderRadius: 12,
        borderWidth: 0,
        height: sizes.buttonLg,
      },
    },
  };
}

function resolvePaymentSheetStyle(
  preference: ThemePreference,
  isDark: boolean
): "automatic" | "alwaysLight" | "alwaysDark" {
  if (preference === "system") return "automatic";
  return isDark ? "alwaysDark" : "alwaysLight";
}

export function usePaymentSheetCheckout() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { isDark, preference } = useTheme();
  const appearance = useMemo(() => buildPaymentSheetAppearance(), []);
  const paymentSheetStyle = useMemo(
    () => resolvePaymentSheetStyle(preference, isDark),
    [isDark, preference]
  );

  const presentPayment = useCallback(
    async (
      clientSecret: string,
      customer: PaymentSheetCustomerDetails
    ): Promise<PaymentSheetCheckoutResult> => {
      addMonitoringBreadcrumb("PaymentSheet initialized", "checkout");

      const returnURL = Linking.createURL("stripe-redirect");

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: APP_NAME,
        paymentIntentClientSecret: clientSecret,
        returnURL,
        style: paymentSheetStyle,
        defaultBillingDetails: {
          name: customer.fullName.trim(),
          email: customer.email.trim(),
          phone: customer.phone.trim(),
          address: {
            line1: customer.address.trim(),
          },
        },
        appearance,
        allowsDelayedPaymentMethods: false,
      });

      if (initError) {
        logAppError(initError, {
          segment: "payment-sheet-init",
          tags: { code: initError.code },
        });
        return { type: "init_failed", message: mapPaymentSheetError(initError) };
      }

      addMonitoringBreadcrumb("PaymentSheet presented", "checkout");

      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code === PaymentSheetError.Canceled) {
          addMonitoringBreadcrumb("PaymentSheet cancelled", "checkout");
          return { type: "canceled" };
        }

        logAppError(presentError, {
          segment: "payment-sheet-present",
          tags: { code: presentError.code },
        });
        return { type: "failed", message: mapPaymentSheetError(presentError) };
      }

      addMonitoringBreadcrumb("PaymentSheet completed", "checkout");
      return { type: "completed" };
    },
    [appearance, initPaymentSheet, paymentSheetStyle, presentPaymentSheet]
  );

  return { presentPayment };
}
