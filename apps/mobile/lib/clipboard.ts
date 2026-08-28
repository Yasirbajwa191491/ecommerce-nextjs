import { Platform } from "react-native";

export async function copyToClipboard(value: string): Promise<boolean> {
  const text = value.trim();
  if (!text) return false;

  try {
    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const Clipboard = await import("expo-clipboard");
    await Clipboard.setStringAsync(text);
    return true;
  } catch {
    return false;
  }
}
