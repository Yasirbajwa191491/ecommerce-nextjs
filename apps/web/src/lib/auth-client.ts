import { createAuthClient } from "better-auth/react";
import {
  adminClient,
  emailOTPClient,
} from "better-auth/client/plugins";
import { convexClient } from "@convex-dev/better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [convexClient(), emailOTPClient(), adminClient()],
});
