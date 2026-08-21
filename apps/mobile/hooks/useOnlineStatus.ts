import { useNetworkStatus } from "@/providers/NetworkProvider";

export function useOnlineStatus(): boolean {
  return useNetworkStatus().isOnline;
}
