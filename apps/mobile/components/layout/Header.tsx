import { APP_NAME } from "@ecommerce/shared";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CartBadge } from "@/components/layout/CartBadge";
import { SearchBar } from "@/components/ui/SearchBar";
import { colors, sizes, spacing, textStyles } from "@/constants/theme";
import { useLayoutMetrics } from "@/hooks/useLayoutMetrics";

type HeaderProps = {
  title?: string;
  subtitle?: string;
  showSearch?: boolean;
  showCart?: boolean;
  showBack?: boolean;
  showLogo?: boolean;
  onBack?: () => void;
};

export function Header({
  title,
  subtitle,
  showSearch = true,
  showCart = true,
  showBack = false,
  showLogo = false,
  onBack,
}: HeaderProps) {
  const insets = useSafeAreaInsets();
  const { horizontalPadding } = useLayoutMetrics();

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
            accessibilityLabel="Go back"
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

        {showCart ? (
          <CartBadge onPress={() => router.push("/cart")} />
        ) : (
          <View style={styles.iconSpacer} />
        )}
      </View>

      {showSearch ? (
        <View style={styles.searchRow}>
          <SearchBar />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
  logo: {
    flex: 1,
    ...textStyles.logo,
  },
  titleBlock: {
    flex: 1,
    gap: 1,
  },
  titleWithBack: {
    paddingLeft: spacing.xs,
  },
  title: {
    ...textStyles.screenTitle,
    fontSize: 22,
  },
  subtitle: {
    ...textStyles.bodySmall,
  },
  flex: {
    flex: 1,
  },
  iconButton: {
    width: sizes.qtyControl,
    height: sizes.qtyControl,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -8,
  },
  iconSpacer: {
    width: sizes.qtyControl,
  },
  searchRow: {
    width: "100%",
  },
});
