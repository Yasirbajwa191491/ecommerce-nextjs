import { useMutation } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { radius, spacing, typography, touchTarget } from "@/constants/theme";
import { api } from "@/lib/convex-api";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { useTheme } from "@/providers/theme-context";
import { useToast } from "@/providers/toast-context";
import type { Id } from "@convex/_generated/dataModel";

const MAX_IMAGES = 5;
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

type ReviewImageUploadProps = {
  orderNumber: string;
  customerEmail: string;
  productId: Id<"products">;
  storageIds: Id<"_storage">[];
  previewUrls: string[];
  onChange: (storageIds: Id<"_storage">[], previewUrls: string[]) => void;
  disabled?: boolean;
};

export function ReviewImageUpload({
  orderNumber,
  customerEmail,
  productId,
  storageIds,
  previewUrls,
  onChange,
  disabled = false,
}: ReviewImageUploadProps) {
  const { showError } = useToast();
  const { colors } = useTheme();
  const [uploading, setUploading] = useState(false);
  const generateUploadUrl = useMutation(api.productReviews.generateReviewImageUploadUrl);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { gap: spacing.sm },
        label: { fontSize: typography.sm, fontWeight: "600", color: colors.foreground },
        optional: { fontWeight: "400", color: colors.textSecondary },
        row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
        previewWrap: {
          width: 72,
          height: 72,
          borderRadius: radius.sm,
          overflow: "hidden",
        },
        preview: { width: "100%", height: "100%" },
        removeBtn: {
          position: "absolute",
          top: 4,
          right: 4,
          width: touchTarget / 2,
          height: touchTarget / 2,
          borderRadius: radius.full,
          backgroundColor: colors.overlay,
          alignItems: "center",
          justifyContent: "center",
        },
        addBtn: {
          width: 72,
          height: 72,
          borderRadius: radius.sm,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        },
        addText: { fontSize: typography.xs, color: colors.textSecondary },
      }),
    [colors]
  );

  const pickImages = async () => {
    if (storageIds.length >= MAX_IMAGES) {
      showError(`Maximum ${MAX_IMAGES} images per review`);
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showError("Allow photo access to add review images.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - storageIds.length,
      quality: 0.85,
    });

    if (result.canceled || !result.assets.length) return;

    setUploading(true);
    try {
      const nextIds = [...storageIds];
      const nextUrls = [...previewUrls];

      for (const asset of result.assets) {
        if (nextIds.length >= MAX_IMAGES) break;

        const mimeType = asset.mimeType ?? "image/jpeg";
        if (!ALLOWED_TYPES.includes(mimeType)) {
          showError("Use JPG, PNG, or WEBP images only");
          continue;
        }

        const response = await fetch(asset.uri);
        const blob = await response.blob();
        if (blob.size > MAX_SIZE) {
          showError("Each image must be smaller than 5MB");
          continue;
        }

        const uploadUrl = await generateUploadUrl({
          orderNumber,
          customerEmail,
          productId,
        });

        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": mimeType },
          body: blob,
        });

        if (!uploadResponse.ok) {
          throw new Error("Upload failed");
        }

        const data = (await uploadResponse.json()) as { storageId?: string };
        if (!data.storageId) {
          throw new Error("Upload failed");
        }

        nextIds.push(data.storageId as Id<"_storage">);
        nextUrls.push(asset.uri);
      }

      onChange(nextIds, nextUrls);
    } catch (error) {
      showError(getFriendlyErrorMessage(error, "Failed to upload image. Please try again."));
    } finally {
      setUploading(false);
    }
  };

  const removeAt = (index: number) => {
    onChange(
      storageIds.filter((_, i) => i !== index),
      previewUrls.filter((_, i) => i !== index)
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        Photos <Text style={styles.optional}>(optional)</Text>
      </Text>
      <View style={styles.row}>
        {previewUrls.map((url, index) => (
          <View key={`${url}-${index}`} style={styles.previewWrap}>
            <Image
              source={{ uri: url }}
              style={styles.preview}
              contentFit="cover"
              accessibilityLabel={`Review photo ${index + 1}`}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove review photo ${index + 1}`}
              disabled={disabled}
              hitSlop={8}
              onPress={() => removeAt(index)}
              style={styles.removeBtn}
            >
              <Ionicons name="close" size={14} color={colors.primaryText} />
            </Pressable>
          </View>
        ))}
        {storageIds.length < MAX_IMAGES ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add review photo"
            disabled={disabled || uploading}
            onPress={() => void pickImages()}
            style={styles.addBtn}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={colors.cta} />
            ) : (
              <>
                <Ionicons name="image-outline" size={20} color={colors.textSecondary} />
                <Text style={styles.addText}>Add</Text>
              </>
            )}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
