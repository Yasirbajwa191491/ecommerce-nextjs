import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";

export type OrderConfirmationItem = {
  productName: string;
  color: string;
  quantity: number;
  lineTotal: number;
  currency: string;
  imageUrl: string;
};

export type OrderConfirmationEmailProps = {
  orderNumber: string;
  customerName: string;
  orderDate: string;
  paymentMethod: "cod" | "stripe";
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  currency: string;
  customerAddress: string;
  items: OrderConfirmationItem[];
  trackOrderUrl: string;
  supportUrl: string;
  storeName: string;
  supportEmail: string;
  supportPhone: string;
  supportAddress: string;
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

function paymentStatusMessage(
  paymentMethod: OrderConfirmationEmailProps["paymentMethod"],
  paymentStatus: OrderConfirmationEmailProps["paymentStatus"]
) {
  if (paymentMethod === "cod") {
    return "Please have payment ready upon delivery. We'll notify you when your order ships.";
  }
  if (paymentStatus === "paid") {
    return "Your payment was successful. We'll send you updates as your order is processed and shipped.";
  }
  return "We are processing your payment. You'll receive another confirmation once payment is complete.";
}

export function OrderConfirmationEmail({
  orderNumber,
  customerName,
  orderDate,
  paymentMethod,
  paymentStatus,
  subtotal,
  tax,
  shipping,
  total,
  currency,
  customerAddress,
  items,
  trackOrderUrl,
  supportUrl,
  storeName,
  supportEmail,
  supportPhone,
  supportAddress,
}: OrderConfirmationEmailProps) {
  const firstName = customerName.trim().split(/\s+/)[0] ?? customerName;
  const paymentLabel =
    paymentMethod === "cod"
      ? "Cash on Delivery"
      : paymentStatus === "paid"
        ? "Credit/Debit Card (Paid)"
        : "Credit/Debit Card";

  return (
    <Html>
      <Head />
      <Preview>
        Order {orderNumber} confirmed — thank you for shopping with {storeName}.
      </Preview>
      <Body style={main}>
        <Container style={wrapper}>
          <Section style={header}>
            <Text style={headerBrand}>{storeName}</Text>
            <Heading style={headerTitle}>Thank you for your order!</Heading>
            <Text style={headerSubtitle}>
              Order <strong style={headerOrder}>{orderNumber}</strong>
            </Text>
          </Section>

          <Container style={card}>
            <Text style={greeting}>Hi {firstName},</Text>
            <Text style={paragraph}>
              We&apos;ve received your order and our team is getting it ready.
              {" "}
              {paymentStatusMessage(paymentMethod, paymentStatus)}
            </Text>

            <Section style={summaryBox}>
              <Row>
                <Column>
                  <Text style={summaryLabel}>Order date</Text>
                  <Text style={summaryValue}>{orderDate}</Text>
                </Column>
                <Column>
                  <Text style={summaryLabel}>Payment</Text>
                  <Text style={summaryValue}>{paymentLabel}</Text>
                </Column>
              </Row>
              <Hr style={summaryHr} />
              <Text style={summaryLabel}>Shipping address</Text>
              <Text style={summaryValue}>{customerAddress}</Text>
            </Section>

            <Section style={productsSection}>
              <Text style={sectionLabel}>Order items</Text>
              {items.map((item, index) => (
                <Section
                  key={`${item.productName}-${index}`}
                  style={
                    index < items.length - 1 ? productRow : productRowLast
                  }
                >
                  <Row>
                    <Column style={productImageCol}>
                      {item.imageUrl ? (
                        <Img
                          src={item.imageUrl}
                          alt={item.productName}
                          width="72"
                          height="72"
                          style={productImage}
                        />
                      ) : (
                        <div style={productImagePlaceholder} />
                      )}
                    </Column>
                    <Column style={productDetailsCol}>
                      <Text style={productName}>{item.productName}</Text>
                      <Text style={productMeta}>Color: {item.color}</Text>
                      <Text style={productMeta}>Qty: {item.quantity}</Text>
                    </Column>
                    <Column style={productPriceCol}>
                      <Text style={productPrice}>
                        {formatMoney(item.lineTotal, item.currency)}
                      </Text>
                    </Column>
                  </Row>
                </Section>
              ))}
            </Section>

            <Section style={totalsBox}>
              <Row>
                <Column>
                  <Text style={totalLabel}>Subtotal</Text>
                </Column>
                <Column style={totalValueCol}>
                  <Text style={totalValue}>
                    {formatMoney(subtotal, currency)}
                  </Text>
                </Column>
              </Row>
              <Row>
                <Column>
                  <Text style={totalLabel}>Tax</Text>
                </Column>
                <Column style={totalValueCol}>
                  <Text style={totalValue}>{formatMoney(tax, currency)}</Text>
                </Column>
              </Row>
              <Row>
                <Column>
                  <Text style={totalLabel}>Shipping</Text>
                </Column>
                <Column style={totalValueCol}>
                  <Text style={totalValue}>
                    {formatMoney(shipping, currency)}
                  </Text>
                </Column>
              </Row>
              <Hr style={totalsHr} />
              <Row>
                <Column>
                  <Text style={totalGrandLabel}>Total</Text>
                </Column>
                <Column style={totalValueCol}>
                  <Text style={totalGrandValue}>
                    {formatMoney(total, currency)}
                  </Text>
                </Column>
              </Row>
            </Section>

            <Section style={ctaSection}>
              <Button style={ctaButton} href={trackOrderUrl}>
                Track your order
              </Button>
            </Section>

            <Hr style={hr} />

            <Text style={supportText}>
              Questions about your order?{" "}
              <Link href={supportUrl} style={supportLink}>
                Contact our support team
              </Link>
              .
            </Text>

            <Text style={fallbackText}>
              If the button doesn&apos;t work, copy and paste this link into your
              browser:
            </Text>
            <Link href={trackOrderUrl} style={fallbackLink}>
              {trackOrderUrl}
            </Link>
          </Container>

          <Section style={footer}>
            <Text style={footerBrand}>{storeName}</Text>
            {supportAddress ? (
              <Text style={footerText}>{supportAddress}</Text>
            ) : null}
            {supportEmail ? (
              <Text style={footerText}>
                <Link href={`mailto:${supportEmail}`} style={footerLink}>
                  {supportEmail}
                </Link>
              </Text>
            ) : null}
            {supportPhone ? <Text style={footerText}>{supportPhone}</Text> : null}
            <Text style={footerNote}>
              You received this email because you placed an order at {storeName}.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f3f4f6",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const wrapper = {
  margin: "0 auto",
  maxWidth: "600px",
  padding: "24px 16px",
};

const header = {
  backgroundColor: "#6254f3",
  backgroundImage: "linear-gradient(135deg, #6254f3 0%, #5548e0 100%)",
  borderRadius: "12px 12px 0 0",
  padding: "32px 28px",
  textAlign: "center" as const,
};

const headerBrand = {
  color: "#e8e6ff",
  fontSize: "13px",
  fontWeight: "600" as const,
  letterSpacing: "0.08em",
  margin: "0 0 12px",
  textTransform: "uppercase" as const,
};

const headerTitle = {
  color: "#ffffff",
  fontSize: "26px",
  fontWeight: "700" as const,
  lineHeight: "32px",
  margin: "0 0 8px",
};

const headerSubtitle = {
  color: "#ddd9ff",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0",
};

const headerOrder = {
  color: "#ffffff",
  fontWeight: "600" as const,
};

const card = {
  backgroundColor: "#ffffff",
  borderRadius: "0 0 12px 12px",
  boxShadow: "0 4px 24px rgba(17, 24, 39, 0.08)",
  margin: "0",
  maxWidth: "600px",
  padding: "32px 28px",
};

const greeting = {
  color: "#111827",
  fontSize: "16px",
  fontWeight: "600" as const,
  lineHeight: "24px",
  margin: "0 0 12px",
};

const paragraph = {
  color: "#374151",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 24px",
};

const summaryBox = {
  backgroundColor: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  margin: "0 0 24px",
  padding: "16px",
};

const summaryLabel = {
  color: "#6b7280",
  fontSize: "11px",
  fontWeight: "700" as const,
  letterSpacing: "0.06em",
  margin: "0 0 4px",
  textTransform: "uppercase" as const,
};

const summaryValue = {
  color: "#111827",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "0 0 12px",
};

const summaryHr = {
  borderColor: "#e5e7eb",
  margin: "4px 0 12px",
};

const productsSection = {
  backgroundColor: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  margin: "0 0 24px",
  padding: "16px",
};

const sectionLabel = {
  color: "#6b7280",
  fontSize: "11px",
  fontWeight: "700" as const,
  letterSpacing: "0.06em",
  margin: "0 0 12px",
  textTransform: "uppercase" as const,
};

const productRow = {
  borderBottom: "1px solid #e5e7eb",
  marginBottom: "12px",
  paddingBottom: "12px",
};

const productRowLast = {
  marginBottom: "0",
  paddingBottom: "0",
};

const productImageCol = {
  width: "72px",
  verticalAlign: "top" as const,
};

const productDetailsCol = {
  paddingLeft: "14px",
  verticalAlign: "middle" as const,
};

const productPriceCol = {
  textAlign: "right" as const,
  verticalAlign: "middle" as const,
  width: "90px",
};

const productImage = {
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  objectFit: "cover" as const,
};

const productImagePlaceholder = {
  backgroundColor: "#e5e7eb",
  borderRadius: "8px",
  height: "72px",
  width: "72px",
};

const productName = {
  color: "#111827",
  fontSize: "15px",
  fontWeight: "600" as const,
  lineHeight: "22px",
  margin: "0 0 4px",
};

const productMeta = {
  color: "#6b7280",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "0",
};

const productPrice = {
  color: "#6254f3",
  fontSize: "14px",
  fontWeight: "600" as const,
  lineHeight: "20px",
  margin: "0",
};

const totalsBox = {
  backgroundColor: "#6254f3",
  backgroundImage: "linear-gradient(135deg, #6254f3 0%, #5548e0 100%)",
  borderRadius: "10px",
  margin: "0 0 24px",
  padding: "16px 18px",
};

const totalLabel = {
  color: "#e8e6ff",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "0",
};

const totalValueCol = {
  textAlign: "right" as const,
};

const totalValue = {
  color: "#ffffff",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "0",
};

const totalsHr = {
  borderColor: "rgba(255,255,255,0.25)",
  margin: "8px 0",
};

const totalGrandLabel = {
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "700" as const,
  lineHeight: "24px",
  margin: "0",
};

const totalGrandValue = {
  color: "#ffffff",
  fontSize: "18px",
  fontWeight: "700" as const,
  lineHeight: "24px",
  margin: "0",
};

const ctaSection = {
  margin: "0 0 8px",
  textAlign: "center" as const,
};

const ctaButton = {
  backgroundColor: "#6254f3",
  backgroundImage: "linear-gradient(135deg, #6254f3 0%, #5548e0 100%)",
  borderRadius: "8px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "16px",
  fontWeight: "600" as const,
  lineHeight: "1",
  padding: "14px 36px",
  textDecoration: "none",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "24px 0",
};

const supportText = {
  color: "#374151",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 16px",
};

const supportLink = {
  color: "#6254f3",
  fontWeight: "600" as const,
  textDecoration: "underline",
};

const fallbackText = {
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: "18px",
  margin: "0 0 6px",
};

const fallbackLink = {
  color: "#6254f3",
  fontSize: "12px",
  lineHeight: "18px",
  wordBreak: "break-all" as const,
};

const footer = {
  marginTop: "20px",
  textAlign: "center" as const,
};

const footerBrand = {
  color: "#374151",
  fontSize: "13px",
  fontWeight: "600" as const,
  margin: "0 0 6px",
};

const footerText = {
  color: "#9ca3af",
  fontSize: "12px",
  lineHeight: "20px",
  margin: "0 0 4px",
};

const footerLink = {
  color: "#9ca3af",
  textDecoration: "underline",
};

const footerNote = {
  color: "#d1d5db",
  fontSize: "11px",
  lineHeight: "18px",
  margin: "12px 0 0",
};

export default OrderConfirmationEmail;
