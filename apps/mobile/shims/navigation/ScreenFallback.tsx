import type { ReactNode } from "react";
import { View, type StyleProp, type ViewProps, type ViewStyle } from "react-native";

type ScreensModule = typeof import("react-native-screens");

type ScreenFallbackProps = ViewProps & {
  enabled: boolean;
  active: 0 | 1 | 2;
  children: ReactNode;
  freezeOnBlur?: boolean;
  shouldFreeze: boolean;
  style?: StyleProp<ViewStyle>;
};

let Screens: ScreensModule | undefined;
try {
  Screens = require("react-native-screens") as ScreensModule;
} catch {
  Screens = undefined;
}

export function MaybeScreenContainer({
  enabled,
  ...rest
}: ViewProps & {
  enabled: boolean;
  hasTwoStates: boolean;
  children: ReactNode;
}) {
  if (Screens?.screensEnabled?.()) {
    return <Screens.ScreenContainer enabled={enabled} {...rest} />;
  }

  return <View {...rest} />;
}

export function MaybeScreen({
  enabled,
  active,
  pointerEvents,
  style,
  ...rest
}: ScreenFallbackProps) {
  const screenStyle = pointerEvents != null ? [style, { pointerEvents }] : style;

  if (Screens?.screensEnabled?.()) {
    return (
      <Screens.Screen
        enabled={enabled}
        activityState={active}
        style={screenStyle}
        {...rest}
      />
    );
  }

  return <View style={screenStyle} {...rest} />;
}
