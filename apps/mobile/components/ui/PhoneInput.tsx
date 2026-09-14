import { Ionicons } from "@expo/vector-icons";
import {
  listPhoneCountries,
  type PhoneCountryCode,
} from "@ecommerce/shared";
import { AsYouType, parsePhoneNumberFromString } from "libphonenumber-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { radius, sizes, spacing, typography } from "@/constants/theme";
import { useDefaultPhoneCountry } from "@/hooks/useDefaultPhoneCountry";
import { useTheme } from "@/providers/theme-context";

type PhoneInputProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  accessibilityLabel?: string;
};

function nationalDigitsFrom(value: string): string {
  const parsed = parsePhoneNumberFromString(value);
  if (parsed) {
    return parsed.formatNational();
  }
  return value.replace(/^\+/, "");
}

export function PhoneInput({
  label = "Phone number",
  value,
  onChange,
  onBlur,
  error,
  disabled,
  accessibilityLabel,
}: PhoneInputProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const defaultCountry = useDefaultPhoneCountry();
  const countries = useMemo(() => listPhoneCountries(), []);

  const parsedCountry = parsePhoneNumberFromString(value)?.country;
  const [country, setCountry] = useState<PhoneCountryCode>(
    parsedCountry ?? defaultCountry
  );
  const [national, setNational] = useState(() => nationalDigitsFrom(value));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!parsedCountry) {
      setCountry(defaultCountry);
    }
  }, [defaultCountry, parsedCountry]);

  useEffect(() => {
    const parsed = parsePhoneNumberFromString(value);
    if (parsed?.country) {
      setCountry(parsed.country);
      setNational(parsed.formatNational());
      return;
    }
    if (!value.trim()) {
      setNational("");
    }
  }, [value]);

  const selected = countries.find((item) => item.code === country) ?? {
    code: country,
    callingCode: "",
    name: country,
    flag: "",
  };

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return countries;
    return countries.filter((item) => {
      const haystack = `${item.name} ${item.code} ${item.callingCode}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [countries, query]);

  const emitChange = useCallback(
    (nextCountry: PhoneCountryCode, nextNational: string) => {
      const typer = new AsYouType(nextCountry);
      const formatted = typer.input(nextNational);
      setNational(formatted);
      const e164 = typer.getNumberValue();
      onChange(e164 ?? (nextNational.trim() ? formatted : ""));
    },
    [onChange]
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrapper: { gap: spacing.sm },
        label: {
          fontSize: typography.sm,
          fontWeight: "600",
          color: colors.foreground,
        },
        row: {
          minHeight: sizes.input,
          flexDirection: "row",
          alignItems: "stretch",
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.md,
          backgroundColor: colors.surface,
          overflow: "hidden",
        },
        rowFocused: { borderColor: colors.primary },
        rowError: { borderColor: colors.destructive },
        rowDisabled: { opacity: 0.55 },
        countryBtn: {
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          paddingHorizontal: spacing.md,
          borderRightWidth: StyleSheet.hairlineWidth,
          borderRightColor: colors.border,
        },
        countryCode: {
          fontSize: typography.sm,
          fontWeight: "700",
          color: colors.foreground,
        },
        flag: { fontSize: typography.base },
        input: {
          flex: 1,
          paddingHorizontal: spacing.md,
          fontSize: typography.base,
          color: colors.foreground,
        },
        error: { fontSize: typography.sm, color: colors.destructive },
        overlay: {
          flex: 1,
          backgroundColor: colors.overlay,
          justifyContent: "flex-end",
        },
        sheet: {
          maxHeight: "88%",
          backgroundColor: colors.surface,
          borderTopLeftRadius: radius.xl,
          borderTopRightRadius: radius.xl,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          borderBottomWidth: 0,
          paddingBottom: insets.bottom + spacing.md,
        },
        handle: {
          alignSelf: "center",
          width: 40,
          height: 4,
          borderRadius: radius.full,
          backgroundColor: colors.border,
          marginTop: spacing.sm,
          marginBottom: spacing.sm,
        },
        sheetTitle: {
          fontSize: typography.lg,
          fontWeight: "800",
          color: colors.foreground,
          paddingHorizontal: spacing.xl,
          marginBottom: spacing.sm,
        },
        search: {
          marginHorizontal: spacing.xl,
          marginBottom: spacing.md,
          minHeight: sizes.search,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          fontSize: typography.base,
          color: colors.foreground,
          backgroundColor: colors.background,
        },
        countryRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.md,
        },
        countryName: {
          flex: 1,
          fontSize: typography.sm,
          fontWeight: "600",
          color: colors.foreground,
        },
        callingCode: {
          fontSize: typography.sm,
          color: colors.textSecondary,
        },
      }),
    [colors, insets.bottom]
  );

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.row,
          focused && !error ? styles.rowFocused : null,
          error ? styles.rowError : null,
          disabled ? styles.rowDisabled : null,
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Country code ${selected.callingCode}`}
          disabled={disabled}
          onPress={() => setPickerOpen(true)}
          style={styles.countryBtn}
        >
          <Text style={styles.flag}>{selected.flag}</Text>
          <Text style={styles.countryCode}>{selected.callingCode || country}</Text>
          <Ionicons name="chevron-down" size={16} color={colors.muted} />
        </Pressable>
        <TextInput
          accessibilityLabel={accessibilityLabel ?? label}
          value={national}
          onChangeText={(text) => emitChange(country, text)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          editable={!disabled}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          placeholder="Phone number"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <Modal
        visible={pickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Select country</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search country or code"
              placeholderTextColor={colors.muted}
              autoCorrect={false}
              style={styles.search}
            />
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.code}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const selectedRow = item.code === country;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedRow }}
                    onPress={() => {
                      setCountry(item.code);
                      emitChange(item.code, national);
                      setQuery("");
                      setPickerOpen(false);
                    }}
                    style={[
                      styles.countryRow,
                      selectedRow ? { backgroundColor: colors.primaryMuted } : null,
                    ]}
                  >
                    <Text style={styles.flag}>{item.flag}</Text>
                    <Text style={styles.countryName}>{item.name}</Text>
                    <Text style={styles.callingCode}>{item.callingCode}</Text>
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
