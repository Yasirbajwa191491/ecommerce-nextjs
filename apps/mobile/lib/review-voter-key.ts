import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "reviewVoterKey";

let inFlight: Promise<string> | null = null;

export async function getReviewVoterKey(): Promise<string> {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    if (existing) return existing;

    const value =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `voter-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    await AsyncStorage.setItem(STORAGE_KEY, value);
    return value;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}
