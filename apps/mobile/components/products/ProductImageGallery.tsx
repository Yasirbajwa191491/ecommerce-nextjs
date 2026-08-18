import { getPrimaryImageAlt, getPrimaryImageUrl } from "@ecommerce/shared";
import { Image } from "expo-image";
import { useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { colors, spacing } from "@/constants/theme";
import type { Product } from "@/types/product";

type ProductImageGalleryProps = {
  product: Product;
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export function ProductImageGallery({ product }: ProductImageGalleryProps) {
  const images = product.image?.length
    ? product.image
    : [{ url: getPrimaryImageUrl(product), alt: product.name }];
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(
            e.nativeEvent.contentOffset.x / SCREEN_WIDTH
          );
          setActiveIndex(index);
        }}
      >
        {images.map((img, index) => (
          <View key={index} style={styles.slide}>
            {img.url ? (
              <Image
                source={{ uri: img.url }}
                style={styles.image}
                contentFit="contain"
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
          {images.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, index === activeIndex && styles.dotActive]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
  },
  slide: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.85,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    flex: 1,
    width: "100%",
    backgroundColor: colors.background,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.md,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 18,
  },
});
