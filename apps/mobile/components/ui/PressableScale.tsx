import { ReactNode, useMemo } from "react";
import {
  Animated,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from "react-native";

import { animation } from "@/constants/theme";

type PressableScaleProps = Omit<PressableProps, "style"> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  scale?: number;
};

export function PressableScale({
  children,
  style,
  scale = animation.pressScale,
  disabled,
  onPressIn,
  onPressOut,
  ...props
}: PressableScaleProps) {
  const anim = useMemo(() => new Animated.Value(1), []);

  const handlePressIn: PressableProps["onPressIn"] = (e) => {
    if (!disabled) {
      Animated.timing(anim, {
        toValue: scale,
        duration: animation.durationFast,
        useNativeDriver: true,
      }).start();
    }
    onPressIn?.(e);
  };

  const handlePressOut: PressableProps["onPressOut"] = (e) => {
    Animated.timing(anim, {
      toValue: 1,
      duration: animation.durationFast,
      useNativeDriver: true,
    }).start();
    onPressOut?.(e);
  };

  return (
    <Pressable
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...props}
    >
      <Animated.View style={[style, { transform: [{ scale: anim }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
