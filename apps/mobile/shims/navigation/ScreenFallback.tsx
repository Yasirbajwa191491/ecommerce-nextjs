import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";

// Metro uses this file only on web. Preserve the tab screen's absolute-fill layout.
export function MaybeScreenContainer({ enabled: _enabled, hasTwoStates: _hasTwoStates, ...props }: ViewProps & {
  enabled: boolean; hasTwoStates: boolean; children: ReactNode;
}) {
  return <View {...props} />;
}

export function MaybeScreen({ enabled: _enabled, active, freezeOnBlur: _freezeOnBlur, shouldFreeze: _shouldFreeze,
  pointerEvents, style, ...props }: ViewProps & {
  enabled: boolean; active: 0 | 1 | 2; children: ReactNode; freezeOnBlur?: boolean; shouldFreeze: boolean;
}) {
  return <View {...props} style={[style, { display: active === 0 ? "none" : "flex", pointerEvents }]} />;
}
