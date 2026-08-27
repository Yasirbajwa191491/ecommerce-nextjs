import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "@/constants/theme";
import type { OrderStatus } from "@/lib/order-display";

const PROGRESS_STEPS: { key: OrderStatus; label: string }[] = [
  { key: "confirmed", label: "Confirmed" },
  { key: "processing", label: "Processing" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
];

const TERMINAL_STATUSES: Record<
  string,
  { label: string; tone: "destructive" | "muted" }
> = {
  cancelled: { label: "Order cancelled", tone: "destructive" },
  refunded: { label: "Order refunded", tone: "destructive" },
  failed: { label: "Order failed", tone: "destructive" },
  expired: { label: "Checkout expired", tone: "muted" },
};

function getActiveStepIndex(status: OrderStatus): number {
  if (status === "pending") return -1;
  const directIndex = PROGRESS_STEPS.findIndex((step) => step.key === status);
  return directIndex >= 0 ? directIndex : -1;
}

type OrderProgressTimelineProps = {
  status: OrderStatus;
};

export function OrderProgressTimeline({ status }: OrderProgressTimelineProps) {
  const terminal = TERMINAL_STATUSES[status];

  if (terminal) {
    return (
      <View
        style={[
          styles.terminalBox,
          terminal.tone === "destructive" ? styles.terminalDestructive : styles.terminalMuted,
        ]}
      >
        <Text
          style={[
            styles.terminalText,
            terminal.tone === "destructive"
              ? styles.terminalTextDestructive
              : styles.terminalTextMuted,
          ]}
        >
          {terminal.label}
        </Text>
      </View>
    );
  }

  const activeIndex = getActiveStepIndex(status);
  const progressRatio =
    PROGRESS_STEPS.length > 1 ? activeIndex / (PROGRESS_STEPS.length - 1) : 0;

  return (
    <View style={styles.wrapper}>
      <View style={styles.gridWrap}>
        <View
          style={[
            styles.connectorTrack,
            { pointerEvents: "none" },
          ]}
        />
        <View
          style={[
            styles.connectorFill,
            { width: `${Math.max(0, progressRatio * 80)}%`, pointerEvents: "none" },
          ]}
        />

        <View style={styles.stepsRow}>
          {PROGRESS_STEPS.map((step, index) => {
            const isComplete = index < activeIndex;
            const isCurrent = index === activeIndex;

            return (
              <View
                key={step.key}
                style={[
                  styles.stepBox,
                  isCurrent && styles.stepBoxCurrent,
                  isComplete && styles.stepBoxComplete,
                ]}
              >
                {isComplete || isCurrent ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={isCurrent ? colors.primary : colors.success}
                  />
                ) : (
                  <Ionicons name="ellipse-outline" size={20} color={colors.muted} />
                )}
                <Text
                  style={[
                    styles.stepLabel,
                    isCurrent && styles.stepLabelCurrent,
                    !isComplete && !isCurrent && styles.stepLabelPending,
                  ]}
                  numberOfLines={2}
                >
                  {step.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
  },
  gridWrap: {
    position: "relative",
    width: "100%",
  },
  connectorTrack: {
    position: "absolute",
    top: 26,
    left: "10%",
    right: "10%",
    height: 2,
    backgroundColor: colors.border,
    borderRadius: radius.full,
  },
  connectorFill: {
    position: "absolute",
    top: 26,
    left: "10%",
    height: 2,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  stepsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    width: "100%",
  },
  stepBox: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "flex-start",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 88,
  },
  stepBoxCurrent: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  stepBoxComplete: {
    borderColor: "rgba(16, 185, 129, 0.35)",
    backgroundColor: colors.successMuted,
  },
  stepLabel: {
    fontSize: typography.xs,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 14,
    color: colors.foreground,
  },
  stepLabelCurrent: {
    color: colors.primary,
  },
  stepLabelPending: {
    color: colors.textSecondary,
    fontWeight: "500",
  },
  terminalBox: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    alignItems: "center",
  },
  terminalDestructive: {
    borderColor: "rgba(239, 68, 68, 0.35)",
    backgroundColor: colors.destructiveMuted,
  },
  terminalMuted: {
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  terminalText: {
    fontSize: typography.sm,
    fontWeight: "600",
    textAlign: "center",
  },
  terminalTextDestructive: {
    color: colors.destructive,
  },
  terminalTextMuted: {
    color: colors.textSecondary,
  },
});
