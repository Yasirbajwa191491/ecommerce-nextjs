import { listPhoneCountries, resolveCountryDisplayName } from "@ecommerce/shared";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { radius, spacing, typography } from "@/constants/theme";
import { useTheme } from "@/providers/theme-context";

export function CheckoutCountryPicker({ value, onChange, error, disabled }: {
  value: string; onChange: (value: string) => void; error?: string; disabled?: boolean;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const countries = useMemo(() => listPhoneCountries(), []);
  const filtered = useMemo(() => countries.filter((country) => `${country.name} ${country.code}`.toLowerCase().includes(query.trim().toLowerCase())), [countries, query]);
  const selectedName = value.trim() ? resolveCountryDisplayName(value) : "";
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.foreground }]}>Country *</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Delivery country, ${selectedName || "select country"}`} disabled={disabled}
        onPress={() => setOpen(true)} style={[styles.select, { backgroundColor: colors.surface, borderColor: error ? colors.destructive : colors.border }]}>
        <Text style={[styles.value, { color: selectedName ? colors.foreground : colors.textSecondary }]} numberOfLines={1}>{selectedName || "Select country"}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
      </Pressable>
      {error ? <Text accessibilityRole="alert" style={{ color: colors.destructive }}>{error}</Text> : null}
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel="Close country selection" />
          <View style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + spacing.md }]} accessibilityViewIsModal>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.foreground }]}>Delivery country</Text>
              <Button label="Done" variant="ghost" onPress={() => setOpen(false)} />
            </View>
            <Input value={query} onChangeText={setQuery} placeholder="Search countries" accessibilityLabel="Search delivery countries" autoCorrect={false} />
            <FlatList data={filtered} keyExtractor={(country) => country.code} keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text style={[styles.empty, { color: colors.textSecondary }]}>No countries match your search.</Text>}
              renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityState={{ selected: item.name === selectedName }}
                onPress={() => { onChange(item.name); setOpen(false); setQuery(""); }} style={styles.country}>
                <Text style={[styles.value, { color: colors.foreground }]}>{item.flag}  {item.name}</Text>
                {item.name === selectedName ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
              </Pressable>} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm }, label: { fontSize: typography.sm, fontWeight: "600" },
  select: { minHeight: 48, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  value: { flex: 1, fontSize: typography.base }, overlay: { flex: 1, justifyContent: "flex-end" },
  sheet: { height: "80%", borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, gap: spacing.md },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: typography.lg, fontWeight: "700" }, country: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  empty: { paddingVertical: spacing.lg },
});
