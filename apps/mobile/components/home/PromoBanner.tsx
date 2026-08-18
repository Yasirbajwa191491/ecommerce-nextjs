import { Ionicons } from "@expo/vector-icons";

import { useQuery } from "convex/react";

import { router } from "expo-router";

import { Pressable, StyleSheet, Text, View } from "react-native";



import { colors, radius, spacing, textStyles, typography } from "@/constants/theme";

import { useStableNow } from "@/hooks/useStableNow";

import { useLayoutMetrics } from "@/hooks/useLayoutMetrics";

import { api } from "@/lib/convex-api";



export function PromoBanner() {

  const now = useStableNow();

  const { horizontalPadding } = useLayoutMetrics();

  const promotions = useQuery(api.productPromotions.listActiveForStorefront, { now });



  if (!promotions || promotions.length === 0) return null;



  const promo = promotions[0];

  const headline = promo.bannerText || promo.name;

  const description =

    promo.promotionMessage || promo.description || promo.typeLabel;



  return (

    <Pressable

      accessibilityRole="button"

      accessibilityLabel={`Promotion: ${headline}`}

      onPress={() => {
        router.push(`/product/${promo.buyProductId}`);
      }}

      style={({ pressed }) => [

        styles.container,

        { marginHorizontal: horizontalPadding },

        pressed && styles.pressed,

      ]}

    >

      <View style={styles.iconWrap}>

        <Ionicons name="pricetag-outline" size={18} color={colors.primary} />

      </View>

      <View style={styles.copy}>

        <Text style={styles.title} numberOfLines={1}>

          {headline}

        </Text>

        <Text style={styles.subtitle} numberOfLines={2}>

          {description}

        </Text>

      </View>

      <View style={styles.cta}>

        <Text style={styles.ctaText}>Shop deals</Text>

      </View>

    </Pressable>

  );

}



const styles = StyleSheet.create({

  container: {

    flexDirection: "row",

    alignItems: "center",

    gap: spacing.md,

    padding: spacing.md,

    backgroundColor: colors.surface,

    borderRadius: radius.lg,

    borderWidth: 1,

    borderColor: colors.borderLight,

  },

  pressed: {

    opacity: 0.94,

  },

  iconWrap: {

    width: 36,

    height: 36,

    borderRadius: radius.sm,

    backgroundColor: colors.primaryMuted,

    alignItems: "center",

    justifyContent: "center",

  },

  copy: {

    flex: 1,

    gap: 2,

  },

  title: {

    ...textStyles.cardTitle,

    fontSize: typography.base,

    fontWeight: "600",

  },

  subtitle: {

    ...textStyles.caption,

    lineHeight: 16,

  },

  cta: {

    paddingHorizontal: spacing.md,

    paddingVertical: spacing.sm,

    borderRadius: radius.full,

    borderWidth: 1,

    borderColor: colors.border,

    backgroundColor: colors.background,

  },

  ctaText: {

    fontSize: typography.xs,

    fontWeight: "600",

    color: colors.foreground,

  },

});


