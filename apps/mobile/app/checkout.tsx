import { PlaceholderScreen } from "@/features/common/PlaceholderScreen";

export default function CheckoutScreen() {
  return (
    <PlaceholderScreen
      title="Checkout"
      description="Checkout will reuse validateCartForCheckout, createCashOrder, and Stripe session actions from Convex."
      bullets={[
        "Server-side cart validation and pricing",
        "Cash on delivery and Stripe payments",
        "Customer profile saved via Convex",
      ]}
    />
  );
}
