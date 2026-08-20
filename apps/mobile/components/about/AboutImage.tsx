import { Image } from "expo-image";
import { StyleSheet, View, ViewStyle } from "react-native";

import { colors, radius, shadows } from "@/constants/theme";

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
  return (
    <View style={[styles.frame, style]}>
      <Image
        source={{ uri: src }}
        accessibilityLabel={alt}
        contentFit="cover"
        transition={300}
        priority={priority ? "high" : "normal"}
        style={[styles.image, { aspectRatio }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: radius.xl,
    overflow: "hidden",
    backgroundColor: colors.borderLight,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.md,
  },
  image: {
    width: "100%",
  },
});
