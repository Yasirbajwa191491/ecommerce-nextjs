import { Ionicons } from "@expo/vector-icons";

import { useState } from "react";

import {

  Modal,

  Pressable,

  ScrollView,

  StyleSheet,

  Text,

  View,

} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";



import { Button } from "@/components/ui/Button";

import { Chip } from "@/components/ui/Chip";

import { Input } from "@/components/ui/Input";

import { colors, radius, shadows, spacing, textStyles } from "@/constants/theme";



export type CatalogSort =

  | "default"

  | "popular"

  | "newest"

  | "lowest"

  | "highest"

  | "rating"

  | "a-z"

  | "z-a";



export const SORT_OPTIONS: { label: string; value: CatalogSort }[] = [

  { label: "Default", value: "default" },

  { label: "Popular", value: "popular" },

  { label: "Newest", value: "newest" },

  { label: "Price: Low to High", value: "lowest" },

  { label: "Price: High to Low", value: "highest" },

  { label: "Top Rated", value: "rating" },

  { label: "A–Z", value: "a-z" },

  { label: "Z–A", value: "z-a" },

];



export type CatalogFilters = {

  minPrice?: number;

  maxPrice?: number;

  inStockOnly?: boolean;

  sort: CatalogSort;

  categoryId?: string;

};



type CatalogFiltersSheetProps = {

  visible: boolean;

  onClose: () => void;

  filters: CatalogFilters;

  onApply: (filters: CatalogFilters) => void;

  priceBounds?: { minPrice: number; maxPrice: number };

};



export function CatalogFiltersSheet({

  visible,

  onClose,

  filters,

  onApply,

  priceBounds,

}: CatalogFiltersSheetProps) {

  const insets = useSafeAreaInsets();

  const [local, setLocal] = useState(filters);



  return (

    <Modal

      visible={visible}

      animationType="slide"

      transparent

      onRequestClose={onClose}

      onShow={() => setLocal(filters)}

    >

      <Pressable style={styles.overlay} onPress={onClose}>

        <Pressable

          style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}

          onPress={(e) => e.stopPropagation()}

        >

          <View style={styles.handle} />

          <Text style={styles.title}>Filters & Sort</Text>



          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

            <Text style={styles.sectionLabel}>Sort by</Text>

            <View style={styles.chipRow}>

              {SORT_OPTIONS.map((opt) => (

                <Chip

                  key={opt.value}

                  label={opt.label}

                  selected={local.sort === opt.value}

                  onPress={() => setLocal((prev) => ({ ...prev, sort: opt.value }))}

                />

              ))}

            </View>



            <Text style={styles.sectionLabel}>Price range</Text>

            <View style={styles.priceRow}>

              <View style={styles.priceInput}>

                <Input

                  placeholder="Min"

                  keyboardType="numeric"

                  value={local.minPrice?.toString() ?? ""}

                  onChangeText={(text) =>

                    setLocal((prev) => ({

                      ...prev,

                      minPrice: text ? Number(text) : undefined,

                    }))

                  }

                />

              </View>

              <Text style={styles.priceDash}>–</Text>

              <View style={styles.priceInput}>

                <Input

                  placeholder="Max"

                  keyboardType="numeric"

                  value={local.maxPrice?.toString() ?? ""}

                  onChangeText={(text) =>

                    setLocal((prev) => ({

                      ...prev,

                      maxPrice: text ? Number(text) : undefined,

                    }))

                  }

                />

              </View>

            </View>

            {priceBounds ? (

              <Text style={styles.hint}>

                Store range: ${priceBounds.minPrice.toFixed(0)} – $

                {priceBounds.maxPrice.toFixed(0)}

              </Text>

            ) : null}



            <Pressable

              accessibilityRole="checkbox"

              accessibilityState={{ checked: local.inStockOnly ?? false }}

              onPress={() =>

                setLocal((prev) => ({

                  ...prev,

                  inStockOnly: !prev.inStockOnly,

                }))

              }

              style={styles.checkboxRow}

            >

              <View style={[styles.checkbox, local.inStockOnly && styles.checkboxChecked]}>

                {local.inStockOnly ? (

                  <Ionicons name="checkmark" size={16} color={colors.primaryForeground} />

                ) : null}

              </View>

              <Text style={styles.checkboxLabel}>In stock only</Text>

            </Pressable>

          </ScrollView>



          <View style={styles.actions}>

            <Button

              label="Reset"

              variant="outline"

              onPress={() =>

                setLocal({ sort: "default", inStockOnly: false })

              }

              style={styles.actionButton}

            />

            <Button

              label="Apply"

              onPress={() => {

                onApply(local);

                onClose();

              }}

              style={styles.actionButton}

            />

          </View>

        </Pressable>

      </Pressable>

    </Modal>

  );

}



const styles = StyleSheet.create({

  overlay: {

    flex: 1,

    backgroundColor: colors.overlay,

    justifyContent: "flex-end",

  },

  sheet: {

    backgroundColor: colors.surface,

    borderTopLeftRadius: radius.xl,

    borderTopRightRadius: radius.xl,

    paddingHorizontal: spacing.lg,

    paddingTop: spacing.md,

    maxHeight: "85%",

    ...shadows.md,

  },

  handle: {

    width: 36,

    height: 4,

    borderRadius: 2,

    backgroundColor: colors.border,

    alignSelf: "center",

    marginBottom: spacing.lg,

  },

  title: {

    ...textStyles.screenTitle,

    marginBottom: spacing.md,

  },

  scroll: {

    maxHeight: 420,

  },

  sectionLabel: {

    ...textStyles.sectionTitle,

    fontSize: 15,

    marginBottom: spacing.md,

    marginTop: spacing.lg,

  },

  chipRow: {

    flexDirection: "row",

    flexWrap: "wrap",

    gap: spacing.sm,

  },

  priceRow: {

    flexDirection: "row",

    alignItems: "center",

    gap: spacing.sm,

  },

  priceInput: {

    flex: 1,

  },

  priceDash: {

    ...textStyles.bodySmall,

    color: colors.muted,

  },

  hint: {

    ...textStyles.caption,

    marginTop: spacing.sm,

  },

  checkboxRow: {

    flexDirection: "row",

    alignItems: "center",

    gap: spacing.md,

    marginTop: spacing.xl,

    marginBottom: spacing.lg,

    paddingVertical: spacing.sm,

  },

  checkbox: {

    width: 24,

    height: 24,

    borderRadius: radius.xs,

    borderWidth: 2,

    borderColor: colors.border,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: colors.surface,

  },

  checkboxChecked: {

    backgroundColor: colors.primary,

    borderColor: colors.primary,

  },

  checkboxLabel: {

    ...textStyles.body,

    fontWeight: "500",

  },

  actions: {

    flexDirection: "row",

    gap: spacing.md,

    marginTop: spacing.md,

    paddingTop: spacing.md,

    borderTopWidth: StyleSheet.hairlineWidth,

    borderTopColor: colors.borderLight,

  },

  actionButton: {

    flex: 1,

  },

});


