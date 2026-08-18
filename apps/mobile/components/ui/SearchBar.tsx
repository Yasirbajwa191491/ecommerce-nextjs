import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

import { colors, radius, spacing, touchTarget, typography } from "@/constants/theme";

type SearchBarTapProps = {
  placeholder?: string;
  showVisualSearch?: boolean;
  onPress?: () => void;
};

/** Non-editable search entry — navigates to search screen. */
export function SearchBar({
  placeholder = "Search products, brands, categories…",
  showVisualSearch = true,
  onPress,
}: SearchBarTapProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Search products"
      onPress={onPress ?? (() => router.push("/search"))}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      <Ionicons name="search" size={18} color={colors.muted} />
      <Text style={styles.placeholder} numberOfLines={1}>
        {placeholder}
      </Text>
      {showVisualSearch ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Visual search"
          hitSlop={8}
          onPress={(e) => {
            e.stopPropagation?.();
            router.push("/visual-search");
          }}
          style={({ pressed }) => [styles.visualBtn, pressed && styles.pressed]}
        >
          <Ionicons name="camera-outline" size={18} color={colors.textSecondary} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

type SearchBarInputProps = TextInputProps & {
  value: string;
  onChangeText: (text: string) => void;
  showVisualSearch?: boolean;
  onClear?: () => void;
};

/** Editable search input for the search screen. */
export function SearchBarInput({
  value,
  onChangeText,
  placeholder = "Search products, brands…",
  showVisualSearch = true,
  onClear,
  ...inputProps
}: SearchBarInputProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="search" size={18} color={colors.muted} />
      <TextInput
        style={styles.textInput}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        value={value}
        onChangeText={onChangeText}
        accessibilityLabel="Search products"
        {...inputProps}
      />
      {value.length > 0 ? (
        <Pressable
          hitSlop={8}
          accessibilityLabel="Clear search"
          onPress={onClear ?? (() => onChangeText(""))}
          style={styles.iconBtn}
        >
          <Ionicons name="close-circle" size={18} color={colors.muted} />
        </Pressable>
      ) : showVisualSearch ? (
        <Pressable
          accessibilityLabel="Visual search"
          hitSlop={8}
          onPress={() => router.push("/visual-search")}
          style={styles.visualBtn}
        >
          <Ionicons name="camera-outline" size={18} color={colors.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: touchTarget,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.md,
  },
  placeholder: {
    flex: 1,
    fontSize: typography.sm,
    color: colors.muted,
  },
  textInput: {
    flex: 1,
    fontSize: typography.sm,
    color: colors.foreground,
    paddingVertical: spacing.sm + 2,
  },
  visualBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
  },
  iconBtn: {
    padding: spacing.sm,
  },
  pressed: {
    opacity: 0.85,
  },
});
