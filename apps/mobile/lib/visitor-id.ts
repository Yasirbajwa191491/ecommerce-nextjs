import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";

const VISITOR_ID_KEY = "shop-visitor-id";
const SEARCH_SESSION_KEY = "shop-search-session-id";

type Listener = () => void;

const listeners = new Set<Listener>();

let cachedVisitorId = "";
let visitorInFlight: Promise<string> | null = null;
const inFlightByKey = new Map<string, Promise<string>>();

function emit() {
  listeners.forEach((listener) => listener());
}

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function getOrCreateStoredId(key: string): Promise<string> {
  const existingInFlight = inFlightByKey.get(key);
  if (existingInFlight) return existingInFlight;

  const pending = (async () => {
    const stored = await AsyncStorage.getItem(key);
    if (stored) return stored;
    const id = generateId();
    await AsyncStorage.setItem(key, id);
    return id;
  })();

  inFlightByKey.set(key, pending);
  try {
    return await pending;
  } finally {
    inFlightByKey.delete(key);
  }
}

export async function getVisitorId(): Promise<string> {
  if (cachedVisitorId) return cachedVisitorId;
  if (visitorInFlight) return visitorInFlight;

  visitorInFlight = (async () => {
    const id = await getOrCreateStoredId(VISITOR_ID_KEY);
    cachedVisitorId = id;
    emit();
    return id;
  })();

  try {
    return await visitorInFlight;
  } finally {
    visitorInFlight = null;
  }
}

/** Synchronous cache — subscribe via useVisitorId. */
export function getCachedVisitorId(): string {
  return cachedVisitorId;
}

export function subscribeVisitorId(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function hydrateVisitorId(): Promise<string> {
  return getVisitorId();
}

export function useVisitorId(): string {
  return useSyncExternalStore(subscribeVisitorId, getCachedVisitorId, getCachedVisitorId);
}

export async function getSearchSessionId(): Promise<string> {
  return getOrCreateStoredId(SEARCH_SESSION_KEY);
}
