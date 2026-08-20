import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FooterNavAccordion } from "@/components/footer/FooterNavAccordion";
import { FooterNewsletter } from "@/components/footer/FooterNewsletter";
import { colors, radius, spacing, textStyles, typography } from "@/constants/theme";
import { useLayoutMetrics } from "@/hooks/useLayoutMetrics";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import {
  FOOTER_COMPANY_LINKS,
  FOOTER_NAV_GROUPS,
  MOBILE_PAYMENT_METHODS,
} from "@/lib/footer-links";

const BRAND_TAGLINE =
  "Quality products across every category. Shop smarter with AI-powered search, recommendations, and personalized assistance.";

type MobileFooterProps = {
  /** Extra bottom inset when nested inside tab screens (tab bar already handled by safe area). */
  compactBottom?: boolean;
};

export function MobileFooter({ compactBottom = false }: MobileFooterProps) {
  const insets = useSafeAreaInsets();
  const { horizontalPadding } = useLayoutMetrics();
  const { storeName, address, phone, phoneHref, email, businessHours, isLoading } =
    useSiteSettings();
  const year = new Date().getFullYear();

  const openMaps = () => {
    void Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(address)}`);
  };

  const bottomPadding = compactBottom
    ? spacing["2xl"]
    : Math.max(insets.bottom, spacing.lg) + spacing["2xl"];

  return (
    <View style={styles.outer}>
      <View
        style={[
          styles.wrapper,
          {
            paddingHorizontal: horizontalPadding,
            paddingBottom: bottomPadding,
          },
        ]}
      >
      <View style={styles.brandSection}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${storeName} — go to homepage`}
          onPress={() => router.push("/(tabs)")}
        >
          <Text style={styles.storeName}>{storeName}</Text>
        </Pressable>
        <Text style={styles.tagline}>{BRAND_TAGLINE}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Contact</Text>
        <View style={styles.contactCard}>
          {isLoading ? (
            <Text style={styles.contactLoading}>Loading contact details…</Text>
          ) : (
            <>
              {(
                [
                  {
                    key: "address",
                    icon: "location-outline" as const,
                    label: "Address",
                    value: address,
                    onPress: openMaps,
                  },
                  {
                    key: "phone",
                    icon: "call-outline" as const,
                    label: "Phone",
                    value: phone,
                    onPress: () => void Linking.openURL(phoneHref),
                  },
                  {
                    key: "email",
                    icon: "mail-outline" as const,
                    label: "Email",
                    value: email,
                    onPress: () => void Linking.openURL(`mailto:${email}`),
                  },
                  ...(businessHours
                    ? [
                        {
                          key: "hours",
                          icon: "time-outline" as const,
                          label: "Business hours",
                          value: businessHours,
                        },
                      ]
                    : []),
                ] as const
              ).map((row, index, rows) => (
                <ContactRow
                  key={row.key}
                  icon={row.icon}
                  label={row.label}
                  value={row.value}
                  onPress={"onPress" in row ? row.onPress : undefined}
                  isLast={index === rows.length - 1}
                />
              ))}
            </>
          )}
        </View>
      </View>

      <View style={styles.newsletterSection}>
        <Text style={styles.newsletterEyebrow}>Stay in the loop</Text>
        <Text style={styles.newsletterLead}>
          New arrivals, exclusive offers, and curated picks.
        </Text>
        <FooterNewsletter />
        <Text style={styles.newsletterHint}>
          We respect your inbox. Unsubscribe anytime.
        </Text>
      </View>

      <View style={styles.section}>
        <FooterNavAccordion groups={FOOTER_NAV_GROUPS} />
      </View>

      <View style={styles.securitySection}>
        <View style={styles.securityRow}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
          <Text style={styles.securityText}>Secure checkout</Text>
        </View>
        <View style={styles.securityRow}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.primary} />
          <Text style={styles.securityText}>Encrypted payments</Text>
        </View>
        <View style={styles.paymentRow}>
          {MOBILE_PAYMENT_METHODS.map((method) => (
            <View key={method} style={styles.paymentBadge}>
              <Text style={styles.paymentBadgeText}>{method}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.legalSection}>
        <Text style={styles.copyright}>
          © {year} {storeName}
        </Text>
        <View style={styles.legalLinks}>
          {FOOTER_COMPANY_LINKS.filter((link) => link.label === "Privacy" || link.label === "Terms").map(
            (link) => (
              <Pressable
                key={link.label}
                accessibilityRole="link"
                accessibilityLabel={link.label}
                onPress={() => router.push(link.href)}
                style={({ pressed }) => [styles.legalLink, pressed && styles.legalLinkPressed]}
              >
                <Text style={styles.legalLinkText}>{link.label}</Text>
              </Pressable>
            )
          )}
        </View>
      </View>
      </View>
    </View>
  );
}

