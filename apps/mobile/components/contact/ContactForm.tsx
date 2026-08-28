import { useMutation } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { radius, spacing, typography } from "@/constants/theme";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";
import {
  CONTACT_INQUIRY_SUBJECTS,
  contactSubjectLabel,
} from "@/lib/contact-inquiry-subjects";
import { api } from "@/lib/convex-api";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { ensureOnlineNow } from "@/lib/network";
import {
  clearContactDraft,
  loadContactDraft,
  saveContactDraft,
} from "@/lib/offline/drafts";
import {
  validateContactForm,
  type ContactFormValues,
} from "@/lib/validation/contact-form";
import { useTheme } from "@/providers/theme-context";
import { useToast } from "@/providers/toast-context";

const emptyForm = (): ContactFormValues => ({
  name: "",
  email: "",
  subject: "",
  message: "",
});

export function ContactForm() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createContactFormStyles);
  const { showError, showSuccess } = useToast();
  const submit = useMutation(api.contactMessages.submit);

  const [form, setForm] = useState<ContactFormValues>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormValues, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof ContactFormValues, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [subjectPickerOpen, setSubjectPickerOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadContactDraft().then((draft) => {
      if (!cancelled) {
        if (draft) setForm(draft);
        setDraftReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!draftReady || submitted) return;
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      void saveContactDraft(form);
    }, 400);
    return () => {
      if (draftTimer.current) clearTimeout(draftTimer.current);
    };
  }, [form, submitted, draftReady]);

  const fieldError = useCallback(
    (field: keyof ContactFormValues) => (touched[field] ? errors[field] : undefined),
    [errors, touched]
  );

  const touch = (field: keyof ContactFormValues) => {
    setTouched((current) => ({ ...current, [field]: true }));
    setErrors(validateContactForm(form));
  };

  const updateField = <K extends keyof ContactFormValues>(field: K, value: ContactFormValues[K]) => {
    const next = { ...form, [field]: value };
    setForm(next);
    if (touched[field]) {
      setErrors(validateContactForm(next));
    }
  };

  const handleSubmit = async () => {
    const nextErrors = validateContactForm(form);
    setErrors(nextErrors);
    setTouched({ name: true, email: true, subject: true, message: true });

    if (Object.keys(nextErrors).length > 0) return;

    try {
      await ensureOnlineNow("You're offline. Connect to send your message.");
    } catch (error) {
      showError(getFriendlyErrorMessage(error, "You're offline. Connect to send your message."));
      return;
    }

    setSubmitting(true);
    try {
      await submit({
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject,
        message: form.message.trim(),
      });
      setSubmitted(true);
      await clearContactDraft();
      showSuccess(
        "Message sent — We've received your message and will get back to you soon."
      );
      setForm(emptyForm());
      setTouched({});
      setErrors({});
    } catch (error) {
      showError(
        getFriendlyErrorMessage(error, "We couldn't send your message. Please try again.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card style={styles.successCard}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={40} color={colors.success} />
        </View>
        <Text style={styles.successTitle}>Message sent</Text>
        <Text style={styles.successBody}>
          We&apos;ve received your message and will get back to you soon.
        </Text>
        <Button
          label="Send another message"
          variant="outline"
          onPress={() => setSubmitted(false)}
        />
      </Card>
    );
  }

  return (
    <>
      <Card style={styles.formCard}>
        <Text style={styles.formTitle}>Send us a message</Text>
        <Text style={styles.formHint}>
          Fill in the form below and our team will get back to you shortly.
        </Text>

        <Input
          label="Name"
          value={form.name}
          onChangeText={(value) => updateField("name", value)}
          onBlur={() => touch("name")}
          placeholder="Your full name"
          error={fieldError("name")}
          accessibilityLabel="Name"
        />

        <Input
          label="Email"
          value={form.email}
          onChangeText={(value) => updateField("email", value)}
          onBlur={() => touch("email")}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          error={fieldError("email")}
          accessibilityLabel="Email"
        />

        <View style={styles.field}>
          <Text style={styles.label}>Reason for contacting</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Select inquiry category"
            onPress={() => setSubjectPickerOpen(true)}
            style={[styles.selectTrigger, fieldError("subject") ? styles.selectError : null]}
          >
            <Text
              style={[
                styles.selectText,
                !form.subject && styles.selectPlaceholder,
              ]}
            >
              {form.subject ? contactSubjectLabel(form.subject) : "Select a category"}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
          </Pressable>
          {fieldError("subject") ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {fieldError("subject")}
            </Text>
          ) : null}
        </View>

        <Input
          label="Message"
          value={form.message}
          onChangeText={(value) => updateField("message", value)}
          onBlur={() => touch("message")}
          placeholder="How can we help you today?"
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          style={styles.textarea}
          error={fieldError("message")}
          accessibilityLabel="Message"
        />

        <Button
          label={submitting ? "Sending…" : "Send message"}
          loading={submitting}
          fullWidth
          onPress={() => void handleSubmit()}
          accessibilityLabel="Send message"
        />
      </Card>

      <Modal
        visible={subjectPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSubjectPickerOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSubjectPickerOpen(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Reason for contacting</Text>
            <ScrollView>
              {CONTACT_INQUIRY_SUBJECTS.map((item) => (
                <Pressable
                  key={item.value}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  onPress={() => {
                    updateField("subject", item.value);
                    touch("subject");
                    setSubjectPickerOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.modalOption,
                    form.subject === item.value && styles.modalOptionSelected,
                    pressed && styles.modalOptionPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      form.subject === item.value && styles.modalOptionTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {form.subject === item.value ? (
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function createContactFormStyles({ colors, textStyles }: ThemeStyleTokens) {
  return StyleSheet.create({
  formCard: {
    gap: spacing.lg,
    borderRadius: radius.lg,
  },
  formTitle: {
    ...textStyles.sectionTitle,
    fontSize: typography.xl,
    color: colors.foreground,
  },
  formHint: {
    ...textStyles.bodySmall,
    marginTop: -spacing.sm,
    color: colors.textSecondary,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: typography.sm,
    fontWeight: "600" as const,
    color: colors.foreground,
  },
  selectTrigger: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    backgroundColor: colors.surface,
  },
  selectError: {
    borderColor: colors.destructive,
  },
  selectText: {
    fontSize: typography.base,
    color: colors.foreground,
    flex: 1,
  },
  selectPlaceholder: {
    color: colors.mutedForeground,
  },
  error: {
    fontSize: typography.sm,
    color: colors.destructive,
  },
  textarea: {
    minHeight: 140,
    paddingTop: 12,
  },
  successCard: {
    alignItems: "center" as const,
    gap: spacing.md,
    borderRadius: radius.lg,
    paddingVertical: spacing["2xl"],
  },
  successIcon: {
    marginBottom: spacing.xs,
  },
  successTitle: {
    ...textStyles.sectionTitle,
    fontSize: typography.xl,
    color: colors.foreground,
  },
  successBody: {
    ...textStyles.body,
    textAlign: "center" as const,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end" as const,
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing["2xl"],
    maxHeight: "70%" as const,
  },
  modalHandle: {
    alignSelf: "center" as const,
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  modalTitle: {
    ...textStyles.sectionTitle,
    marginBottom: spacing.md,
    color: colors.foreground,
  },
  modalOption: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
    minHeight: 52,
  },
  modalOptionSelected: {
    backgroundColor: colors.primaryMuted,
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  modalOptionPressed: {
    opacity: 0.85,
  },
  modalOptionText: {
    fontSize: typography.base,
    color: colors.foreground,
  },
  modalOptionTextSelected: {
    color: colors.primary,
    fontWeight: "600" as const,
  },
});
}
