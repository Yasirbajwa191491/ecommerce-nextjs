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
 const [busy, setBusy] = useState(false);
 async function submit() { setBusy(true); try {
  if (!challenge) { const result = await request({ email, orderNumber: number }); setChallenge(result.challenge); setMessage("If the details match, a verification code was emailed. It expires in 10 minutes."); }
  else { const result = await verify({ challenge, code }); if (!result) { setMessage("Verification failed or expired."); return; }
   router.replace({ pathname: "/order/[id]", params: { id: "recovered", orderNumber: result.orderNumber, accessToken: result.accessToken } }); }
 } catch { setMessage("Please try again later."); } finally { setBusy(false); } }
 return <View style={{ padding: 16, gap: 12 }}><Text>Recover secure order access</Text><Input label="Order number" value={number} onChangeText={setNumber} /><Input label="Checkout email" value={email} onChangeText={setEmail} autoCapitalize="none" />{challenge ? <Input label="Email verification code" value={code} onChangeText={setCode} autoCapitalize="none" /> : null}<Button label={challenge ? "Verify code" : "Email verification code"} onPress={() => void submit()} disabled={busy} /><Text>{message}</Text></View>;
}
