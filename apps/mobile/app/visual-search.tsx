import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/feedback/EmptyState";
import { OfflineNotice } from "@/components/feedback/OfflineNotice";
import { Header } from "@/components/layout/Header";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { ProductCard } from "@/components/products/ProductCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ProductCardSkeleton } from "@/components/ui/Skeleton";
import {
  createTextStyles,
  radius,
  spacing,
  typography,
  type ColorPalette,
} from "@/constants/theme";
import { useLayoutMetrics } from "@/hooks/useLayoutMetrics";
import { useScreenRootStyle } from "@/hooks/useScreenStyles";
import { useVisualProductSearch } from "@/hooks/useVisualProductSearch";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { ensureOnlineNow, refreshNetworkSnapshot } from "@/lib/network";
import { searchResultToProduct } from "@/lib/product-adapters";
import type { PickedVisualSearchImage } from "@/lib/visual-search-picker";
import {
  pickVisualSearchFromCamera,
  pickVisualSearchFromLibrary,
} from "@/lib/visual-search-picker";
import { getSearchSessionId } from "@/lib/visitor-id";
import { useTheme } from "@/providers/theme-context";
import { useToast } from "@/providers/toast-context";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type ScreenPhase = "empty" | "preview" | "results";

export default function VisualSearchScreen() {
  const insets = useSafeAreaInsets();
  const { horizontalPadding, gridGap } = useLayoutMetrics();
  const rootStyle = useScreenRootStyle();
  const { colors, textStyles } = useTheme();
  const styles = useMemo(
    () => createStyles(colors, textStyles),
    [colors, textStyles]
  );
  const { showError } = useToast();
  const isOnline = useOnlineStatus();

  const [selectedImage, setSelectedImage] = useState<PickedVisualSearchImage | null>(null);
  const [textQuery, setTextQuery] = useState("");
  const [referenceExpanded, setReferenceExpanded] = useState(true);
  const [pickingSource, setPickingSource] = useState<"camera" | "library" | null>(null);

  const {
    products,
    totalCount,
    isLoading,
    errorMessage,
    hasSearched,
    search,
    reset,
  } = useVisualProductSearch();

  const phase: ScreenPhase = useMemo(() => {
    if (hasSearched) return "results";
    if (selectedImage) return "preview";
    return "empty";
  }, [hasSearched, selectedImage]);

  const handlePick = useCallback(
    async (source: "camera" | "library") => {
      setPickingSource(source);
      try {
        const image =
          source === "camera"
            ? await pickVisualSearchFromCamera()
            : await pickVisualSearchFromLibrary();

        if (image) {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          reset();
          setSelectedImage(image);
          setTextQuery("");
        }
      } catch (error) {
        showError(getFriendlyErrorMessage(error, "Could not access photo. Check permissions."));
      } finally {
        setPickingSource(null);
      }
    },
    [reset, showError]
  );

  const handleSearch = useCallback(async () => {
    if (!selectedImage) return;
    try {
      await ensureOnlineNow("Visual search requires an internet connection.");
    } catch (error) {
      showError(getFriendlyErrorMessage(error, "Visual search requires an internet connection."));
      return;
    }
    const sessionId = await getSearchSessionId();
    await search({
      image: selectedImage,
      textQuery: textQuery.trim() || undefined,
      sessionId,
    });
  }, [search, selectedImage, textQuery, showError]);

  const handleSearchAgain = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    reset();
    setSelectedImage(null);
    setTextQuery("");
  }, [reset]);

  const handleChooseAnother = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    reset();
    setSelectedImage(null);
    setTextQuery("");
  }, [reset]);

  const mappedProducts = useMemo(
    () => products.map(searchResultToProduct),
    [products]
  );

  const renderEmptyState = () => (
    <ScrollView
      contentContainerStyle={[
        styles.emptyContent,
        { paddingHorizontal: horizontalPadding, paddingBottom: insets.bottom + spacing["3xl"] },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroIconWrap}>
        <Ionicons name="camera-outline" size={40} color={colors.primary} />
      </View>
      <Text style={styles.heroTitle}>Find products from a photo</Text>
      <Text style={styles.heroCopy}>
        Upload a photo and we&apos;ll find visually similar products.
      </Text>

      {!isOnline ? (
        <OfflineNotice
          title="Visual search requires an internet connection."
          message="Please reconnect to search with a photo."
          onRetry={() => void refreshNetworkSnapshot()}
        />
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Choose a photo from your library"
        disabled={!isOnline}
        onPress={() => void handlePick("library")}
        style={({ pressed }) => [styles.uploadArea, pressed && styles.uploadAreaPressed]}
      >
        <Ionicons name="cloud-upload-outline" size={32} color={colors.primary} />
        <Text style={styles.uploadTitle}>Tap to upload a photo</Text>
        <Text style={styles.uploadHint}>JPG or PNG · product clearly visible</Text>
      </Pressable>

      <View style={styles.actions}>
        <Button
          label="Take a photo"
          size="lg"
          fullWidth
          disabled={!isOnline}
          loading={pickingSource === "camera"}
          onPress={() => void handlePick("camera")}
        />
        <Button
          label="Choose from library"
          variant="outline"
          size="lg"
          fullWidth
          disabled={!isOnline}
          loading={pickingSource === "library"}
          onPress={() => void handlePick("library")}
        />
      </View>

      <Text style={styles.privacyNote}>
        Your image is used only to find similar products.
      </Text>
    </ScrollView>
  );

  const renderPreviewState = () => (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 8 : 0}
    >
      <ScrollView
        contentContainerStyle={[
          styles.previewContent,
          { paddingHorizontal: horizontalPadding, paddingBottom: insets.bottom + spacing["3xl"] },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.previewImageWrap}>
        <Image
          source={{ uri: selectedImage!.uri }}
          style={styles.previewImage}
          contentFit="cover"
          transition={200}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Remove image"
          onPress={handleChooseAnother}
          style={styles.removeImageBtn}
        >
          <Ionicons name="close" size={18} color={colors.foreground} />
        </Pressable>
      </View>

      <View style={styles.refineSection}>
        <Text style={textStyles.sectionTitle}>Refine your search</Text>
        <Input
          label="Optional details"
          placeholder="black office chair"
          value={textQuery}
          onChangeText={setTextQuery}
          returnKeyType="search"
          onSubmitEditing={() => void handleSearch()}
          hint="Add details to narrow the results."
        />
      </View>

      <View style={styles.previewActions}>
        {!isOnline ? (
          <OfflineNotice
            title="Visual search requires an internet connection."
            message="Please reconnect, then try again."
            onRetry={() => void refreshNetworkSnapshot()}
          />
        ) : null}
        <Button
          label="Find similar products"
          size="lg"
          fullWidth
          disabled={!isOnline}
          onPress={() => void handleSearch()}
        />
        <Button
          label="Choose another photo"
          variant="ghost"
          fullWidth
          onPress={handleChooseAnother}
        />
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderResultsHeader = () => (
    <View style={[styles.resultsHeader, { paddingHorizontal: horizontalPadding }]}>
      <Text style={textStyles.screenTitle}>Visual matches</Text>
      <Text style={styles.resultsSubtitle}>Products similar to your photo</Text>

      {selectedImage ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: referenceExpanded }}
          onPress={() => setReferenceExpanded((value) => !value)}
          style={styles.referenceCard}
        >
          <View style={styles.referenceRow}>
            <Image
              source={{ uri: selectedImage.uri }}
              style={styles.referenceThumb}
              contentFit="cover"
            />
            <View style={styles.referenceText}>
              <Text style={styles.referenceTitle}>Your photo</Text>
              {textQuery.trim() ? (
                <Text style={styles.referenceQuery} numberOfLines={1}>
                  "{textQuery.trim()}"
                </Text>
              ) : null}
            </View>
            <Ionicons
              name={referenceExpanded ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.textSecondary}
            />
          </View>
          {referenceExpanded && textQuery.trim() ? (
            <Text style={styles.referenceExpandedNote}>
              Results matched to your photo and search details.
            </Text>
          ) : null}
        </Pressable>
      ) : null}

      {isLoading ? (
        <View style={styles.searchingBanner}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.searchingText}>Finding similar products…</Text>
        </View>
      ) : null}

      {errorMessage && !isLoading && products.length === 0 ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.destructive} />
          <Text style={styles.errorBannerText}>
            {getFriendlyErrorMessage(errorMessage)}
          </Text>
        </View>
      ) : null}
    </View>
  );

  const renderResultsEmpty = () => {
    if (isLoading) {
      return (
        <View style={[styles.skeletonGrid, { paddingHorizontal: horizontalPadding, gap: gridGap }]}>
          {Array.from({ length: 6 }).map((_, index) => (
            <View key={index} style={styles.gridItem}>
              <ProductCardSkeleton />
            </View>
          ))}
        </View>
      );
    }

    return (
      <View style={{ paddingHorizontal: horizontalPadding }}>
        <EmptyState
          compact
          icon="search-outline"
          title="We couldn't find a close match"
          description="Try another photo, use a clearer image, or shoot from a different angle."
        >
          <View style={styles.emptyTips}>
            <Text style={styles.emptyTip}>• Try another photo</Text>
            <Text style={styles.emptyTip}>• Use a clearer image</Text>
            <Text style={styles.emptyTip}>• Try a different angle</Text>
          </View>
          <View style={styles.emptyResultsActions}>
            <Button label="Try another photo" onPress={handleSearchAgain} />
            <Button
              label="Browse products"
              variant="outline"
              onPress={() => router.push("/(tabs)/shop")}
            />
          </View>
        </EmptyState>
      </View>
    );
  };

  const renderResults = () => (
    <FlatList
      data={mappedProducts}
      keyExtractor={(item) => item._id}
      numColumns={2}
      ListHeaderComponent={renderResultsHeader}
      ListEmptyComponent={renderResultsEmpty}
      columnWrapperStyle={[styles.gridRow, { gap: gridGap, paddingHorizontal: horizontalPadding }]}
      contentContainerStyle={{
        paddingBottom: insets.bottom + spacing["3xl"],
        gap: gridGap,
      }}
      renderItem={({ item }) => (
        <View style={styles.gridItem}>
          <ProductCard product={item} showActions />
        </View>
      )}
      ListFooterComponent={
        hasSearched && !isLoading ? (
          <View style={[styles.resultsFooter, { paddingHorizontal: horizontalPadding }]}>
            {products.length > 0 ? (
              <Text style={styles.resultCount}>
                {totalCount} match{totalCount === 1 ? "" : "es"} found
              </Text>
            ) : null}
            <Button label="Search again" variant="outline" onPress={handleSearchAgain} />
          </View>
        ) : null
      }
    />
  );

  return (
    <ScreenContainer>
      <View style={[styles.container, rootStyle]}>
        <Header title="Visual Search" showBack showSearch={false} showCart={false} />
        {phase === "empty" && renderEmptyState()}
        {phase === "preview" && renderPreviewState()}
        {phase === "results" && renderResults()}
      </View>
    </ScreenContainer>
  );
}

