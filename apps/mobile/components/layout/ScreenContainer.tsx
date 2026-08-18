import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { layout } from "@/constants/theme";
import { useLayoutMetrics } from "@/hooks/useLayoutMetrics";

type ScreenContainerProps = {
  children: ReactNode;
};

/** Centers content and caps width on tablets / web preview. */
export function ScreenContainer({ children }: ScreenContainerProps) {
  const { contentWidth, screenWidth } = useLayoutMetrics();
  const needsCenter = screenWidth > layout.maxContentWidth;

  return (
    <View style={[styles.outer, needsCenter && styles.centered]}>
      <View style={[styles.inner, { width: contentWidth }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
  },
  centered: {
    alignItems: "center",
  },
  inner: {
    flex: 1,
  },
});

export function useScreenPadding() {
  const { horizontalPadding } = useLayoutMetrics();
  return horizontalPadding;
}
