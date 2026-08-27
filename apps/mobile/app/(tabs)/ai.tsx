import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { SearchBarInput } from "@/components/ui/SearchBar";
import {
  createTextStyles,
  radius,
  sizes,
  spacing,
  typography,
  type ColorPalette,
} from "@/constants/theme";
import { useLayoutMetrics } from "@/hooks/useLayoutMetrics";
import { useScreenRootStyle } from "@/hooks/useScreenStyles";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { OfflineNotice } from "@/components/feedback/OfflineNotice";
import { refreshNetworkSnapshot } from "@/lib/network";
import { useTheme } from "@/providers/theme-context";

const PROMPTS: { label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: "Find me running shoes under $100", icon: "walk-outline" },
  { label: "Show me something for a home office", icon: "desktop-outline" },
  { label: "Find a gift for my friend", icon: "gift-outline" },
  { label: "What's on sale right now?", icon: "pricetag-outline" },
];

export default function AiScreen() {
  const { productId, productName, context, orderNumber, q } = useLocalSearchParams<{
    productId?: string;
    productName?: string;
    context?: string;
    orderNumber?: string;
    q?: string;
  }>();
  const insets = useSafeAreaInsets();
  const { horizontalPadding } = useLayoutMetrics();
  const rootStyle = useScreenRootStyle();
  const { colors, textStyles } = useTheme();
  const styles = useMemo(
    () => createStyles(colors, textStyles),
    [colors, textStyles]
  );
  const isOnline = useOnlineStatus();
  const isOrderContext = context === "order_tracking";
  const [query, setQuery] = useState(typeof q === "string" ? q : "");

  const submitQuery = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (!isOnline) return;
    const contextBits = [
      productName ? `product:${productName}` : null,
      isOrderContext && orderNumber ? `order:${orderNumber}` : null,
    ].filter(Boolean);
    const q = contextBits.length > 0 ? `${trimmed} ${contextBits.join(" ")}` : trimmed;
    router.push({ pathname: "/search", params: { q } });
  };

  return (
    <ScreenContainer>
      <View style={[styles.container, rootStyle]}>
        <Header title="Product search" showSearch={false} />

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 8 : 0}
        >
          <ScrollView
            contentContainerStyle={[
              styles.content,
              {
                paddingHorizontal: horizontalPadding,
                paddingBottom: insets.bottom + spacing["2xl"],
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Ionicons name="sparkles" size={sizes.iconXl} color={colors.primary} />
            </View>
            <Text style={styles.heroTitle}>
              {isOrderContext ? "Search related to your order" : "What are you shopping for?"}
            </Text>
            <Text style={styles.heroSub}>
              {productName
                ? `Search for products related to "${productName}".`
                : isOrderContext
                  ? orderNumber
                    ? `Search the catalog for items related to order ${orderNumber}.`
                    : "Search the catalog for replacements and related products."
                  : "Describe what you need in everyday language. We'll search the catalog."}
            </Text>
          </View>

          {!isOnline ? (
            <OfflineNotice
              title="Product search is unavailable offline."
              message="Reconnect to search the catalog."
              onRetry={() => void refreshNetworkSnapshot()}
            />
          ) : null}

          <SearchBarInput
            value={query}
            onChangeText={setQuery}
            placeholder="Describe what you need…"
            showVisualSearch={false}
            returnKeyType="search"
            onSubmitEditing={() => submitQuery(query)}
          />
            <Button
            label="Find products"
            size="lg"
            fullWidth
            disabled={!query.trim() || !isOnline}
            onPress={() => submitQuery(query)}
          />

          {productId ? (
            <View style={styles.contextCard}>
              <Ionicons name="cube-outline" size={18} color={colors.primary} />
              <Text style={styles.contextText} numberOfLines={2}>
                Asking about {productName ?? "this product"}
              </Text>
            </View>
          ) : null}

          {isOrderContext ? (
            <View style={styles.contextCard}>
              <Ionicons name="locate-outline" size={18} color={colors.primary} />
              <Text style={styles.contextText} numberOfLines={2}>
                Order help{orderNumber ? ` · ${orderNumber}` : ""}
              </Text>
            </View>
          ) : null}

          <Text style={styles.promptLabel}>Try asking</Text>
          <View style={styles.prompts}>
            {PROMPTS.map((prompt) => (
              <Pressable
                key={prompt.label}
                accessibilityRole="button"
                accessibilityLabel={prompt.label}
                onPress={() => submitQuery(prompt.label)}
                style={({ pressed }) => [styles.promptCard, pressed && styles.promptPressed]}
              >
                <View style={styles.promptIcon}>
                  <Ionicons name={prompt.icon} size={18} color={colors.primary} />
                </View>
                <Text style={styles.promptText}>{prompt.label}</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.muted} />
              </Pressable>
            ))}
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </ScreenContainer>
  );
}

function createStyles(
  colors: ColorPalette,
  textStyles: ReturnType<typeof createTextStyles>
) {
  return StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    gap: spacing.lg,
  },
  hero: {
    alignItems: "center",
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    ...textStyles.screenTitle,
    textAlign: "center",
  },
  heroSub: {
    fontSize: typography.base,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 340,
  },
  contextCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  contextText: {
    flex: 1,
    fontSize: typography.sm,
    color: colors.foreground,
    fontWeight: "500",
  },
  promptLabel: {
    ...textStyles.sectionTitle,
    fontSize: typography.base,
    marginTop: spacing.sm,
  },
  prompts: {
    gap: spacing.sm,
  },
  promptCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  promptPressed: {
    backgroundColor: colors.primaryMuted,
  },
  promptIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  promptText: {
    flex: 1,
    fontSize: typography.sm,
    fontWeight: "500",
    color: colors.foreground,
    lineHeight: 20,
  },
});
}
