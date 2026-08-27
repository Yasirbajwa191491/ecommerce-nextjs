import { useMutation } from "convex/react";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ReviewCard } from "@/components/reviews/ReviewCard";
import { ReviewImageUpload } from "@/components/reviews/ReviewImageUpload";
import { ReviewStarsInput } from "@/components/reviews/ReviewStarsInput";
import type { OrderReviewStatus, PublicReview } from "@/components/reviews/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { radius, spacing, typography } from "@/constants/theme";
import { api } from "@/lib/convex-api";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { triggerHaptic } from "@/lib/haptics";
import {
  validateReviewForm,
  type ReviewFormValues,
} from "@/lib/validation/review-forms";
import { useTheme } from "@/providers/theme-context";
import { useToast } from "@/providers/toast-context";
import type { Id } from "@convex/_generated/dataModel";

type OrderItemReviewPanelProps = {
  orderNumber: string;
  customerEmail: string;
  accessToken?: string;
  productId: Id<"products">;
  productName: string;
  status: OrderReviewStatus;
  review?: PublicReview;
  initialImageStorageIds?: Id<"_storage">[];
  defaultExpanded?: boolean;
};

const emptyForm = (): ReviewFormValues => ({
  rating: 0,
  title: "",
  content: "",
});

export function OrderItemReviewPanel({
  orderNumber,
  customerEmail,
  accessToken,
  productId,
  productName,
  status,
  review,
  initialImageStorageIds = [],
  defaultExpanded = false,
}: OrderItemReviewPanelProps) {
  const { showError, showSuccess } = useToast();
  const { colors, textStyles } = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<keyof ReviewFormValues, boolean>>>({});
  const [form, setForm] = useState<ReviewFormValues>(() =>
    review
      ? { rating: review.rating, title: review.title, content: review.content }
      : emptyForm()
  );
  const [imageStorageIds, setImageStorageIds] =
    useState<Id<"_storage">[]>(initialImageStorageIds);
  const [previewUrls, setPreviewUrls] = useState<string[]>(review?.imageUrls ?? []);

  const createReview = useMutation(api.productReviews.createReview);
  const updateReview = useMutation(api.productReviews.updateReview);
  const deleteReview = useMutation(api.productReviews.deleteReview);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        writeBtn: { alignSelf: "flex-start", marginTop: spacing.sm },
        approvedWrap: {
          marginTop: spacing.md,
          gap: spacing.md,
          padding: spacing.md,
          borderRadius: radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.successMuted,
          backgroundColor: colors.successMuted,
        },
        pendingWrap: {
          marginTop: spacing.md,
          gap: spacing.md,
          padding: spacing.md,
          borderRadius: radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.warningMuted,
          backgroundColor: colors.warningMuted,
        },
        statusHeader: {
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: spacing.md,
          flexWrap: "wrap",
        },
        statusCopy: { flex: 1, gap: 2 },
        statusTitle: {
          fontSize: typography.sm,
          fontWeight: "600",
          color: colors.foreground,
        },
        statusSubtitle: { fontSize: typography.xs, color: colors.textSecondary },
        actions: { flexDirection: "row", gap: spacing.sm },
        formCard: {
          marginTop: spacing.md,
          gap: spacing.md,
          padding: spacing.lg,
          borderRadius: radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          backgroundColor: colors.chipBackground,
        },
        formTitle: { ...textStyles.sectionTitle, fontSize: typography.base },
        field: { gap: spacing.sm },
        fieldLabel: {
          fontSize: typography.sm,
          fontWeight: "600",
          color: colors.foreground,
        },
        textArea: { minHeight: 96, paddingTop: spacing.md },
        error: { fontSize: typography.xs, color: colors.destructive },
        formActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
        submitBtn: { flexGrow: 1 },
      }),
    [colors, textStyles]
  );

  const errors = useMemo(() => validateReviewForm(form), [form]);
  const visibleErrors = useMemo(() => {
    const result: Partial<Record<keyof ReviewFormValues, string>> = {};
    for (const key of Object.keys(errors) as (keyof ReviewFormValues)[]) {
      if (touched[key]) result[key] = errors[key];
    }
    return result;
  }, [errors, touched]);

  if (status === "not_eligible") return null;

  const touchAll = () => {
    setTouched({ rating: true, title: true, content: true });
  };

  const handleSubmit = async () => {
    touchAll();
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    try {
      if (review && editing) {
        await updateReview({
          reviewId: review._id as Id<"productReviews">,
          orderNumber,
          customerEmail,
          accessToken,
          rating: form.rating,
          title: form.title.trim(),
          content: form.content.trim(),
          imageStorageIds,
        });
        void triggerHaptic("success");
        showSuccess("Review updated");
      } else {
        await createReview({
          orderNumber,
          customerEmail,
          accessToken,
          productId,
          rating: form.rating,
          title: form.title.trim(),
          content: form.content.trim(),
          imageStorageIds: imageStorageIds.length ? imageStorageIds : undefined,
        });
        void triggerHaptic("success");
        showSuccess("Review submitted for approval");
      }
      setExpanded(false);
      setEditing(false);
    } catch (error) {
      showError(getFriendlyErrorMessage(error, "Failed to submit review. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!review) return;
    setSaving(true);
    try {
      await deleteReview({
        reviewId: review._id as Id<"productReviews">,
        orderNumber,
        customerEmail,
        accessToken,
      });
      showSuccess("Review deleted");
      setForm(emptyForm());
      setEditing(false);
      setExpanded(false);
    } catch (error) {
      showError(getFriendlyErrorMessage(error, "Couldn't delete review"));
    } finally {
      setSaving(false);
    }
  };

  if (status === "approved" && review) {
    return (
      <View style={styles.approvedWrap}>
        <View style={styles.statusHeader}>
          <Text style={styles.statusTitle}>Your review for {productName}</Text>
          <Badge label="Published" variant="success" />
        </View>
        <ReviewCard review={review} />
      </View>
    );
  }

  if (status === "pending" && review && !editing) {
    return (
      <View style={styles.pendingWrap}>
        <View style={styles.statusHeader}>
          <View style={styles.statusCopy}>
            <Text style={styles.statusTitle}>Review submitted — awaiting approval</Text>
            <Text style={styles.statusSubtitle}>{productName}</Text>
          </View>
          <View style={styles.actions}>
            <Button
              label="Edit"
              variant="outline"
              size="sm"
              accessibilityLabel={`Edit review for ${productName}`}
              onPress={() => {
                setForm({
                  rating: review.rating,
                  title: review.title,
                  content: review.content,
                });
                setImageStorageIds(initialImageStorageIds);
                setPreviewUrls(review.imageUrls);
                setEditing(true);
                setExpanded(true);
              }}
            />
            <Button
              label="Delete"
              variant="ghost"
              size="sm"
              loading={saving}
              accessibilityLabel={`Delete review for ${productName}`}
              onPress={() => void handleDelete()}
            />
          </View>
        </View>
        <ReviewCard review={review} />
      </View>
    );
  }

  if (!expanded && status === "eligible") {
    return (
      <Button
        label="Write a review"
        variant="outline"
        size="sm"
        accessibilityLabel={`Write a review for ${productName}`}
        onPress={() => setExpanded(true)}
        style={styles.writeBtn}
      />
    );
  }

  if (!expanded) return null;

  return (
    <View style={styles.formCard}>
      <Text style={styles.formTitle}>Review {productName}</Text>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Your rating *</Text>
        <ReviewStarsInput
          value={form.rating}
          productName={productName}
          onChange={(rating) => setForm((current) => ({ ...current, rating }))}
          disabled={saving}
        />
        {visibleErrors.rating ? (
          <Text style={styles.error} accessibilityRole="alert">
            {visibleErrors.rating}
          </Text>
        ) : null}
      </View>

      <Input
        label="Review title *"
        value={form.title}
        onChangeText={(title) => setForm((current) => ({ ...current, title }))}
        onBlur={() => setTouched((current) => ({ ...current, title: true }))}
        placeholder="Summarize your experience"
        editable={!saving}
        error={visibleErrors.title}
        returnKeyType="next"
      />

      <Input
        label="Your review *"
        value={form.content}
        onChangeText={(content) => setForm((current) => ({ ...current, content }))}
        onBlur={() => setTouched((current) => ({ ...current, content: true }))}
        placeholder="What did you like or dislike?"
        editable={!saving}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        style={styles.textArea}
        error={visibleErrors.content}
      />

      <ReviewImageUpload
        orderNumber={orderNumber}
        customerEmail={customerEmail}
        productId={productId}
        storageIds={imageStorageIds}
        previewUrls={previewUrls}
        onChange={(ids, urls) => {
          setImageStorageIds(ids);
          setPreviewUrls(urls);
        }}
        disabled={saving}
      />

      <View style={styles.formActions}>
        <Button
          label="Submit review"
          loading={saving}
          accessibilityLabel={`Submit review for ${productName}`}
          onPress={() => void handleSubmit()}
          style={styles.submitBtn}
        />
        <Button
          label="Cancel"
          variant="ghost"
          disabled={saving}
          onPress={() => {
            setExpanded(false);
            setEditing(false);
          }}
        />
      </View>
    </View>
  );
}
