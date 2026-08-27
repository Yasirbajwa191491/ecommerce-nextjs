import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

type HapticStyle = "light" | "medium" | "success" | "warning" | "error";

export async function triggerHaptic(style: HapticStyle = "light"): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    switch (style) {
      case "success":
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case "warning":
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case "error":
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case "medium":
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case "light":
      default:
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
    }
  } catch {
    // Haptics unavailable on some devices/simulators
  }
}
