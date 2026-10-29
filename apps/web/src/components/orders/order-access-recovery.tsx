"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export function OrderAccessRecovery({ initialOrderNumber = "" }: { initialOrderNumber?: string }) {
  const router = useRouter();
  const request = useAction(api.orderRecovery.requestAccess), verify = useAction(api.orderRecovery.verify);
  const [email, setEmail] = useState(""), [orderNumber, setOrder] = useState(initialOrderNumber), [code, setCode] = useState("");
  const [challenge, setChallenge] = useState(""), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    try {
      if (!challenge) { const result = await request({ email, orderNumber }); setChallenge(result.challenge); setMessage("If the details match, a verification code was emailed. It expires in 10 minutes."); }
      else { const result = await verify({ challenge, code }); if (!result) { setMessage("Verification failed or expired. Request another code."); return; }
        // Fragment avoids sending the capability in HTTP access logs/referrers.
        sessionStorage.setItem(`order-access:${result.orderNumber}`, result.accessToken);
        router.push(`/track-order/${encodeURIComponent(result.orderNumber)}#accessToken=${result.accessToken}`);
      }
    } catch { setMessage("Please try again later."); } finally { setBusy(false); }
  }
  return <section className="my-6 space-y-3 rounded-lg border p-4"><h2 className="font-medium">Recover secure order access</h2>
    <p>Your order number and email identify the order. The emailed code verifies ownership.</p>
    <Input aria-label="Order number" placeholder="Order number" value={orderNumber} onChange={e => setOrder(e.target.value)} />
    <Input aria-label="Checkout email" type="email" placeholder="Checkout email" value={email} onChange={e => setEmail(e.target.value)} />
    {challenge && <Input aria-label="Email verification code" value={code} onChange={e => setCode(e.target.value)} autoComplete="one-time-code" />}
    <Button onClick={() => void submit()} disabled={busy}>{challenge ? "Verify code" : "Email verification code"}</Button>
    {challenge && <Button variant="outline" onClick={() => { setChallenge(""); setCode(""); }}>Start again</Button>}<p role="status">{message}</p></section>;
}
