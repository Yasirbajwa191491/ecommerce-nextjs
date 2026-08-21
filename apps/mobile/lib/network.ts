import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";

export const OFFLINE_TITLE = "Internet connection required";
export const OFFLINE_MESSAGE = "Please reconnect before placing your order.";
export const OFFLINE_GENERIC_MESSAGE = "You're offline. Connect to the internet and try again.";

export class OfflineError extends Error {
  constructor(message = OFFLINE_GENERIC_MESSAGE) {
    super(message);
    this.name = "OfflineError";
  }
}

export type NetworkSnapshot = {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
};

type NetworkListener = (snapshot: NetworkSnapshot) => void;

/** UNKNOWN until the first NetInfo report. Do not treat unknown as offline. */
let snapshot: NetworkSnapshot = {
  isConnected: null,
  isInternetReachable: null,
};

const listeners = new Set<NetworkListener>();

const DISCONNECT_ERROR =
  /network request failed|failed to fetch|fetch failed|networkerror|err_internet_disconnected|err_name_not_resolved|internet connection required|you're offline/i;

const TIMEOUT_ERROR = /timeout|timed out|econnaborted/i;

/**
 * CONNECTED + reachable → online
 * CONNECTED + unreachable → offline
 * DISCONNECTED → offline
 * UNKNOWN (null) → not offline; let the request fail safely
 */
export function isSnapshotOnline(state: NetworkSnapshot): boolean {
  if (state.isConnected === false) return false;
  if (state.isInternetReachable === false) return false;
  return true;
}

/** True only after NetInfo reports a connection. Used for safe non-financial sync. */
export function isSnapshotConfirmedOnline(state: NetworkSnapshot): boolean {
  if (state.isConnected !== true) return false;
  if (state.isInternetReachable === false) return false;
  return true;
}

export function getNetworkSnapshot(): NetworkSnapshot {
  return snapshot;
}

export function getIsOnline(): boolean {
  return isSnapshotOnline(snapshot);
}

export function setNetworkSnapshot(next: NetworkSnapshot): void {
  const changed =
    snapshot.isConnected !== next.isConnected ||
    snapshot.isInternetReachable !== next.isInternetReachable;
  snapshot = next;
  if (changed) {
    listeners.forEach((listener) => listener(next));
  }
}

export function subscribeNetwork(listener: NetworkListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function networkSnapshotFromNetInfo(state: NetInfoState): NetworkSnapshot {
  return {
    isConnected: state.isConnected,
    isInternetReachable: state.isInternetReachable,
  };
}

export async function refreshNetworkSnapshot(): Promise<boolean> {
  const state = await NetInfo.fetch();
  const next = networkSnapshotFromNetInfo(state);
  setNetworkSnapshot(next);
  return isSnapshotOnline(next);
}

export function isLikelyOfflineError(error: unknown): boolean {
  if (error instanceof OfflineError) return true;
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  if (!getIsOnline()) {
    return DISCONNECT_ERROR.test(raw) || TIMEOUT_ERROR.test(raw);
  }

  return false;
}

export function ensureOnline(message = OFFLINE_GENERIC_MESSAGE): void {
  if (!getIsOnline()) {
    throw new OfflineError(message);
  }
}

/** Fresh NetInfo read for native checkout / payment / submit actions. */
export async function ensureOnlineNow(message = OFFLINE_GENERIC_MESSAGE): Promise<void> {
  const online = await refreshNetworkSnapshot();
  if (!online) {
    throw new OfflineError(message);
  }
}
