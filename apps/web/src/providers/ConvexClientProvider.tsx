"use client";

import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import { ReactNode, useEffect } from "react";
import { api } from "@convex/_generated/api";
import { authClient } from "@/lib/auth-client";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({
  children,
  initialToken,
}: {
  children: ReactNode;
  initialToken?: string | null;
}) {
  useEffect(() => {
    async function initialize() {
      let token = localStorage.getItem("shop-guest-capability-v2");
      if (!token) { token = await convex.mutation(api.guestIdentity.issue, {}); localStorage.setItem("shop-guest-capability-v2", token); }
      localStorage.setItem("shop-visitor-id", token);
      window.dispatchEvent(new Event("storefront:guest-ready"));
    }
    void initialize().catch(() => { /* Public browsing remains available; protected APIs fail closed. */ });
  }, []);
  return (
    <ConvexBetterAuthProvider
      client={convex}
      authClient={authClient}
      initialToken={initialToken}
    >
      {children}
    </ConvexBetterAuthProvider>
  );
}
