import { Ionicons } from "@expo/vector-icons";
import { formatCurrencyAmount } from "@ecommerce/shared";
import { Image } from "expo-image";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { radius, spacing, typography } from "@/constants/theme";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";
import type { Id } from "@convex/_generated/dataModel";

export type ReorderAvailableLine = {
  productId: Id<"products">;
  productName: string;
  color: string;
  quantity: number;
  requestedQuantity: number;
  currentPrice: number;
  currency: string;
  stock: number;
  imageUrl: string;
  colors: string[];
};

export type ReorderUnavailableLine = {
  productId: string;
  productName: string;
  color: string;
  reasonLabel: string;
};

type ReorderPreviewSheetProps = {
  visible: boolean;
  loading: boolean;
  available: ReorderAvailableLine[];
  unavailable: ReorderUnavailableLine[];
  onClose: () => void;
  onContinue: () => void;
};

function resolvePreviewTitle(args: {
  availableCount: number;
  unavailableCount: number;
  hasQuantityAdjustments: boolean;
}): string {
  if (args.availableCount === 0) {
    return "Nothing available to reorder";
  }
  if (args.unavailableCount > 0 && args.hasQuantityAdjustments) {
    return "Review your reorder";
  }
  if (args.unavailableCount > 0) {
    return "Some items won't be added";
  }
  if (args.hasQuantityAdjustments) {
    return "Quantities were updated";
  }
  return "Confirm your reorder";
}

