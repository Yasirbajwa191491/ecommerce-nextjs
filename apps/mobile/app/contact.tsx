import { Linking } from "react-native";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMemo } from "react";

import { ContactForm } from "@/components/contact/ContactForm";
import { ContactInfoCard, ContactInfoSkeleton } from "@/components/contact/ContactInfoCard";
import { Header } from "@/components/layout/Header";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { spacing, typography } from "@/constants/theme";
import { useLayoutMetrics } from "@/hooks/useLayoutMetrics";
import { useScreenRootStyle } from "@/hooks/useScreenStyles";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useTheme } from "@/providers/theme-context";

export default function ContactScreen() {
  const insets = useSafeAreaInsets();
  const { horizontalPadding } = useLayoutMetrics();
  const rootStyle = useScreenRootStyle();
  const { colors, textStyles } = useTheme();
  const { storeName, address, phone, phoneHref, email, businessHours, isLoading } =
    useSiteSettings();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        flex: { flex: 1 },
        content: { paddingTop: spacing.lg, gap: spacing["2xl"] },
        hero: { gap: spacing.sm },
        heroTitle: { ...textStyles.display, fontSize: typography["3xl"] },
        heroSub: { ...textStyles.body, color: colors.textSecondary },
        cards: { gap: spacing.sm },
      }),
    [colors, textStyles]
  );

  const openMaps = () => {
    void Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(address)}`);
  };

  return (
    <ScreenContainer>
      <View style={[styles.container, rootStyle]}>
        <Header title="Contact" showBack showSearch={false} showCart={false} />

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 8 : 0}
        >
          <ScrollView
            contentContainerStyle={[
              styles.content,
              {
                paddingHorizontal: horizontalPadding,
                paddingBottom: insets.bottom + spacing["2xl"],
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.hero}>
              <Text style={styles.heroTitle}>We&apos;re here to help</Text>
              <Text style={styles.heroSub}>
                Questions about an order, product, or partnership? Reach out to the{" "}
                {storeName} team — we typically respond within 1–2 business days.
              </Text>
            </View>

            <View style={styles.cards}>
              {isLoading ? (
                <>
                  <ContactInfoSkeleton />
                  <ContactInfoSkeleton />
                  <ContactInfoSkeleton />
                  <ContactInfoSkeleton />
                </>
              ) : (
                <>
                  <ContactInfoCard
                    icon="location-outline"
                    title="Visit us"
                    lines={[address]}
                    onPress={openMaps}
                  />
                  <ContactInfoCard
                    icon="call-outline"
                    title="Call us"
                    lines={[phone]}
                    href={phoneHref}
                  />
                  <ContactInfoCard
                    icon="mail-outline"
                    title="Email us"
                    lines={[email]}
                    href={`mailto:${email}`}
                  />
                  <ContactInfoCard
                    icon="time-outline"
                    title="Business hours"
                    lines={[businessHours]}
                  />
                </>
              )}
            </View>

            <ContactForm />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </ScreenContainer>
  );
}
