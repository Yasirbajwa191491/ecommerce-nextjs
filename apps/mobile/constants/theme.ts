import { BRAND } from "@ecommerce/shared";
import { Platform, TextStyle } from "react-native";

/** Semantic color palette — use via `useTheme().colors`, not raw hex in components. */
export type ColorPalette = {
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceSecondary: string;
  foreground: string;
  text: string;
  textSecondary: string;
  muted: string;
  mutedForeground: string;
  border: string;
  borderLight: string;
  cta: string;
  ctaForeground: string;
  ctaPressed: string;
  ctaMuted: string;
  selected: string;
  selectedForeground: string;
  selectedMuted: string;
  chipBackground: string;
  primary: string;
  primaryForeground: string;
  primaryText: string;
  primaryMuted: string;
  primarySubtle: string;
  navy: string;
  accent: string;
  destructive: string;
  destructiveForeground: string;
  destructiveMuted: string;
  discount: string;
  discountMuted: string;
  success: string;
  successMuted: string;
  warning: string;
  warningMuted: string;
  overlay: string;
  scrim: string;
};

export const lightColors: ColorPalette = {
  background: "#F7F8FA",
  surface: "#FFFFFF",
  surfaceElevated: "#FFFFFF",
  surfaceSecondary: "#F3F4F6",
  foreground: "#111827",
  text: "#374151",
  textSecondary: "#6B7280",
  muted: "#9CA3AF",
  mutedForeground: "#D1D5DB",
  border: "#E8EAED",
  borderLight: "#F0F1F3",
  cta: "#111827",
  ctaForeground: "#FFFFFF",
  ctaPressed: "#1F2937",
  ctaMuted: "rgba(17, 24, 39, 0.06)",
  selected: "#111827",
  selectedForeground: "#FFFFFF",
  selectedMuted: "rgba(17, 24, 39, 0.08)",
  chipBackground: "#F3F4F6",
  primary: BRAND.primary,
  primaryForeground: "#FFFFFF",
  primaryText: "#FFFFFF",
  primaryMuted: "rgba(98, 84, 243, 0.08)",
  primarySubtle: "rgba(98, 84, 243, 0.12)",
  navy: BRAND.navy,
  accent: BRAND.accent,
  destructive: "#EF4444",
  destructiveForeground: "#FFFFFF",
  destructiveMuted: "#FEE2E2",
  discount: "#DC2626",
  discountMuted: "#FEF2F2",
  success: "#10B981",
  successMuted: "#D1FAE5",
  warning: "#F59E0B",
  warningMuted: "#FFFBEB",
  overlay: "rgba(17, 24, 39, 0.5)",
  scrim: "rgba(0, 0, 0, 0.04)",
};

export const darkColors: ColorPalette = {
  background: "#0F1117",
  surface: "#1A1D24",
  surfaceElevated: "#22262E",
  surfaceSecondary: "#242830",
  foreground: "#F3F4F6",
  text: "#D1D5DB",
  textSecondary: "#9CA3AF",
  muted: "#6B7280",
  mutedForeground: "#4B5563",
  border: "#2D323B",
  borderLight: "#252930",
  cta: "#F3F4F6",
  ctaForeground: "#111827",
  ctaPressed: "#E5E7EB",
  ctaMuted: "rgba(243, 244, 246, 0.08)",
  selected: "#F3F4F6",
  selectedForeground: "#111827",
  selectedMuted: "rgba(243, 244, 246, 0.1)",
  chipBackground: "#242830",
  primary: BRAND.primary,
  primaryForeground: "#FFFFFF",
  primaryText: "#FFFFFF",
  primaryMuted: "rgba(98, 84, 243, 0.18)",
  primarySubtle: "rgba(98, 84, 243, 0.24)",
  navy: BRAND.navy,
  accent: BRAND.accent,
  destructive: "#F87171",
  destructiveForeground: "#FFFFFF",
  destructiveMuted: "rgba(248, 113, 113, 0.15)",
  discount: "#FCA5A5",
  discountMuted: "rgba(252, 165, 165, 0.12)",
  success: "#34D399",
  successMuted: "rgba(52, 211, 153, 0.15)",
  warning: "#FBBF24",
  warningMuted: "rgba(251, 191, 36, 0.15)",
  overlay: "rgba(0, 0, 0, 0.65)",
  scrim: "rgba(255, 255, 255, 0.04)",
};

/** @deprecated Use `useTheme().colors` for theme-aware colors. */
export const colors = lightColors;

export type ColorScheme = "light" | "dark";
export type ThemePreference = "light" | "dark" | "system";

export function getColors(scheme: ColorScheme): ColorPalette {
  return scheme === "dark" ? darkColors : lightColors;
}

export function resolveColorScheme(
  preference: ThemePreference,
  systemScheme: ColorScheme | null | undefined
): ColorScheme {
  if (preference === "system") {
    return systemScheme === "dark" ? "dark" : "light";
  }
  return preference;
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
} as const;

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const typography = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 28,
  "4xl": 32,
} as const;

