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

import { colors, radius, sizes, spacing, typography } from "@/constants/theme";

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
      <Ionicons name="search" size={sizes.iconMd} color={colors.muted} />
      <Text style={styles.placeholder} numberOfLines={1}>
        {placeholder}
      </Text>
      {showVisualSearch ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search by image"
          hitSlop={4}
          onPress={(e) => {
            e.stopPropagation?.();
            router.push("/visual-search");
          }}
          style={({ pressed }) => [styles.visualBtn, pressed && styles.pressed]}
        >
          <Ionicons name="camera-outline" size={sizes.iconMd} color={colors.textSecondary} />
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
      <Ionicons name="search" size={sizes.iconMd} color={colors.muted} />
      <TextInput
        style={styles.textInput}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        value={value}
        onChangeText={onChangeText}
        accessibilityLabel="Search products"
        returnKeyType="search"
        {...inputProps}
      />
      {value.length > 0 ? (
        <Pressable
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          onPress={onClear ?? (() => onChangeText(""))}
          style={styles.visualBtn}
        >
          <Ionicons name="close-circle" size={sizes.iconMd} color={colors.muted} />
        </Pressable>
      ) : showVisualSearch ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search by image"
          hitSlop={4}
          onPress={() => router.push("/visual-search")}
          style={styles.visualBtn}
        >
          <Ionicons name="camera-outline" size={sizes.iconMd} color={colors.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: sizes.search,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  placeholder: {
    flex: 1,
    fontSize: typography.base,
    color: colors.muted,
  },
  textInput: {
    flex: 1,
    fontSize: typography.base,
    color: colors.foreground,
    paddingVertical: spacing.sm + 2,
  },
  visualBtn: {
    width: sizes.qtyControl,
    height: sizes.qtyControl,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
  },
  pressed: {
    opacity: 0.85,
  },
});
