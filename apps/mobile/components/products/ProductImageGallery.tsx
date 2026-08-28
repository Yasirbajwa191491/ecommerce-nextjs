import {
  getPrimaryImageAlt,
  getPrimaryImageUrl,
  orderImagesForDisplay,
  type ProductImageEntry,
} from "@ecommerce/shared";
import { Image } from "expo-image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { spacing } from "@/constants/theme";
import { useLayoutMetrics } from "@/hooks/useLayoutMetrics";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";
import { useTheme } from "@/providers/theme-context";
import type { Product } from "@/types/product";

type ProductImageGalleryProps = {
  product: Product;
  images?: ProductImageEntry[];
  activeIndex?: number;
  onActiveIndexChange?: (index: number) => void;
};

export function ProductImageGallery({
  product,
  images: imagesProp,
  activeIndex: controlledIndex,
  onActiveIndexChange,
}: ProductImageGalleryProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createProductImageGalleryStyles);
  const { contentWidth } = useLayoutMetrics();
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const galleryWidth = measuredWidth > 0 ? measuredWidth : contentWidth;
  const galleryHeight = galleryWidth * 0.85;

  const [scrollIndex, setScrollIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const isProgrammaticScrollRef = useRef(false);

  const images = useMemo(() => {
    if (imagesProp?.length) return imagesProp;
    const ordered = orderImagesForDisplay(product);
    return ordered.length
      ? ordered
      : [{ url: getPrimaryImageUrl(product), alt: product.name }];
  }, [imagesProp, product]);

  const commitIndex = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, Math.max(images.length - 1, 0)));
      setScrollIndex(clamped);
      onActiveIndexChange?.(clamped);
    },
    [images.length, onActiveIndexChange]
  );

  const scrollToIndex = useCallback(
    (index: number, animated = true) => {
      if (galleryWidth <= 0) return;
      const clamped = Math.max(0, Math.min(index, Math.max(images.length - 1, 0)));
      isProgrammaticScrollRef.current = true;
      scrollRef.current?.scrollTo({
        x: clamped * galleryWidth,
        animated,
      });
    },
    [galleryWidth, images.length]
  );

  useEffect(() => {
    if (controlledIndex === undefined || galleryWidth <= 0) return;
    scrollToIndex(controlledIndex);
  }, [controlledIndex, galleryWidth, scrollToIndex]);

  const displayIndex =
    controlledIndex !== undefined
      ? Math.max(0, Math.min(controlledIndex, Math.max(images.length - 1, 0)))
      : Math.max(0, Math.min(scrollIndex, Math.max(images.length - 1, 0)));

  if (galleryWidth <= 0) {
    return (
      <View
        style={styles.wrapper}
        onLayout={(event) => {
          const width = event.nativeEvent.layout.width;
          if (width > 0) {
            setMeasuredWidth(width);
          }
        }}
      />
    );
  }

  return (
    <View
      style={styles.wrapper}
      onLayout={(event) => {
        const width = event.nativeEvent.layout.width;
        if (width > 0 && width !== measuredWidth) {
          setMeasuredWidth(width);
        }
      }}
    >
      <View style={[styles.container, { width: galleryWidth }]}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          style={{ width: galleryWidth, height: galleryHeight }}
          contentContainerStyle={{ height: galleryHeight }}
          scrollEventThrottle={16}
          onScroll={(event) => {
            if (isProgrammaticScrollRef.current) return;
            const index = Math.round(event.nativeEvent.contentOffset.x / galleryWidth);
            setScrollIndex((current) => (current === index ? current : index));
          }}
          onMomentumScrollEnd={(event) => {
            isProgrammaticScrollRef.current = false;
            const index = Math.round(event.nativeEvent.contentOffset.x / galleryWidth);
            commitIndex(index);
          }}
          onScrollEndDrag={() => {
            isProgrammaticScrollRef.current = false;
          }}
        >
          {images.map((img, index) => (
            <View
              key={`${img.url}-${index}`}
              style={{
                width: galleryWidth,
                height: galleryHeight,
                flexShrink: 0,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.background,
                overflow: "hidden",
              }}
            >
              {img.url ? (
                <Image
                  source={{ uri: img.url }}
                  style={{ width: galleryWidth, height: galleryHeight }}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                  accessibilityLabel={img.alt ?? getPrimaryImageAlt(product)}
                />
              ) : (
                <View style={styles.placeholder} />
              )}
            </View>
          ))}
        </ScrollView>

        {images.length > 1 ? (
          <View style={styles.dots}>
            {images.map((_, index) => {
              const active = index === displayIndex;
              return (
                <Pressable
                  key={index}
                  accessibilityRole="button"
                  accessibilityLabel={`View image ${index + 1}`}
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    scrollToIndex(index);
                    commitIndex(index);
                  }}
                  hitSlop={12}
                  style={[styles.dot, active && styles.dotActive]}
                />
              );
            })}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function createProductImageGalleryStyles({ colors }: ThemeStyleTokens) {
  return StyleSheet.create({
    wrapper: {
      width: "100%" as const,
      overflow: "hidden" as const,
    },
    container: {
      backgroundColor: colors.surface,
      overflow: "hidden" as const,
    },
    placeholder: {
      flex: 1,
      width: "100%" as const,
      backgroundColor: colors.background,
    },
    dots: {
      flexDirection: "row" as const,
      justifyContent: "center" as const,
      alignItems: "center" as const,
      gap: 6,
      paddingVertical: spacing.md,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.border,
    },
    dotActive: {
      backgroundColor: colors.primary,
      width: 20,
    },
  });
}
