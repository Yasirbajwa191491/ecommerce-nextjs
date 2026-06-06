import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export type OrderConfirmationItem = {
  productName: string;
  color: string;
  quantity: number;
  lineTotal: number;
  currency: string;
};

export type OrderConfirmationEmailProps = {
  orderNumber: string;
  customerName: string;
  paymentMethod: "cod" | "stripe";
  paymentStatus: "pending" | "paid" | "failed";
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  currency: string;
  customerAddress: string;
  items: OrderConfirmationItem[];
  supportUrl: string;
};

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function OrderConfirmationEmail({
  orderNumber,
  customerName,
  paymentMethod,
  paymentStatus,
  subtotal,
  tax,
  shipping,
  total,
  currency,
  customerAddress,
  items,
  supportUrl,
}: OrderConfirmationEmailProps) {
  const paymentLabel =
    paymentMethod === "cod"
      ? "Cash on Delivery"
      : paymentStatus === "paid"
        ? "Credit/Debit Card (Paid)"
        : "Credit/Debit Card";

  return (
    <Html>
      <Head />
      <Preview>Order {orderNumber} confirmed</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Thank you for your order!</Heading>
          <Text style={paragraph}>Hi {customerName},</Text>
          <Text style={paragraph}>
            We received your order <strong>{orderNumber}</strong>.{" "}
            {paymentMethod === "cod"
              ? "Please have payment ready upon delivery."
              : paymentStatus === "paid"
                ? "Your payment was successful."
                : "We are processing your payment."}
          </Text>

          <Section style={box}>
            <Text style={label}>Shipping address</Text>
            <Text style={value}>{customerAddress}</Text>
            <Hr style={hr} />
            <Text style={label}>Payment method</Text>
            <Text style={value}>{paymentLabel}</Text>
          </Section>

          <Heading as="h2" style={subheading}>
            Order items
          </Heading>
          {items.map((item, index) => (
            <Section key={`${item.productName}-${index}`} style={itemRow}>
              <Text style={itemName}>
                {item.productName} × {item.quantity}
              </Text>
              <Text style={itemMeta}>Color: {item.color}</Text>
              <Text style={itemPrice}>
                {formatMoney(item.lineTotal, item.currency)}
              </Text>
            </Section>
          ))}

          <Section style={totalsBox}>
            <Text style={totalRow}>
              Subtotal: {formatMoney(subtotal, currency)}
            </Text>
            <Text style={totalRow}>Tax: {formatMoney(tax, currency)}</Text>
            <Text style={totalRow}>
              Shipping: {formatMoney(shipping, currency)}
            </Text>
            <Text style={totalGrand}>Total: {formatMoney(total, currency)}</Text>
          </Section>

          <Text style={paragraph}>
            Questions? <a href={supportUrl}>Contact our support team</a>.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f6f8",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "32px 24px",
  maxWidth: "560px",
  borderRadius: "12px",
};

const heading = {
  fontSize: "24px",
  fontWeight: "700" as const,
  color: "#111827",
  margin: "0 0 16px",
};

const subheading = {
  fontSize: "18px",
  fontWeight: "600" as const,
  color: "#111827",
  margin: "24px 0 12px",
};

const paragraph = {
  fontSize: "15px",
  lineHeight: "24px",
  color: "#374151",
  margin: "0 0 12px",
};

const box = {
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  padding: "16px",
  margin: "16px 0",
};

const label = {
  fontSize: "12px",
  fontWeight: "600" as const,
  color: "#6b7280",
  textTransform: "uppercase" as const,
  margin: "0 0 4px",
};

const value = {
  fontSize: "14px",
  color: "#111827",
  margin: "0 0 12px",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "12px 0",
};

const itemRow = {
  borderBottom: "1px solid #e5e7eb",
  paddingBottom: "12px",
  marginBottom: "12px",
};

const itemName = {
  fontSize: "14px",
  fontWeight: "600" as const,
  color: "#111827",
  margin: "0 0 4px",
};

const itemMeta = {
  fontSize: "13px",
  color: "#6b7280",
  margin: "0 0 4px",
};

const itemPrice = {
  fontSize: "14px",
  fontWeight: "600" as const,
  color: "#6254f3",
  margin: "0",
};

const totalsBox = {
  backgroundColor: "#6254f3",
  backgroundImage: "linear-gradient(135deg, #6254f3 0%, #5548e0 100%)",
  borderRadius: "8px",
  padding: "16px",
  margin: "16px 0",
};

const totalRow = {
  fontSize: "14px",
  color: "#e8e6ff",
  margin: "0 0 6px",
};

const totalGrand = {
  fontSize: "18px",
  fontWeight: "700" as const,
  color: "#ffffff",
  margin: "8px 0 0",
};

export default OrderConfirmationEmail;