export function ReorderPreviewSheet({
  visible,
  loading,
  available,
  unavailable,
  onClose,
  onContinue,
}: ReorderPreviewSheetProps) {
  const styles = useThemedStyles(createReorderPreviewSheetStyles);

  const quantityAdjustedItems = available.filter(
    (item) => item.quantity < item.requestedQuantity
  );
  const hasQuantityAdjustments = quantityAdjustedItems.length > 0;
  const availableCount = available.reduce((sum, item) => sum + item.quantity, 0);
  const title = resolvePreviewTitle({
    availableCount: available.length,
    unavailableCount: unavailable.length,
    hasQuantityAdjustments,
  });

  const continueLabel =
    available.length === 0
      ? "Back to order"
      : loading
        ? "Adding to cart…"
        : `Add ${availableCount} item${availableCount === 1 ? "" : "s"} to cart`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!loading) onClose();
      }}
    >
      <Pressable
        style={styles.overlay}
        onPress={() => {
          if (!loading) onClose();
        }}
      >
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.handle} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sheetContent}
            bounces={false}
          >
            <View style={styles.headerIcon}>
              <Ionicons
                name={available.length === 0 ? "alert-circle-outline" : "bag-handle-outline"}
                size={28}
                color={styles.headerIconTint.color}
              />
            </View>

            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>
              {available.length === 0
                ? "Every item from this order is unavailable right now. Promotional gifts and out-of-stock products cannot be reordered."
                : "Prices reflect current catalog pricing. You'll review everything again at checkout."}
            </Text>

            {available.length > 0 ? (
              <>
                <Text style={styles.sectionLabel}>Adding to cart</Text>
                <View style={styles.itemList}>
                  {available.map((item) => {
                    const adjusted = item.quantity < item.requestedQuantity;
                    return (
                      <View key={`${item.productId}-${item.color}`} style={styles.itemRow}>
                        <View style={styles.itemImageWrap}>
                          {item.imageUrl ? (
                            <Image
                              source={{ uri: item.imageUrl }}
                              style={styles.itemImage}
                              contentFit="cover"
                            />
                          ) : (
                            <View style={styles.itemImagePlaceholder}>
                              <Ionicons name="image-outline" size={18} color={styles.placeholderIcon.color} />
                            </View>
                          )}
                        </View>
                        <View style={styles.itemDetails}>
                          <Text style={styles.itemName} numberOfLines={2}>
                            {item.productName}
                          </Text>
                          <Text style={styles.itemMeta}>
                            {item.color ? `${item.color} · ` : ""}
                            Qty {item.quantity}
                            {adjusted
                              ? ` (requested ${item.requestedQuantity}, limited by stock)`
                              : ""}
                          </Text>
                          <Text style={styles.itemPrice}>
                            {formatCurrencyAmount(item.currentPrice * item.quantity, item.currency)}
                          </Text>
                        </View>
                        <Ionicons name="checkmark-circle" size={20} color={styles.checkIcon.color} />
                      </View>
                    );
                  })}
                </View>
              </>
            ) : null}

            {unavailable.length > 0 ? (
              <>
                <Text style={styles.sectionLabel}>Won't be added</Text>
                <View style={styles.unavailableList}>
                  {unavailable.map((item) => (
                    <View key={`${item.productId}-${item.color}-skip`} style={styles.unavailableRow}>
                      <Ionicons name="close-circle-outline" size={18} color={styles.unavailableIcon.color} />
                      <View style={styles.unavailableText}>
                        <Text style={styles.unavailableName} numberOfLines={2}>
                          {item.productName}
                          {item.color ? ` (${item.color})` : ""}
                        </Text>
                        <Text style={styles.unavailableReason}>{item.reasonLabel}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            {available.length > 0 ? (
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={18} color={styles.infoIcon.color} />
                <Text style={styles.infoText}>
                  Promotional gifts are not included in reorders. Any paid items that are still in
                  stock will be added at today's prices.
                </Text>
              </View>
            ) : null}

            <Button
              label={continueLabel}
              fullWidth
              loading={loading}
              disabled={loading}
              onPress={available.length === 0 ? onClose : onContinue}
              accessibilityLabel={continueLabel}
            />

            {available.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Not now"
                accessibilityState={{ disabled: loading, busy: loading }}
                disabled={loading}
                onPress={onClose}
                style={({ pressed }) => [
                  styles.dismissLink,
                  pressed && styles.dismissLinkPressed,
                  loading && styles.dismissLinkDisabled,
                ]}
              >
                <Text style={styles.dismissLinkText}>Not now</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createReorderPreviewSheetStyles({ colors }: ThemeStyleTokens) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "flex-end",
    },
    sheet: {
      maxHeight: "88%",
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderBottomWidth: 0,
    },
    handle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: radius.full,
      backgroundColor: colors.border,
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
    },
    sheetContent: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing["2xl"],
      gap: spacing.md,
    },
    headerIcon: {
      alignSelf: "center",
      width: 56,
      height: 56,
      borderRadius: radius.full,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primaryMuted,
      marginTop: spacing.sm,
    },
    headerIconTint: {
      color: colors.primary,
    },
    title: {
      fontSize: typography.xl,
      fontWeight: "800",
      color: colors.foreground,
      textAlign: "center",
    },
    message: {
      fontSize: typography.sm,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
    },
    sectionLabel: {
      fontSize: typography.sm,
      fontWeight: "700",
      color: colors.foreground,
      marginTop: spacing.xs,
    },
    itemList: {
      gap: spacing.sm,
    },
    itemRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    itemImageWrap: {
      width: 52,
      height: 52,
      borderRadius: radius.md,
      overflow: "hidden",
      backgroundColor: colors.surfaceSecondary,
    },
    itemImage: {
      width: "100%",
      height: "100%",
    },
    itemImagePlaceholder: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    placeholderIcon: {
      color: colors.muted,
    },
    itemDetails: {
      flex: 1,
      gap: 2,
    },
    itemName: {
      fontSize: typography.sm,
      fontWeight: "600",
      color: colors.foreground,
    },
    itemMeta: {
      fontSize: typography.xs,
      color: colors.textSecondary,
      lineHeight: 16,
    },
    itemPrice: {
      fontSize: typography.sm,
      fontWeight: "700",
      color: colors.foreground,
    },
    checkIcon: {
      color: colors.success,
    },
    unavailableList: {
      gap: spacing.sm,
      backgroundColor: colors.destructiveMuted,
      borderRadius: radius.lg,
      padding: spacing.md,
    },
    unavailableRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
    },
    unavailableIcon: {
      color: colors.destructive,
      marginTop: 2,
    },
    unavailableText: {
      flex: 1,
      gap: 2,
    },
    unavailableName: {
      fontSize: typography.sm,
      fontWeight: "600",
      color: colors.foreground,
    },
    unavailableReason: {
      fontSize: typography.xs,
      color: colors.textSecondary,
      lineHeight: 16,
    },
    infoBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
      backgroundColor: colors.primaryMuted,
      borderRadius: radius.md,
      padding: spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "rgba(98, 84, 243, 0.2)",
    },
    infoIcon: {
      color: colors.primary,
    },
    infoText: {
      flex: 1,
      fontSize: typography.sm,
      color: colors.foreground,
      lineHeight: 18,
    },
    dismissLink: {
      alignItems: "center",
      paddingVertical: spacing.md,
    },
    dismissLinkPressed: {
      opacity: 0.75,
    },
    dismissLinkDisabled: {
      opacity: 0.5,
    },
    dismissLinkText: {
      fontSize: typography.sm,
      fontWeight: "600",
      color: colors.textSecondary,
    },
  });
}
