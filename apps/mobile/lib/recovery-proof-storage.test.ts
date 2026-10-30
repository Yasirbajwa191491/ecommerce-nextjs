import { beforeEach, expect, it, vi } from "vitest";
import { loadPushEnrollmentProof, savePushEnrollmentProof } from "./checkout-customer-storage";
const fixture = vi.hoisted(() => ({ values: new Map<string,string>() }));
vi.mock("@/lib/secure-storage", () => ({ getSecureItem: async (key:string) => fixture.values.get(key) ?? null, setSecureItem: async (key:string,value:string) => { fixture.values.set(key,value); }, removeSecureItem: async (key:string) => { fixture.values.delete(key); } }));
vi.mock("@/lib/recent-orders", () => ({ saveRecentOrder: vi.fn() }));
beforeEach(() => fixture.values.clear());
it("round-trips the recovery proof needed to select the verified mailbox", async () => {
 await savePushEnrollmentProof(" Verified@example.invalid ", "synthetic-recovery-capability", true);
 expect(await loadPushEnrollmentProof()).toEqual({ email:"verified@example.invalid", accessToken:"synthetic-recovery-capability", mailboxVerified:true });
});
it("never labels ordinary checkout proof as mailbox-verified", async () => {
 await savePushEnrollmentProof("owner@example.invalid", "synthetic-checkout-capability");
 expect(await loadPushEnrollmentProof()).toEqual({ email:"owner@example.invalid", accessToken:"synthetic-checkout-capability" });
});
