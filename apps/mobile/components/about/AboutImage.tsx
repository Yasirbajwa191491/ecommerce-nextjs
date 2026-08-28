import { Image } from "expo-image";
import { StyleSheet, View, ViewStyle } from "react-native";

import { radius } from "@/constants/theme";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";

type AboutImageProps = {
  src: string;
  alt: string;
  aspectRatio?: number;
  style?: ViewStyle;
  priority?: boolean;
};

export function AboutImage({
  src,
  alt,
  aspectRatio = 4 / 3,
  style,
  priority = false,
}: AboutImageProps) {
  const styles = useThemedStyles(createAboutImageStyles);

  return (
    <View style={[styles.frame, style]}>
      <Image
        source={{ uri: src }}
        accessibilityLabel={alt}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={300}
        priority={priority ? "high" : "normal"}
        style={[styles.image, { aspectRatio }]}
      />
    </View>
  );
}

function createAboutImageStyles({ colors, shadows }: ThemeStyleTokens) {
  return StyleSheet.create({
    frame: {
      borderRadius: radius.xl,
      overflow: "hidden" as const,
      backgroundColor: colors.borderLight,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      ...shadows.md,
    },
    image: {
      width: "100%" as const,
    },
  });
}
