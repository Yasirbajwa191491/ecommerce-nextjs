import NetInfo from "@react-native-community/netinfo";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AppState, type AppStateStatus } from "react-native";

import {
  getIsOnline,
  getNetworkSnapshot,
  isSnapshotOnline,
  networkSnapshotFromNetInfo,
  refreshNetworkSnapshot,
  setNetworkSnapshot,
  subscribeNetwork,
  type NetworkSnapshot,
} from "@/lib/network";
import { clearIncompatibleCache } from "@/lib/offline/storage";
import { hydrateProductStore } from "@/lib/offline/product-store";
import { hydrateRecentlyViewed } from "@/lib/offline/recently-viewed";
import { hydrateWishlistStore } from "@/lib/offline/wishlist-queue";

export type NetworkStatus = {
  isOnline: boolean;
  isOffline: boolean;
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  justReconnected: boolean;
};

const NetworkContext = createContext<NetworkStatus | null>(null);

function snapshotToStatus(
  state: NetworkSnapshot,
  justReconnected: boolean
): NetworkStatus {
  const isOnline = isSnapshotOnline(state);
  const isOffline =
    state.isConnected === false || state.isInternetReachable === false;
  return {
    isOnline,
    isOffline,
    isConnected: state.isConnected,
    isInternetReachable: state.isInternetReachable,
    justReconnected,
  };
}

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [justReconnected, setJustReconnected] = useState(false);
  const [status, setStatus] = useState<NetworkStatus>(() =>
    snapshotToStatus(getNetworkSnapshot(), false)
  );

  useEffect(() => {
    void clearIncompatibleCache();
    void hydrateProductStore();
    void hydrateRecentlyViewed();
    void hydrateWishlistStore();
  }, []);

  useEffect(() => {
    const unsubscribeStore = subscribeNetwork((next) => {
      setStatus((current) => snapshotToStatus(next, current.justReconnected));
    });

    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      const next = networkSnapshotFromNetInfo(state);
      const wasOnline = getIsOnline();
      const nowOnline = isSnapshotOnline(next);
      setNetworkSnapshot(next);
      if (!wasOnline && nowOnline) {
        setJustReconnected(true);
      }
      if (!nowOnline) {
        setJustReconnected(false);
      }
    });

    const onAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "active") {
        void refreshNetworkSnapshot();
      }
    };
    const appStateSub = AppState.addEventListener("change", onAppStateChange);

    void NetInfo.fetch().then((state) => {
      setNetworkSnapshot(networkSnapshotFromNetInfo(state));
    });

    return () => {
      unsubscribeStore();
      unsubscribeNetInfo();
      appStateSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!justReconnected) return;
    const timeout = setTimeout(() => setJustReconnected(false), 2800);
    return () => clearTimeout(timeout);
  }, [justReconnected]);

  const value = useMemo(
    () => ({ ...status, justReconnected }),
    [status, justReconnected]
  );

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetworkStatus(): NetworkStatus {
  const context = useContext(NetworkContext);
  if (context) return context;

  const isOnline = getIsOnline();
  const snapshot = getNetworkSnapshot();
  return {
    isOnline,
    isOffline: snapshot.isConnected === false || snapshot.isInternetReachable === false,
    isConnected: snapshot.isConnected,
    isInternetReachable: snapshot.isInternetReachable,
    justReconnected: false,
  };
}
