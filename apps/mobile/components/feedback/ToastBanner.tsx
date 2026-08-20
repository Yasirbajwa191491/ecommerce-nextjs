import { Ionicons } from "@expo/vector-icons";

import { StyleSheet, Text, View } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";



import { colors, radius, spacing, typography } from "@/constants/theme";

import { useToast, type ToastType } from "@/providers/toast-context";



const ICONS: Record<ToastType, keyof typeof Ionicons.glyphMap> = {

  success: "checkmark",

  error: "alert-circle",

  info: "information-circle",

};



const ICON_COLORS: Record<ToastType, string> = {

  success: colors.success,

  error: colors.destructive,

  info: colors.primary,

};



const ICON_BG: Record<ToastType, string> = {

  success: colors.successMuted,

  error: colors.destructiveMuted,

  info: colors.primaryMuted,

};



export function ToastBanner() {

  const { toast } = useToast();

  const insets = useSafeAreaInsets();



  if (!toast) return null;



  const type = toast.type;



  return (

    <View

      style={[styles.container, { bottom: insets.bottom + 88 }]}

      accessibilityLiveRegion="polite"

      accessibilityRole="alert"

    >

      <View style={[styles.iconWrap, { backgroundColor: ICON_BG[type] }]}>

        <Ionicons name={ICONS[type]} size={16} color={ICON_COLORS[type]} />

      </View>

      <Text style={styles.text}>{toast.message}</Text>

    </View>

  );

}



const styles = StyleSheet.create({

  container: {

    position: "absolute",

    left: spacing.lg,

    right: spacing.lg,

    flexDirection: "row",

    alignItems: "center",

    gap: spacing.md,

    backgroundColor: colors.foreground,

    paddingHorizontal: spacing.lg,

    paddingVertical: spacing.md,

    borderRadius: radius.lg,

    shadowColor: "#000",

    shadowOffset: { width: 0, height: 8 },

    shadowOpacity: 0.15,

    shadowRadius: 16,

    elevation: 8,

  },

  iconWrap: {

    width: 28,

    height: 28,

    borderRadius: radius.full,

    alignItems: "center",

    justifyContent: "center",

  },

  text: {

    flex: 1,

    fontSize: typography.sm,

    fontWeight: "600",

    color: colors.surface,

  },

});


