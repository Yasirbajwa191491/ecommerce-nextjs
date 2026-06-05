import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";
import { admin, createAccessControl, emailOTP } from "better-auth/plugins";
import type { BetterAuthOptions } from "better-auth";
import { components, internal } from "../_generated/api";
import type { DataModel } from "../_generated/dataModel";
import authConfig from "../auth.config";
import { OTP_EXPIRES_SECONDS } from "../../src/lib/otp-config";
import schema from "./schema";

const ac = createAccessControl({
  user: [
    "create",
    "list",
    "set-role",
    "ban",
    "impersonate",
    "delete",
    "set-password",
    "get",
    "update",
  ],
  session: ["list", "revoke", "delete"],
});

const adminRoles = {
  user: ac.newRole({ user: [], session: [] }),
  admin: ac.newRole({
    user: [
      "create",
      "list",
      "set-role",
      "ban",
      "delete",
      "get",
      "update",
      "set-password",
    ],
    session: ["list", "revoke", "delete"],
  }),
  superAdmin: ac.newRole({
    user: [
      "create",
      "list",
      "set-role",
      "ban",
      "impersonate",
      "delete",
      "set-password",
      "get",
      "update",
    ],
    session: ["list", "revoke", "delete"],
  }),
};

export const authComponent = createClient<DataModel, typeof schema>(
  components.betterAuth,
  {
    local: { schema },
    verbose: false,
  }
);

export const createAuthOptions = (ctx: GenericCtx<DataModel>) => {
  return {
    appName: "Ecommerce Store Admin",
    baseURL: process.env.SITE_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
    },
    plugins: [
      convex({ authConfig }),
      emailOTP({
        overrideDefaultEmailVerification: true,
        resendStrategy: "reuse",
        expiresIn: OTP_EXPIRES_SECONDS,
        async sendVerificationOTP({ email, otp, type }) {
          if (!("runAction" in ctx) || typeof ctx.runAction !== "function") {
            throw new Error(
              "Cannot send verification email: Convex action runner unavailable."
            );
          }
          await ctx.runAction(internal.email.sendOtpEmail, {
            email,
            otp,
            type,
          });
        },
      }),
      admin({
        ac,
        roles: adminRoles,
        defaultRole: "user",
        adminRoles: ["admin", "superAdmin"],
      }),
    ],
  } satisfies BetterAuthOptions;
};

export const options = createAuthOptions({} as GenericCtx<DataModel>);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth(createAuthOptions(ctx));
};
