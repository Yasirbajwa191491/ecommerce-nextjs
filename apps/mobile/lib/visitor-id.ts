import AsyncStorage from "@react-native-async-storage/async-storage";

const VISITOR_ID_KEY = "shop-visitor-id";
const SEARCH_SESSION_KEY = "shop-search-session-id";

function generateId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getVisitorId(): Promise<string> {
  let id = await AsyncStorage.getItem(VISITOR_ID_KEY);
  if (!id) {
    id = generateId();
    await AsyncStorage.setItem(VISITOR_ID_KEY, id);
  }
  return id;
}

/** Synchronous cache — call hydrateVisitorId on app start. */
let cachedVisitorId = "";

export function getCachedVisitorId(): string {
  return cachedVisitorId;
}

export async function hydrateVisitorId(): Promise<string> {
  cachedVisitorId = await getVisitorId();
  return cachedVisitorId;
}

export async function getSearchSessionId(): Promise<string> {
  let id = await AsyncStorage.getItem(SEARCH_SESSION_KEY);
  if (!id) {
    id = generateId();
    await AsyncStorage.setItem(SEARCH_SESSION_KEY, id);
  }
  return id;
}
