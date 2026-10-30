import { savePushEnrollmentProof } from "@/lib/checkout-customer-storage";
import { useState } from "react";
import { View, Text } from "react-native";
import { useAction } from "convex/react";
import { useRouter } from "expo-router";
import { api } from "@/lib/convex-api";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
export function OrderAccessRecovery({ orderNumber = "" }: { orderNumber?: string }) {
 const request = useAction(api.orderRecovery.requestAccess), verify = useAction(api.orderRecovery.verify), router = useRouter();
 const [number, setNumber] = useState(orderNumber), [email, setEmail] = useState(""), [code, setCode] = useState(""), [challenge, setChallenge] = useState(""), [message, setMessage] = useState("");
 const [challengeEmail, setChallengeEmail] = useState("");
 const [busy, setBusy] = useState(false);
 async function submit() { setBusy(true); try {
  if (!challenge) { const result = await request({ email, orderNumber: number }); setChallenge(result.challenge); setChallengeEmail(email.trim().toLowerCase()); setMessage("If the details match, a verification code was emailed. It expires in 10 minutes."); }
  else { const result = await verify({ challenge, code }); if (!result) { setMessage("Verification failed or expired."); return; }
   await savePushEnrollmentProof(challengeEmail, result.accessToken, true);
   router.replace({ pathname: "/order/[id]", params: { id: "recovered", orderNumber: result.orderNumber, accessToken: result.accessToken } }); }
 } catch { setMessage("Please try again later."); } finally { setBusy(false); } }
 return <View style={{ padding: 16, gap: 12 }}><Text>Recover secure order access</Text><Input label="Order number" editable={!challenge} value={number} onChangeText={setNumber} /><Input label="Checkout email" editable={!challenge} value={email} onChangeText={setEmail} autoCapitalize="none" />{challenge ? <Input label="Email verification code" value={code} onChangeText={setCode} autoCapitalize="none" /> : null}<Button label={challenge ? "Verify code" : "Email verification code"} onPress={() => void submit()} disabled={busy} />{challenge ? <Button label="Request a new code" onPress={() => { setChallenge(""); setChallengeEmail(""); setCode(""); setMessage(""); }} disabled={busy} /> : null}<Text>{message}</Text></View>;
}
