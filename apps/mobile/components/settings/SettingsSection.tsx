import { Ionicons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { radius, sizes, spacing, touchTarget, typography } from "@/constants/theme";
import { useTheme } from "@/providers/theme-context";

type SettingsSectionProps = {
  title: string;
  children: ReactNode;
  footer?: string;
};

export function SettingsSection({ title, children, footer }: SettingsSectionProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
      <View
        style={[
          styles.group,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        {children}
      </View>
      {footer ? (
        <Text style={[styles.footer, { color: colors.muted }]}>{footer}</Text>
      ) : null}
    </View>
  );
}

type SettingsRowProps = {
  label: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  trailing?: ReactNode;
  showChevron?: boolean;
  destructive?: boolean;
  accessibilityHint?: string;
  isLast?: boolean;
};

export function SettingsRow({
  label,
  subtitle,
  value,
  onPress,
  trailing,
  showChevron = false,
  destructive = false,
  accessibilityHint,
  isLast = false,
}: SettingsRowProps) {
  const { colors } = useTheme();
  const content = (
    <>
      <View style={styles.rowCopy}>
        <Text
          style={[
            styles.rowLabel,
            { color: destructive ? colors.destructive : colors.foreground },
          ]}
        >
          {label}
        </Text>
        {subtitle ? (
          <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        ) : null}
      </View>
      {trailing ?? (value ? <Text style={[styles.rowValue, { color: colors.muted }]}>{value}</Text> : null)}
      {showChevron ? (
        <Ionicons name="chevron-forward" size={sizes.iconSm} color={colors.muted} />
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          !isLast && [styles.rowBorder, { borderBottomColor: colors.borderLight }],
          pressed && { backgroundColor: colors.scrim },
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.row,
        !isLast && [styles.rowBorder, { borderBottomColor: colors.borderLight }],
      ]}
      accessibilityLabel={label}
    >
      {content}
    </View>
  );
}

type SettingsToggleRowProps = {
  label: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  isLast?: boolean;
  disabled?: boolean;
};

export function SettingsToggleRow({
  label,
  subtitle,
  value,
  onValueChange,
  isLast = false,
  disabled = false,
}: SettingsToggleRowProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.row,
        !isLast && [styles.rowBorder, { borderBottomColor: colors.borderLight }],
      ]}
    >
      <View style={styles.rowCopy}>
        <Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text>
        {subtitle ? (
          <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        ) : null}
      </View>
      <Switch
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityState={{ checked: value, disabled }}
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.border, true: colors.primaryMuted }}
        thumbColor={value ? colors.primary : colors.surfaceElevated}
      />
    </View>
  );
}

type ThemeSelectorProps = {
  value: "light" | "dark" | "system";
  onChange: (value: "light" | "dark" | "system") => void;
};

const THEME_OPTIONS = [
  { value: "light" as const, label: "Light", icon: "sunny-outline" as const },
  { value: "dark" as const, label: "Dark", icon: "moon-outline" as const },
  { value: "system" as const, label: "System", icon: "phone-portrait-outline" as const },
];

export function ThemeSelector({ value, onChange }: ThemeSelectorProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.themeRow} accessibilityRole="radiogroup" accessibilityLabel="Theme">
      {THEME_OPTIONS.map((option, index) => {
        const selected = value === option.value;
        const isLast = index === THEME_OPTIONS.length - 1;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={`Theme: ${option.label}`}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.themeOption,
              !isLast && [styles.rowBorder, { borderBottomColor: colors.borderLight }],
              selected && { backgroundColor: colors.primaryMuted },
              pressed && !selected && { backgroundColor: colors.scrim },
            ]}
          >
            <Ionicons
              name={option.icon}
              size={sizes.iconMd}
              color={selected ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.themeLabel,
                { color: selected ? colors.primary : colors.foreground },
              ]}
            >
              {option.label}
            </Text>
            {selected ? (
              <Ionicons name="checkmark" size={sizes.iconMd} color={colors.primary} />
            ) : (
              <View style={styles.themeSpacer} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.xs,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: spacing.xs,
  },
  group: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  footer: {
    fontSize: typography.xs,
    lineHeight: 16,
    paddingHorizontal: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: touchTarget + 4,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: typography.base,
    fontWeight: "500",
  },
  rowSubtitle: {
    fontSize: typography.sm,
    lineHeight: 18,
  },
  rowValue: {
    fontSize: typography.sm,
  },
  themeRow: {},
  themeOption: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: touchTarget + 4,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  themeLabel: {
    flex: 1,
    fontSize: typography.base,
    fontWeight: "500",
  },
  themeSpacer: {
    width: sizes.iconMd,
  },
});
