import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { radius, spacing, typography } from "@/constants/theme";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";

export const CANCELLATION_REASONS = [
  { value: "changed_mind", label: "Changed my mind", hint: "I no longer want these items" },
  { value: "ordered_by_mistake", label: "Ordered by mistake", hint: "Wrong items or duplicate order" },
  { value: "found_better_option", label: "Found a better option", hint: "Found a better price elsewhere" },
  { value: "delivery_too_long", label: "Delivery taking too long", hint: "Expected delivery is too late" },
  { value: "other", label: "Other", hint: "Something else" },
] as const;

type CancelOrderDialogProps = {
  visible: boolean;
  cancelling: boolean;
  selectedReason: string;
  onSelectReason: (value: string) => void;
  onKeepOrder: () => void;
  onConfirmCancel: () => void;
};

export function CancelOrderDialog({
  visible,
  cancelling,
  selectedReason,
  onSelectReason,
  onKeepOrder,
  onConfirmCancel,
}: CancelOrderDialogProps) {
  const styles = useThemedStyles(createCancelOrderDialogStyles);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!cancelling) onKeepOrder();
      }}
    >
      <Pressable
        style={styles.overlay}
        onPress={() => {
          if (!cancelling) onKeepOrder();
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
              <Ionicons name="alert-circle-outline" size={28} color={styles.headerIconTint.color} />
            </View>

            <Text style={styles.title}>Cancel this order?</Text>
            <Text style={styles.message}>
              If you cancel, reserved items will be released. Eligible card payments will be
              refunded to your original payment method.
            </Text>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={18} color={styles.infoIcon.color} />
              <Text style={styles.infoText}>
                This action cannot be undone once processing has started.
              </Text>
            </View>

            <Text style={styles.sectionLabel}>Why are you cancelling?</Text>
            <View style={styles.reasonList}>
              {CANCELLATION_REASONS.map((reason) => {
                const selected = selectedReason === reason.value;
                return (
                  <Pressable
                    key={reason.value}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={reason.label}
                    onPress={() => onSelectReason(reason.value)}
                    style={({ pressed }) => [
                      styles.reasonCard,
                      selected && styles.reasonCardSelected,
                      pressed && styles.reasonCardPressed,
                    ]}
                  >
                    <View style={[styles.radio, selected && styles.radioSelected]}>
                      {selected ? <View style={styles.radioDot} /> : null}
                    </View>
                    <View style={styles.reasonText}>
                      <Text style={[styles.reasonLabel, selected && styles.reasonLabelSelected]}>
                        {reason.label}
                      </Text>
                      <Text style={styles.reasonHint}>{reason.hint}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Button
              label="Keep my order"
              fullWidth
              disabled={cancelling}
              onPress={onKeepOrder}
              accessibilityLabel="Keep my order"
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Yes, cancel order"
              accessibilityState={{ disabled: cancelling, busy: cancelling }}
              disabled={cancelling}
              onPress={onConfirmCancel}
              style={({ pressed }) => [
                styles.cancelLink,
                pressed && styles.cancelLinkPressed,
                cancelling && styles.cancelLinkDisabled,
              ]}
            >
              <Text style={styles.cancelLinkText}>
                {cancelling ? "Cancelling order…" : "Yes, cancel this order"}
              </Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createCancelOrderDialogStyles({ colors }: ThemeStyleTokens) {
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
      backgroundColor: colors.destructiveMuted,
      marginTop: spacing.sm,
    },
    headerIconTint: {
      color: colors.destructive,
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
    sectionLabel: {
      fontSize: typography.sm,
      fontWeight: "700",
      color: colors.foreground,
      marginTop: spacing.xs,
    },
    reasonList: {
      gap: spacing.sm,
    },
    reasonCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    reasonCardSelected: {
      borderColor: colors.destructive,
      backgroundColor: colors.destructiveMuted,
    },
    reasonCardPressed: {
      opacity: 0.92,
    },
    radio: {
      width: 20,
      height: 20,
      borderRadius: radius.full,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    radioSelected: {
      borderColor: colors.destructive,
    },
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: radius.full,
      backgroundColor: colors.destructive,
    },
    reasonText: {
      flex: 1,
      gap: 2,
    },
    reasonLabel: {
      fontSize: typography.sm,
      fontWeight: "600",
      color: colors.foreground,
    },
    reasonLabelSelected: {
      color: colors.destructive,
    },
    reasonHint: {
      fontSize: typography.xs,
      color: colors.textSecondary,
      lineHeight: 16,
    },
    cancelLink: {
      alignItems: "center",
      paddingVertical: spacing.md,
    },
    cancelLinkPressed: {
      opacity: 0.75,
    },
    cancelLinkDisabled: {
      opacity: 0.5,
    },
    cancelLinkText: {
      fontSize: typography.sm,
      fontWeight: "700",
      color: colors.destructive,
    },
  });
}
