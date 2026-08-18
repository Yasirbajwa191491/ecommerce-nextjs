import { BRAND } from "@ecommerce/shared";
import { Platform, TextStyle } from "react-native";

/** Premium mobile design tokens — restrained palette, consistent hierarchy. */
export const colors = {
  background: "#F7F8FA",
  surface: "#FFFFFF",
  surfaceElevated: "#FFFFFF",
  foreground: "#111827",
  text: "#374151",
  textSecondary: "#6B7280",
  muted: "#9CA3AF",
  mutedForeground: "#D1D5DB",
  border: "#E8EAED",
  borderLight: "#F0F1F3",
  primary: BRAND.primary,
  primaryForeground: "#FFFFFF",
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
  overlay: "rgba(17, 24, 39, 0.5)",
  scrim: "rgba(0, 0, 0, 0.04)",
} as const;

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
  lg: 18,
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

export const textStyles: Record<string, TextStyle> = {
  display: { fontSize: 32, fontWeight: fontWeight.bold, color: colors.foreground, letterSpacing: -0.6 },
  screenTitle: { fontSize: typography["2xl"], fontWeight: fontWeight.semibold, color: colors.foreground, letterSpacing: -0.4 },
  sectionTitle: { fontSize: typography.lg, fontWeight: fontWeight.semibold, color: colors.foreground, letterSpacing: -0.2 },
  cardTitle: { fontSize: typography.sm, fontWeight: fontWeight.medium, color: colors.foreground, lineHeight: 18 },
  body: { fontSize: typography.base, fontWeight: fontWeight.regular, color: colors.text, lineHeight: 22 },
  bodySmall: { fontSize: typography.sm, fontWeight: fontWeight.regular, color: colors.textSecondary, lineHeight: 20 },
  caption: { fontSize: typography.xs, fontWeight: fontWeight.medium, color: colors.muted, letterSpacing: 0.2 },
  price: { fontSize: typography.md, fontWeight: fontWeight.bold, color: colors.foreground },
  priceLarge: { fontSize: typography["2xl"], fontWeight: fontWeight.extrabold, color: colors.foreground, letterSpacing: -0.5 },
  priceStrike: { fontSize: typography.sm, fontWeight: fontWeight.regular, color: colors.muted, textDecorationLine: "line-through" },
  badge: { fontSize: typography.xs, fontWeight: fontWeight.semibold, letterSpacing: 0.2 },
  logo: { fontSize: typography.lg, fontWeight: fontWeight.semibold, color: colors.foreground, letterSpacing: -0.3 },
};

export const touchTarget = 44;

export const layout = {
  maxContentWidth: 480,
  gridColumns: 2,
  /** ~1.32 cards visible in horizontal carousels */
  carouselCardWidthRatio: 0.74,
  featuredCarouselWidthRatio: 0.76,
  categoryCardWidth: 132,
  categoryImageHeight: 88,
  productImageAspect: 1,
} as const;

export const shadows = {
  sm: Platform.select({
    ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3 },
    android: { elevation: 1 },
    default: {},
  }),
  card: Platform.select({
    ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
    android: { elevation: 2 },
    default: {},
  }),
  md: Platform.select({
    ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
    android: { elevation: 4 },
    default: {},
  }),
  tabBar: Platform.select({
    ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8 },
    android: { elevation: 8 },
    default: {},
  }),
} as const;

export const animation = {
  pressScale: 0.97,
  durationFast: 120,
} as const;

export const theme = {
  colors,
  spacing,
  radius,
  typography,
  fontWeight,
  textStyles,
  touchTarget,
  shadows,
  layout,
  animation,
} as const;

export type Theme = typeof theme;
