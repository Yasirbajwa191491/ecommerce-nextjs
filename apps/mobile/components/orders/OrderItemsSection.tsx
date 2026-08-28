import { formatCurrencyAmount } from "@ecommerce/shared";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { ColorSwatch } from "@/components/cart/ColorSwatch";
import { Badge } from "@/components/ui/Badge";
import { radius, spacing, typography } from "@/constants/theme";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";
import { useTheme } from "@/providers/theme-context";

type OrderItem = {
  _id: string;
  productName: string;
  color?: string;
  quantity: number;
  lineTotal: number;
  warrantySummary?: string;
  isPromotionGift?: boolean;
};

type OrderItemsSectionProps = {
  items: OrderItem[];
  currency: string;
  title?: string;
};

export function OrderItemsSection({
  items,
  currency,
  title = "Items ordered",
}: OrderItemsSectionProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createOrderItemsSectionStyles);

  if (!items.length) return null;

  return (
    <View style={styles.section}>
      <View style={styles.titleRow}>
        <Ionicons name="cube-outline" size={16} color={colors.primary} />
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.list}>
        {items.map((item) => (
          <View key={item._id} style={styles.itemRow}>
            <View style={styles.itemText}>
              <View style={styles.nameRow}>
                <Text style={styles.itemName}>
                  {item.productName} × {item.quantity}
                </Text>
                {item.isPromotionGift ? (
                  <Badge label="Promotion gift" variant="primary" />
                ) : null}
              </View>
              {item.color ? <ColorSwatch color={item.color} /> : null}
              {item.warrantySummary ? (
                <Text style={styles.itemMeta}>Warranty: {item.warrantySummary}</Text>
              ) : null}
            </View>
            <Text style={styles.itemPrice}>
              {formatCurrencyAmount(item.lineTotal, currency)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function createOrderItemsSectionStyles({ colors, textStyles }: ThemeStyleTokens) {
  return StyleSheet.create({
    section: {
      gap: spacing.md,
    },
    titleRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.sm,
    },
    title: {
      ...textStyles.sectionTitle,
      fontSize: typography.base,
      color: colors.foreground,
    },
    list: {
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      overflow: "hidden" as const,
    },
    itemRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      gap: spacing.md,
      padding: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderLight,
      backgroundColor: colors.surface,
    },
    itemText: {
      flex: 1,
      gap: spacing.xs,
    },
    nameRow: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      alignItems: "center" as const,
      gap: spacing.sm,
    },
    itemName: {
      fontSize: typography.sm,
      fontWeight: "600" as const,
      color: colors.foreground,
      flexShrink: 1,
    },
    itemMeta: {
      fontSize: typography.xs,
      color: colors.textSecondary,
    },
    itemPrice: {
      fontSize: typography.sm,
      fontWeight: "700" as const,
      color: colors.foreground,
    },
  });
}
