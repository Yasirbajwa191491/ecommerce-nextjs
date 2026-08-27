import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

async function canUseSecureStore(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function setSecureItem(key: string, value: string): Promise<void> {
  if (await canUseSecureStore()) {
    try {
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      });
      await AsyncStorage.removeItem(key);
      return;
    } catch {
      // Fall through to AsyncStorage
    }
  }
  await AsyncStorage.setItem(key, value);
}

export async function getSecureItem(key: string): Promise<string | null> {
  if (await canUseSecureStore()) {
    try {
      const fromSecure = await SecureStore.getItemAsync(key);
      if (fromSecure != null) return fromSecure;
    } catch {
      // Fall through
    }
  }
  return AsyncStorage.getItem(key);
}

export async function removeSecureItem(key: string): Promise<void> {
  if (await canUseSecureStore()) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Ignore
    }
  }
  await AsyncStorage.removeItem(key);
}