function ContactRow({
  icon,
  label,
  value,
  onPress,
  isLast = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress?: () => void;
  isLast?: boolean;
}) {
  const rowStyle = [styles.contactRow, isLast && styles.contactRowLast];

  const content = (
    <>
      <View style={styles.contactIconWrap}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.contactTextWrap}>
        <Text style={styles.contactLabel}>{label}</Text>
        <Text style={[styles.contactValue, onPress && styles.contactValueTappable]} numberOfLines={3}>
          {value}
        </Text>
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={16} color={colors.muted} /> : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        onPress={onPress}
        style={({ pressed }) => [rowStyle, pressed && styles.contactRowPressed]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={rowStyle}>{content}</View>;
}

const styles = StyleSheet.create({
  outer: {
    marginTop: spacing["2xl"],
    backgroundColor: colors.borderLight,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  wrapper: {
    paddingTop: spacing["2xl"],
    gap: spacing.xl,
  },
  brandSection: {
    gap: spacing.sm,
  },
  storeName: {
    ...textStyles.sectionTitle,
    fontSize: typography.xl,
    color: colors.navy,
  },
  tagline: {
    ...textStyles.bodySmall,
    lineHeight: 22,
  },
  section: {
    gap: spacing.md,
  },
  sectionLabel: {
    ...textStyles.caption,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: colors.textSecondary,
  },
  contactCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: "hidden",
  },
  contactLoading: {
    ...textStyles.bodySmall,
    padding: spacing.lg,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  contactRowLast: {
    borderBottomWidth: 0,
  },
  contactRowPressed: {
    backgroundColor: colors.primaryMuted,
  },
  contactIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  contactTextWrap: {
    flex: 1,
    gap: 2,
  },
  contactLabel: {
    fontSize: typography.xs,
    fontWeight: "600",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  contactValue: {
    fontSize: typography.sm,
    color: colors.text,
    lineHeight: 20,
  },
  contactValueTappable: {
    color: colors.primary,
  },
  newsletterSection: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.primarySubtle,
  },
  newsletterEyebrow: {
    fontSize: typography.base,
    fontWeight: "700",
    color: colors.primary,
  },
  newsletterLead: {
    ...textStyles.bodySmall,
    marginTop: -spacing.xs,
  },
  newsletterHint: {
    ...textStyles.caption,
    color: colors.muted,
    marginTop: -spacing.xs,
  },
  securitySection: {
    gap: spacing.sm,
  },
  securityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  securityText: {
    fontSize: typography.sm,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  paymentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  paymentBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  paymentBadgeText: {
    fontSize: typography.xs,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  legalSection: {
    alignItems: "center",
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  copyright: {
    fontSize: typography.sm,
    color: colors.muted,
    textAlign: "center",
  },
  legalLinks: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  legalLink: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  legalLinkPressed: {
    opacity: 0.7,
  },
  legalLinkText: {
    fontSize: typography.sm,
    fontWeight: "600",
    color: colors.primary,
  },
});
