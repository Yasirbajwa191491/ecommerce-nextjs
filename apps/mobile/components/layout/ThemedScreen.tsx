import { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  ViewProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { layout, spacing } from "@/constants/theme";
import { useTheme } from "@/providers/theme-context";

type ThemedScreenProps = ViewProps & {
  children: ReactNode;
  scroll?: boolean;
  keyboardAvoid?: boolean;
  padded?: boolean;
  edges?: ("top" | "bottom")[];
};

export function ThemedScreen({
  children,
  scroll = false,
  keyboardAvoid = false,
  padded = false,
  edges = [],
  style,
  ...props
}: ThemedScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const content = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        padded && { paddingHorizontal: layout.screenPadding },
        edges.includes("bottom") && { paddingBottom: insets.bottom + spacing.lg },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    children
  );

  const body = (
    <View
      style={[
        styles.flex,
        { backgroundColor: colors.background },
        edges.includes("top") && { paddingTop: insets.top },
        !scroll && padded && { paddingHorizontal: layout.screenPadding },
        !scroll && edges.includes("bottom") && { paddingBottom: insets.bottom + spacing.lg },
        style,
      ]}
      {...props}
    >
      {content}
    </View>
  );

  if (keyboardAvoid) {
    return (
      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor: colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      >
        {body}
      </KeyboardAvoidingView>
    );
  }

  return body;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