export const fontWeight = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
  extrabold: "800" as const,
};

export function createTextStyles(palette: ColorPalette): Record<string, TextStyle> {
  return {
    display: {
      fontSize: 32,
      fontWeight: "700",
      color: palette.foreground,
      letterSpacing: -0.6,
    },
    screenTitle: {
      fontSize: typography["2xl"],
      fontWeight: "600",
      color: palette.foreground,
      letterSpacing: -0.4,
    },
    sectionTitle: {
      fontSize: typography.lg,
      fontWeight: "600",
      color: palette.foreground,
      letterSpacing: -0.2,
    },
    cardTitle: {
      fontSize: typography.sm,
      fontWeight: "500",
      color: palette.foreground,
      lineHeight: 18,
    },
    body: {
      fontSize: typography.base,
      fontWeight: "400",
      color: palette.text,
      lineHeight: 22,
    },
    bodySmall: {
      fontSize: typography.sm,
      fontWeight: "400",
      color: palette.textSecondary,
      lineHeight: 20,
    },
    caption: {
      fontSize: typography.xs,
      fontWeight: "500",
      color: palette.muted,
      letterSpacing: 0.2,
    },
    price: {
      fontSize: typography.md,
      fontWeight: "700",
      color: palette.foreground,
    },
    priceSale: {
      fontSize: typography.md,
      fontWeight: "700",
      color: palette.discount,
    },
    priceLarge: {
      fontSize: typography["2xl"],
      fontWeight: "800",
      color: palette.foreground,
      letterSpacing: -0.5,
    },
    priceLargeSale: {
      fontSize: typography["2xl"],
      fontWeight: "800",
      color: palette.discount,
      letterSpacing: -0.5,
    },
    priceStrike: {
      fontSize: typography.sm,
      fontWeight: "400",
      color: palette.muted,
      textDecorationLine: "line-through",
    },
    badge: {
      fontSize: typography.xs,
      fontWeight: "600",
      letterSpacing: 0.2,
    },
    logo: {
      fontSize: typography.lg,
      fontWeight: "600",
      color: palette.foreground,
      letterSpacing: -0.3,
    },
  };
}

/** Minimum tap area for interactive controls. */
export const touchTarget = 44;

/** Shared control heights, icon sizes, and card metrics. */
export const sizes = {
  buttonSm: 40,
  buttonMd: 48,
  buttonLg: 52,
  input: 48,
  search: 48,
  chip: 40,
  iconSm: 16,
  iconMd: 20,
  iconLg: 24,
  iconXl: 28,
  qtyControl: 44,
  headerRow: 44,
} as const;

export const layout = {
  maxContentWidth: 480,
  gridColumns: 2,
  screenPadding: spacing.xl,
  sectionSpacing: spacing["2xl"],
  cardRadius: radius.md,
  carouselCardWidthRatio: 0.74,
  featuredCarouselWidthRatio: 0.82,
  categoryCardWidth: 132,
  categoryImageHeight: 88,
  productImageAspect: 4 / 3,
} as const;

function platformShadow(args: {
  offsetY: number;
  radius: number;
  opacity: number;
  elevation: number;
}) {
  return Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: args.offsetY },
      shadowOpacity: args.opacity,
      shadowRadius: args.radius,
    },
    android: { elevation: args.elevation },
    // react-native-web: shadow* props are deprecated in favor of boxShadow.
    default: {
      boxShadow: `0px ${args.offsetY}px ${args.radius}px rgba(0,0,0,${args.opacity})`,
    },
  });
}

export function createShadows(scheme: ColorScheme) {
  const isDark = scheme === "dark";
  return {
    sm: platformShadow({
      offsetY: 1,
      radius: 3,
      opacity: isDark ? 0.2 : 0.04,
      elevation: isDark ? 2 : 1,
    }),
    card: platformShadow({
      offsetY: 2,
      radius: 6,
      opacity: isDark ? 0.3 : 0.05,
      elevation: isDark ? 3 : 2,
    }),
    md: platformShadow({
      offsetY: 4,
      radius: 12,
      opacity: isDark ? 0.35 : 0.08,
      elevation: isDark ? 6 : 4,
    }),
    tabBar: platformShadow({
      offsetY: -2,
      radius: 8,
      opacity: isDark ? 0.25 : 0.06,
      elevation: 8,
    }),
  } as const;
}

export const shadows = createShadows("light");

export const animation = {
  pressScale: 0.97,
  durationFast: 120,
} as const;

/** Static light text styles — prefer `useTheme().textStyles` in components. */
export const textStyles = createTextStyles(lightColors);

export const theme = {
  colors: lightColors,
  spacing,
  radius,
  typography,
  fontWeight,
  textStyles,
  touchTarget,
  sizes,
  shadows,
  layout,
  animation,
} as const;

export type Theme = typeof theme;
