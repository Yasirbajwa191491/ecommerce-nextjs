import { Ionicons } from "@expo/vector-icons";

import { router } from "expo-router";

import { Pressable, StyleSheet, Text, View } from "react-native";



import { colors, radius, spacing, textStyles, typography } from "@/constants/theme";

import { useLayoutMetrics } from "@/hooks/useLayoutMetrics";



export function AiShoppingEntry() {

  const { horizontalPadding } = useLayoutMetrics();



  return (

    <Pressable

      accessibilityRole="button"

      accessibilityLabel="AI Shopping Assistant"

      onPress={() => router.push("/(tabs)/ai")}

      style={({ pressed }) => [

        styles.container,

        { marginHorizontal: horizontalPadding },

        pressed && styles.pressed,

      ]}

    >

      <View style={styles.left}>

        <View style={styles.iconWrap}>

          <Ionicons name="sparkles" size={17} color={colors.primary} />

        </View>

        <View style={styles.copy}>

          <Text style={styles.title}>Shop smarter with AI</Text>

          <Text style={styles.subtitle} numberOfLines={2}>

            Describe what you need and get personalized product recommendations.

          </Text>

        </View>

      </View>

      <View style={styles.cta}>

        <Text style={styles.ctaText}>Ask AI</Text>

        <Ionicons name="chevron-forward" size={14} color={colors.primaryForeground} />

      </View>

    </Pressable>

  );

}



const styles = StyleSheet.create({

  container: {

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

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

  left: {

    flex: 1,

    flexDirection: "row",

    alignItems: "center",

    gap: spacing.sm + 2,

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

    flexDirection: "row",

    alignItems: "center",

    gap: 2,

    backgroundColor: colors.primary,

    paddingHorizontal: spacing.md,

    paddingVertical: spacing.sm,

    borderRadius: radius.full,

    minHeight: 36,

    justifyContent: "center",

  },

  ctaText: {

    fontSize: typography.sm,

    fontWeight: "600",

    color: colors.primaryForeground,

  },

});


