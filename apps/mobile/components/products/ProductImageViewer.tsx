import { Image } from "expo-image";
import { useCallback, useRef, useState } from "react";
import { Modal, PanResponder, Pressable, Text, View, type GestureResponderEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/providers/theme-context";
import type { ProductImageEntry } from "@ecommerce/shared";

const distance = (event: GestureResponderEvent) => {
  const [a, b] = event.nativeEvent.touches;
  return a && b ? Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY) : 0;
};
const initialTransform = { scale: 1, x: 0, y: 0 };

function ViewerControl({ label, onPress, disabled = false, accessibilityLabel }: { label: string; onPress: () => void; disabled?: boolean; accessibilityLabel?: string }) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
      style={{ minHeight: 48, minWidth: 48, paddingHorizontal: 12, justifyContent: "center", alignItems: "center", opacity: disabled ? 0.4 : 1 }}>
      <Text style={{ color: colors.foreground, fontSize: 16 }}>{label}</Text>
    </Pressable>
  );
}

export function ProductImageViewer({ images, initialIndex, onClose }: {
  images: ProductImageEntry[]; initialIndex: number; onClose: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(initialIndex);
  const [transform, setTransform] = useState(initialTransform);
  const current = useRef(initialTransform);
  const origin = useRef(initialTransform);
  const pinchDistance = useRef(0);
  const bounds = useRef({ width: 0, height: 0 });
  const update = useCallback((scale: number, x = 0, y = 0) => {
    const clamped = Math.max(1, Math.min(4, scale));
    const maxX = bounds.current.width * (clamped - 1) / 2;
    const maxY = bounds.current.height * (clamped - 1) / 2;
    const next = { scale: clamped, x: Math.max(-maxX, Math.min(maxX, x)), y: Math.max(-maxY, Math.min(maxY, y)) };
    current.current = next;
    setTransform(next);
  }, []);
  // PanResponder registers callbacks; it does not invoke these event handlers during render.
  // eslint-disable-next-line react-hooks/refs
  const [responder] = useState(() => PanResponder.create({
    onMoveShouldSetPanResponder: (event) => event.nativeEvent.touches.length > 1 || current.current.scale > 1,
    onPanResponderGrant: (event) => {
      origin.current = current.current;
      pinchDistance.current = distance(event);
    },
    onPanResponderMove: (event, gesture) => {
      const nextDistance = distance(event);
      if (nextDistance) {
        if (!pinchDistance.current) {
          pinchDistance.current = nextDistance;
          origin.current = current.current;
        }
        update(origin.current.scale * nextDistance / pinchDistance.current, current.current.x, current.current.y);
      } else {
        update(current.current.scale, origin.current.x + gesture.dx, origin.current.y + gesture.dy);
      }
    },
  }));
  const move = (next: number) => { setIndex(next); update(1); };
  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <View accessibilityViewIsModal style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12 }}>
          <Text style={{ color: colors.foreground, fontSize: 16 }}>Photo {index + 1} of {images.length}</Text>
          <ViewerControl label="Close" onPress={onClose} />
        </View>
        <View style={{ flex: 1, overflow: "hidden" }} onLayout={(event) => { bounds.current = event.nativeEvent.layout; }} {...responder.panHandlers}>
          <Image source={{ uri: images[index]?.url }} accessibilityLabel={images[index]?.alt ?? "Product photo"} contentFit="contain"
            style={{ width: "100%", height: "100%", transform: [{ translateX: transform.x }, { translateY: transform.y }, { scale: transform.scale }] }} />
        </View>
        <Text style={{ color: colors.textSecondary, textAlign: "center", padding: 8 }}>Pinch to zoom, then drag to explore</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "center" }}>
          <ViewerControl label="Previous" onPress={() => move(index - 1)} disabled={index === 0} />
          <ViewerControl label="−" accessibilityLabel="Zoom out" onPress={() => update(transform.scale - 0.5)} disabled={transform.scale <= 1} />
          <Text style={{ color: colors.foreground }}>{Math.round(transform.scale * 100)}%</Text>
          <ViewerControl label="+" accessibilityLabel="Zoom in" onPress={() => update(transform.scale + 0.5)} disabled={transform.scale >= 4} />
          <ViewerControl label="Next" onPress={() => move(index + 1)} disabled={index === images.length - 1} />
        </View>
      </View>
    </Modal>
  );
}
