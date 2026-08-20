import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { useState } from "react";
import {
  Keyboard,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { colors, radius, spacing, textStyles, typography } from "@/constants/theme";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { api } from "@/lib/convex-api";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type NewsletterStatus = "idle" | "loading" | "success" | "already_subscribed" | "error";

export function FooterNewsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<NewsletterStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const subscribe = useMutation(api.subscribers.subscribe);

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setStatus("error");
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (!EMAIL_PATTERN.test(trimmed) || trimmed.length > 254) {
      setStatus("error");
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setStatus("loading");
    setErrorMessage(null);

    try {
      const result = await subscribe({ email: trimmed, source: "footer" });

      if (result.status === "already_subscribed") {
        setStatus("already_subscribed");
        return;
      }

      setEmail("");
      setStatus("success");
      Keyboard.dismiss();
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        getFriendlyErrorMessage(error, "Something went wrong. Please try again.")
      );
    }
  };

  if (status === "success") {
    return (
      <View style={styles.successBox} accessibilityLiveRegion="polite">
        <View style={styles.successRow}>
          <Ionicons name="checkmark-circle" size={22} color={colors.success} />
          <Text style={styles.successTitle}>You&apos;re subscribed!</Text>
        </View>
        <Text style={styles.successBody}>
          Thanks! We&apos;ll keep you updated with new arrivals and exclusive offers.
        </Text>
      </View>
    );
  }

  if (status === "already_subscribed") {
    return (
      <View style={styles.infoBox} accessibilityLiveRegion="polite">
        <Text style={styles.infoTitle}>You&apos;re already subscribed.</Text>
        <Text style={styles.infoBody}>
          This email is already on our newsletter list.
        </Text>
      </View>
    );
  }

  const isLoading = status === "loading";

  return (
    <View style={styles.form}>
      <Input
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          if (status === "error") {
            setStatus("idle");
            setErrorMessage(null);
          }
        }}
        placeholder="Your email address"
        accessibilityLabel="Email for newsletter"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="done"
        onSubmitEditing={() => void handleSubmit()}
        editable={!isLoading}
        error={errorMessage ?? undefined}
      />
      <Button
        label={isLoading ? "Subscribing…" : "Subscribe"}
        onPress={() => void handleSubmit()}
        loading={isLoading}
        disabled={isLoading}
        fullWidth
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.sm,
  },
  successBox: {
    backgroundColor: colors.successMuted,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(16, 185, 129, 0.25)",
  },
  successRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  successTitle: {
    fontSize: typography.base,
    fontWeight: "600",
    color: colors.foreground,
  },
  successBody: {
    ...textStyles.bodySmall,
    color: colors.text,
  },
  infoBox: {
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primarySubtle,
  },
  infoTitle: {
    fontSize: typography.base,
    fontWeight: "600",
    color: colors.foreground,
  },
  infoBody: {
    ...textStyles.bodySmall,
  },
});
