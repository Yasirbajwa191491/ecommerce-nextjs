import AsyncStorage from "@react-native-async-storage/async-storage";

const FIRST_LAUNCH_PROMPT_KEY = "@push/firstLaunchOsPromptShown";

export async function hasFirstLaunchOsPromptBeenShown(): Promise<boolean> {
  return (await AsyncStorage.getItem(FIRST_LAUNCH_PROMPT_KEY)) === "1";
}

export async function markFirstLaunchOsPromptShown(): Promise<void> {
  await AsyncStorage.setItem(FIRST_LAUNCH_PROMPT_KEY, "1");
}
