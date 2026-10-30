import { expect, it } from "vitest";
import { betterAuth } from "better-auth/minimal";
import { memoryAdapter } from "better-auth/adapters/memory";
import { admin, emailOTP } from "better-auth/plugins";
import { ac, adminRoles } from "../betterAuth/auth";
function fixture(requireEmailVerification = false) {
  const db: Record<string, Record<string, unknown>[]> = { user: [], session: [], account: [], verification: [] };
  let otp = ""; let resetUrl = "";
  const auth = betterAuth({ baseURL: "http://localhost:3000", secret: "synthetic-local-auth-contract-test-key-2026", database: memoryAdapter(db), emailAndPassword: { enabled: true, requireEmailVerification, sendResetPassword: async ({ url }) => { resetUrl = url; } }, plugins: [emailOTP({ overrideDefaultEmailVerification: true, async sendVerificationOTP(input) { otp = input.otp; } }), admin({ ac, roles: adminRoles, defaultRole: "user", adminRoles: ["admin", "superAdmin"] })] });
  return { auth, db, otp: () => otp, resetUrl: () => resetUrl };
}
const account = { email: "fixture@example.invalid", password: "synthetic-contract-password-2026", name: "Fixture" };
const cookieHeaders = (response: Response) => new Headers({ cookie: response.headers.getSetCookie().map(c => c.split(";")[0]).join("; "), origin: "http://localhost:3000" });
it("ordinary users and admins cannot modify other accounts; session revocation invalidates login", async () => {
  const { auth, db } = fixture();
  const response = await auth.api.signUpEmail({ body: account, asResponse: true }); const headers = cookieHeaders(response);
  expect((await auth.api.getSession({ headers }))?.user.email).toBe(account.email);
  for (const role of ["user", "admin"]) {
    db.user[0].role = role;
    await expect(auth.api.setRole({ body: { userId: String(db.user[0].id), role: "superAdmin" }, headers })).rejects.toMatchObject({ status: "FORBIDDEN" });
    await expect(auth.api.setRole({ body: { userId: "other-fixture", role: "superAdmin" }, headers })).rejects.toMatchObject({ status: "FORBIDDEN" });
    await expect(auth.api.banUser({ body: { userId: "other-fixture" }, headers })).rejects.toMatchObject({ status: "FORBIDDEN" });
  }
  await auth.api.revokeSession({ body: { token: String(db.session[0].token) }, headers });
  expect(await auth.api.getSession({ headers })).toBeNull();
});
it("requires email verification and accepts only the emailed OTP", async () => {
  const f = fixture(true); await f.auth.api.signUpEmail({ body: account });
  await expect(f.auth.api.signInEmail({ body: { email: account.email, password: account.password } })).rejects.toMatchObject({ status: "FORBIDDEN" });
  await f.auth.api.sendVerificationOTP({ body: { email: account.email, type: "email-verification" } });
  const code = f.otp(); expect(code).toMatch(/^\d{6}$/);
  await expect(f.auth.api.verifyEmailOTP({ body: { email: account.email, otp: "wrong" } })).rejects.toBeDefined();
  await f.auth.api.verifyEmailOTP({ body: { email: account.email, otp: code } });
  const response = await f.auth.api.signInEmail({ body: { email: account.email, password: account.password }, asResponse: true });
  expect((await f.auth.api.getSession({ headers: cookieHeaders(response) }))?.user.emailVerified).toBe(true);
});
it("password recovery returns no credential and requires the privately delivered reset token", async () => {
  const f = fixture(); await f.auth.api.signUpEmail({ body: account });
  const response = await f.auth.api.requestPasswordReset({ body: { email: account.email, redirectTo: "http://localhost:3000/reset" } });
  expect(JSON.stringify(response)).not.toContain(account.password); expect(JSON.stringify(response)).not.toContain("token");
  await expect(f.auth.api.resetPassword({ body: { token: "invalid-fixture", newPassword: "synthetic-replacement-password-2026" } })).rejects.toBeDefined();
  const token = new URL(f.resetUrl()).pathname.split("/").at(-1)!;
  await f.auth.api.resetPassword({ body: { token, newPassword: "synthetic-replacement-password-2026" } });
  await expect(f.auth.api.signInEmail({ body: { email: account.email, password: account.password } })).rejects.toBeDefined();
  expect((await f.auth.api.signInEmail({ body: { email: account.email, password: "synthetic-replacement-password-2026" }, asResponse: true })).status).toBe(200);
});