function createStyles(
  colors: ColorPalette,
  textStyles: ReturnType<typeof createTextStyles>
) {
  return StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  emptyContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingTop: spacing["2xl"],
    gap: spacing.lg,
  },
  uploadArea: {
    width: "100%",
    minHeight: 168,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.primarySubtle,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.xl,
  },
  uploadAreaPressed: {
    opacity: 0.88,
  },
  uploadTitle: {
    fontSize: typography.base,
    fontWeight: "600",
    color: colors.foreground,
  },
  uploadHint: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  heroIconWrap: {
    width: 88,
    height: 88,
    borderRadius: radius.xl,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  heroTitle: {
    ...textStyles.screenTitle,
    textAlign: "center",
  },
  heroCopy: {
    ...textStyles.bodySmall,
    textAlign: "center",
    maxWidth: 320,
  },
  actions: {
    width: "100%",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  privacyNote: {
    fontSize: typography.xs,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  previewContent: {
    paddingTop: spacing.lg,
    gap: spacing.xl,
  },
  previewImageWrap: {
    aspectRatio: 4 / 3,
    borderRadius: radius.xl,
    overflow: "hidden",
    backgroundColor: colors.borderLight,
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  removeImageBtn: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  refineSection: {
    gap: spacing.md,
  },
  previewActions: {
    gap: spacing.sm,
  },
  resultsHeader: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  resultsSubtitle: {
    ...textStyles.bodySmall,
  },
  referenceCard: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  referenceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  referenceThumb: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.borderLight,
  },
  referenceText: {
    flex: 1,
    gap: 2,
  },
  referenceTitle: {
    fontSize: typography.sm,
    fontWeight: "600",
    color: colors.foreground,
  },
  referenceQuery: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  referenceExpandedNote: {
    marginTop: spacing.sm,
    fontSize: typography.xs,
    color: colors.muted,
  },
  searchingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.md,
  },
  searchingText: {
    fontSize: typography.sm,
    color: colors.primary,
    fontWeight: "500",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.destructiveMuted,
    borderRadius: radius.md,
  },
  errorBannerText: {
    flex: 1,
    fontSize: typography.sm,
    color: colors.destructive,
    lineHeight: 20,
  },
  skeletonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  gridRow: {
    marginBottom: 0,
    alignItems: "stretch",
  },
  gridItem: {
    flex: 1,
  },
  resultsFooter: {
    paddingTop: spacing.xl,
    gap: spacing.md,
    alignItems: "center",
  },
  resultCount: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  emptyResultsActions: {
    width: "100%",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  emptyTips: {
    gap: 4,
    marginTop: spacing.sm,
  },
  emptyTip: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
}
