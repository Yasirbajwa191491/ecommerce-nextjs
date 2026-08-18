import { APP_NAME } from "@ecommerce/shared";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CartBadge } from "@/components/layout/CartBadge";
import { SearchBar } from "@/components/ui/SearchBar";
import { colors, spacing, textStyles } from "@/constants/theme";
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
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </Pressable>
        ) : showLogo ? (
          <Text style={styles.logo} numberOfLines={1}>
            {APP_NAME}
          </Text>
        ) : title ? (
          <View style={styles.titleBlock}>
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
    paddingBottom: spacing.sm + 2,
    gap: spacing.sm + 2,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 40,
  },
  logo: {
    flex: 1,
    ...textStyles.logo,
  },
  titleBlock: {
    flex: 1,
    gap: 1,
  },
  title: {
    ...textStyles.screenTitle,
  },
  subtitle: {
    ...textStyles.bodySmall,
  },
  flex: {
    flex: 1,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -8,
  },
  iconSpacer: {
    width: 44,
  },
  searchRow: {
    width: "100%",
  },
});
