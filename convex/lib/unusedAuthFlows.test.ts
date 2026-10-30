import { expect, it } from "vitest";
import { betterAuth } from "better-auth/minimal";
import { memoryAdapter } from "better-auth/adapters/memory";
import { disabledUnusedAuthPaths, options } from "../betterAuth/auth";
it("closes unused flows at the supported HTTP request boundary, preserving password auth", async () => {
 expect(options.disabledPaths).toEqual(disabledUnusedAuthPaths);
 const db = { user: [], session: [], account: [], verification: [] };
 const auth = betterAuth({ baseURL: "http://localhost:3000", secret: "synthetic-fixture-auth-flow-guard-key-2026", database: memoryAdapter(db), disabledPaths: [...disabledUnusedAuthPaths], emailAndPassword: { enabled: true } });
 for (const path of disabledUnusedAuthPaths) {
  const response = await auth.handler(new Request(`http://localhost:3000/api/auth${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }));
  expect(response.status).toBe(404);
 }
 expect((await auth.api.signUpEmail({ body: { email: "fixture@example.invalid", password: "synthetic-flow-test-password-2026", name: "Fixture" }, asResponse: true })).status).toBe(200);
});
