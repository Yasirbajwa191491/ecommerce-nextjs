import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SORT_OPTIONS } from "@/components/catalog/CatalogFiltersSheet";
import { radius, spacing, typography } from "@/constants/theme";
import type { CatalogSort } from "@/lib/catalog/filters";
import { useTheme } from "@/providers/theme-context";

export function CatalogSortSheet({ visible, onClose, value, onChange, currency, onChooseCurrency }: { visible: boolean; onClose: () => void; value: CatalogSort; onChange: (sort: CatalogSort) => void; currency?: string; onChooseCurrency: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <Pressable accessibilityLabel="Close sorting" onPress={onClose} style={[styles.overlay, { backgroundColor: colors.overlay }]}>
      <Pressable onPress={(event) => event.stopPropagation()} style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        <Text style={[styles.title, { color: colors.foreground }]}>Sort products</Text>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>{currency ? `Comparing ${currency} prices` : "Select a currency in Filters to compare prices."}</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {SORT_OPTIONS.map((option) => {
            const needsCurrency = !currency && (option.value === "lowest" || option.value === "highest");
            return <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected: value === option.value }} accessibilityLabel={`${option.label}${needsCurrency ? ", choose currency first" : ""}`} onPress={() => { onClose(); if (needsCurrency) onChooseCurrency(); else onChange(option.value); }} style={({ pressed }) => [styles.row, { backgroundColor: value === option.value ? colors.selectedMuted : "transparent", opacity: pressed ? 0.8 : 1 }]}>
              <Text style={[styles.label, { color: value === option.value ? colors.selected : colors.foreground }]}>{option.label}</Text>
              <Ionicons name={needsCurrency ? "chevron-forward" : value === option.value ? "checkmark" : "ellipse-outline"} size={20} color={value === option.value ? colors.selected : colors.textSecondary} />
            </Pressable>;
          })}
        </ScrollView>
      </Pressable>
    </Pressable>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  sheet: { padding: spacing.lg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: "90%" },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: spacing.lg },
  title: { fontSize: typography.xl, fontWeight: "700" },
  hint: { fontSize: typography.sm, lineHeight: 20, marginTop: spacing.sm, marginBottom: spacing.md },
  row: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, padding: spacing.md, borderRadius: radius.md },
  label: { flex: 1, fontSize: typography.base, fontWeight: "500" },
});
