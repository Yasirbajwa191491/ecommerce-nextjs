import { describe, expect, it } from "vitest";
import { betterAuth } from "better-auth/minimal";
import { memoryAdapter } from "better-auth/adapters/memory";
import { admin } from "better-auth/plugins";
import { ac, adminRoles } from "../betterAuth/auth";

describe("direct Better Auth administrator endpoints", () => {
 it("denies an admin calling the direct role API and permits a super-admin", async () => {
  const db: Record<string, Record<string, unknown>[]> = { user: [], session: [], account: [], verification: [] };
  const auth = betterAuth({ baseURL: "http://localhost:3000", secret: "synthetic-local-test-signing-secret-2026-only", database: memoryAdapter(db), emailAndPassword: { enabled: true }, plugins: [admin({ ac, roles: adminRoles, defaultRole: "user", adminRoles: ["admin", "superAdmin"] })] });
  const response = await auth.api.signUpEmail({ body: { email: "owner@example.invalid", password: "synthetic-test-password-2026", name: "Fixture Admin" }, asResponse: true });
  expect(response.status).toBe(200);
  const cookie = response.headers.getSetCookie().map(c => c.split(";")[0]).join("; ");
  const headers = new Headers({ cookie, origin: "http://localhost:3000" });
  const user = db.user[0]; user.role = "admin";
  await expect(auth.api.setRole({ body: { userId: String(user.id), role: "superAdmin" }, headers })).rejects.toMatchObject({ status: "FORBIDDEN" });
  await expect(auth.api.createUser({ body: { email: "other@example.invalid", password: "another-fixture-password-2026", name: "Other", role: "superAdmin" }, headers })).rejects.toMatchObject({ status: "FORBIDDEN" });
  user.role = "superAdmin";
  const result = await auth.api.createUser({ body: { email: "allowed@example.invalid", password: "another-fixture-password-2026", name: "Allowed", role: "admin" }, headers });
  expect(result.user.role).toBe("admin");
 });
});
