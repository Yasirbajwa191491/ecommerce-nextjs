import { StyleSheet, Text, View } from "react-native";
import { parseSearchQuery } from "@convex/lib/search/queryParser";
import { radius, spacing, typography } from "@/constants/theme";
import { useTheme } from "@/providers/theme-context";

/** Readable interpretation; these constraints are enforced by the backend too. */
export function SearchConstraintChips({ query, currency: selectedCurrency }: { query: string; currency?: string }) {
  const { colors } = useTheme();
  const parsed = parseSearchQuery(query);
  const currency = parsed.currency ?? selectedCurrency ?? ((parsed.minPrice !== undefined || parsed.maxPrice !== undefined) ? "USD" : undefined);
  const labels = [
    parsed.productTypeTerms ? parsed.productTypeTerms[0].replace(/^./, (letter) => letter.toUpperCase()) : undefined,
    parsed.minPrice !== undefined ? `From ${currency} ${parsed.minPrice.toLocaleString()}` : undefined,
    parsed.maxPrice !== undefined ? `Up to ${currency} ${parsed.maxPrice.toLocaleString()}` : undefined,
    parsed.minStars !== undefined ? `${parsed.minStars} stars & up` : undefined,
  ].filter((label): label is string => Boolean(label));
  if (!labels.length) return null;
  return <View style={styles.row} accessibilityLabel="Interpreted search constraints">
    {labels.map((label) => <View key={label} style={[styles.chip, { backgroundColor: colors.primaryMuted }]}><Text style={[styles.label, { color: colors.foreground }]}>{label}</Text></View>)}
  </View>;
}
const styles = StyleSheet.create({ row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, chip: { borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, label: { fontSize: typography.sm, fontWeight: "600" } });
