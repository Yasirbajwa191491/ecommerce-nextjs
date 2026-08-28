import { APP_NAME } from "@ecommerce/shared";
import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CartBadge } from "@/components/layout/CartBadge";
import { SearchBar } from "@/components/ui/SearchBar";
import { sizes, spacing } from "@/constants/theme";
import { useLayoutMetrics } from "@/hooks/useLayoutMetrics";
import { strings } from "@/lib/i18n/strings";
import { useProductCompareOptional } from "@/providers/compare-context";
import { useTheme } from "@/providers/theme-context";

type HeaderProps = {
  title?: string;
  subtitle?: string;
  showSearch?: boolean;
  showCart?: boolean;
  showBack?: boolean;
  showLogo?: boolean;
  showWishlist?: boolean;
  showCompare?: boolean;
  showSettings?: boolean;
  onBack?: () => void;
};

export function Header({
  title,
  subtitle,
  showSearch = true,
  showCart = true,
  showBack = false,
  showLogo = false,
  showWishlist = false,
  showCompare = false,
  showSettings = false,
  onBack,
}: HeaderProps) {
  const insets = useSafeAreaInsets();
  const { horizontalPadding } = useLayoutMetrics();
  const compare = useProductCompareOptional();
  const { colors, textStyles } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          backgroundColor: colors.surface,
          paddingBottom: spacing.sm,
          gap: spacing.sm,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.borderLight,
        },
        topRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: sizes.headerRow,
        },
        logo: { flex: 1, ...textStyles.logo },
        titleBlock: { flex: 1, gap: 1 },
        titleWithBack: { paddingLeft: spacing.xs },
        title: { ...textStyles.screenTitle, fontSize: 22 },
        subtitle: { ...textStyles.bodySmall },
        flex: { flex: 1 },
        iconButton: {
          width: sizes.qtyControl,
          height: sizes.qtyControl,
          alignItems: "center",
          justifyContent: "center",
          marginLeft: -8,
        },
        actions: {
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.xs,
        },
        compareBadge: {
          position: "absolute",
          top: 2,
          right: 2,
          minWidth: 16,
          height: 16,
          borderRadius: 8,
          backgroundColor: colors.cta,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 4,
        },
        compareBadgeText: {
          fontSize: 10,
          fontWeight: "700",
          color: colors.ctaForeground,
        },
        searchRow: { width: "100%" },
      }),
    [colors, textStyles]
  );

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + spacing.xs, paddingHorizontal: horizontalPadding },
      ]}
    >
      <View style={styles.topRow}>
        {showBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.common.goBack}
            hitSlop={8}
            onPress={onBack ?? (() => router.back())}
            style={styles.iconButton}
          >
            <Ionicons name="chevron-back" size={sizes.iconLg} color={colors.foreground} />
          </Pressable>
        ) : null}

        {showLogo ? (
          <Text style={styles.logo} numberOfLines={1}>
            {APP_NAME}
          </Text>
        ) : title ? (
          <View style={[styles.titleBlock, showBack && styles.titleWithBack]}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.flex} />
        )}

        <View style={styles.actions}>
          {showSettings ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={strings.accessibility.openSettings}
              hitSlop={8}
              onPress={() => router.push("/settings" as Href)}
              style={styles.iconButton}
            >
              <Ionicons name="settings-outline" size={sizes.iconMd} color={colors.foreground} />
            </Pressable>
          ) : null}
          {showWishlist ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={strings.accessibility.openWishlist}
              hitSlop={8}
              onPress={() => router.push("/wishlist" as Href)}
              style={styles.iconButton}
            >
              <Ionicons name="heart-outline" size={sizes.iconMd} color={colors.foreground} />
            </Pressable>
          ) : null}
          {showCompare ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open product compare${compare?.compareCount ? `, ${compare.compareCount} products` : ""}`}
              hitSlop={8}
              onPress={() => compare?.openCompare()}
              style={styles.iconButton}
            >
              <Ionicons name="swap-horizontal-outline" size={sizes.iconMd} color={colors.foreground} />
              {compare && compare.compareCount > 0 ? (
                <View style={styles.compareBadge}>
                  <Text style={styles.compareBadgeText}>{compare.compareCount}</Text>
                </View>
              ) : null}
            </Pressable>
          ) : null}
          {showCart ? (
            <CartBadge onPress={() => router.push("/cart")} color={colors.foreground} />
          ) : null}
        </View>
      </View>

      {showSearch ? (
        <View style={styles.searchRow}>
          <SearchBar />
        </View>
      ) : null}
    </View>
  );
}
