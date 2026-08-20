import { Redirect } from "expo-router";

/** Legacy route — redirects to the Track tab. */
export default function OrdersRedirectScreen() {
  return <Redirect href="/(tabs)/track" />;
}
