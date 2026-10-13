import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CancellationFeeNotice } from "@/components/legal/CancellationFeeNotice";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { radius, spacing, typography } from "@/constants/theme";
import { useLegalPageContent } from "@/hooks/useLegalPageContent";
import type { PolicySettingKey } from "@/lib/legal-content";
import { useTheme } from "@/providers/theme-context";

export const CHECKOUT_POLICIES: { key: PolicySettingKey; title: string }[] = [
  { key: "terms_conditions", title: "Terms & Conditions" },
  { key: "shipping_policy", title: "Shipping Policy" },
  { key: "return_policy", title: "Return Policy" },
  { key: "privacy_policy", title: "Privacy Policy" },
];

export function CheckoutPolicySheet({ policy, onClose }: { policy: PolicySettingKey; onClose: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { paragraphs, isLoading } = useLegalPageContent(policy);
  return <Modal visible transparent animationType="slide" onRequestClose={onClose}>
    <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close policy" />
      <View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>{CHECKOUT_POLICIES.find((item) => item.key === policy)?.title}</Text>
          <Button label="Close" variant="ghost" onPress={onClose} />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          {policy === "terms_conditions" || policy === "return_policy" ? <CancellationFeeNotice /> : null}
          {isLoading ? <Skeleton height={180} /> : paragraphs.map((paragraph, index) => <Text key={index} style={[styles.paragraph, { color: colors.foreground }]}>{paragraph}</Text>)}
        </ScrollView>
        <Button label="Back to checkout" fullWidth onPress={onClose} />
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" }, sheet: { height: "85%", borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, gap: spacing.md },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm }, title: { fontSize: typography.lg, fontWeight: "700", flex: 1 },
  content: { gap: spacing.lg, paddingVertical: spacing.md }, paragraph: { fontSize: typography.base, lineHeight: 24 },
});
