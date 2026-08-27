import { ReactNode, useMemo } from "react";
import {
  Animated,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from "react-native";

import { animation } from "@/constants/theme";
import { useTheme } from "@/providers/theme-context";

type PressableScaleProps = Omit<PressableProps, "style"> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  scale?: number;
  fill?: boolean;
};

export function PressableScale({
  children,
  style,
  scale = animation.pressScale,
  fill = false,
  disabled,
  onPressIn,
  onPressOut,
  ...props
}: PressableScaleProps) {
  const { reduceMotion } = useTheme();
  const anim = useMemo(() => new Animated.Value(1), []);

  const handlePressIn: PressableProps["onPressIn"] = (e) => {
    if (!disabled && !reduceMotion) {
      Animated.timing(anim, {
        toValue: scale,
        duration: animation.durationFast,
        useNativeDriver: true,
      }).start();
    }
    onPressIn?.(e);
  };

  const handlePressOut: PressableProps["onPressOut"] = (e) => {
    if (!reduceMotion) {
      Animated.timing(anim, {
        toValue: 1,
        duration: animation.durationFast,
        useNativeDriver: true,
      }).start();
    }
    onPressOut?.(e);
  };

  return (
    <Pressable
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={fill ? { flex: 1 } : undefined}
      {...props}
    >
      <Animated.View
        style={[
          fill ? { flex: 1 } : null,
          style,
          reduceMotion ? null : { transform: [{ scale: anim }] },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}
