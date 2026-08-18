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

export type ReviewInvitationProduct = {
  name: string;
  imageUrl: string;
  color?: string;
  quantity: number;
};

export type ReviewInvitationEmailProps = {
  customerName: string;
  orderNumber: string;
  reviewUrl: string;
  storeName: string;
  supportEmail: string;
  supportPhone: string;
  supportAddress: string;
  products: ReviewInvitationProduct[];
};

export function ReviewInvitationEmail({
  customerName,
  orderNumber,
  reviewUrl,
  storeName,
  supportEmail,
  supportPhone,
  supportAddress,
  products,
}: ReviewInvitationEmailProps) {
  const firstName = customerName.trim().split(/\s+/)[0] ?? customerName;
  const displayProducts =
    products.length > 0
      ? products
      : [{ name: "your recent purchase", imageUrl: "", color: undefined, quantity: 1 }];

  return (
    <Html>
      <Head />
      <Preview>
        How was your order {orderNumber}? Share your experience with {storeName}.
      </Preview>
      <Body style={main}>
        <Container style={wrapper}>
          <Section style={header}>
            <Text style={headerBrand}>{storeName}</Text>
            <Heading style={headerTitle}>Your order has arrived</Heading>
            <Text style={headerSubtitle}>
              Order <strong style={headerOrder}>{orderNumber}</strong>
            </Text>
          </Section>

          <Container style={card}>
            <Text style={greeting}>Hi {firstName},</Text>
            <Text style={paragraph}>
              Thank you for shopping with us. We hope you&apos;re enjoying your
              purchase! Your feedback helps other customers shop with confidence
              and helps us improve every order.
            </Text>

            <Section style={productsSection}>
              <Text style={sectionLabel}>Items from your order</Text>
              {displayProducts.map((product, index) => (
                <Section
                  key={`${product.name}-${index}`}
                  style={
                    index < displayProducts.length - 1 ? productRow : productRowLast
                  }
                >
                  <Row>
                    <Column style={productImageCol}>
                      {product.imageUrl ? (
                        <Img
                          src={product.imageUrl}
                          alt={product.name}
                          width="72"
                          height="72"
                          style={productImage}
                        />
                      ) : (
                        <div style={productImagePlaceholder} />
                      )}
                    </Column>
                    <Column style={productDetailsCol}>
                      <Text style={productName}>{product.name}</Text>
                      {product.color ? (
                        <Text style={productMeta}>Color: {product.color}</Text>
                      ) : null}
                      {product.quantity > 1 ? (
                        <Text style={productMeta}>Qty: {product.quantity}</Text>
                      ) : null}
                    </Column>
                  </Row>
                </Section>
              ))}
            </Section>

            <Section style={ratingHint}>
              <Text style={ratingStars}>★ ★ ★ ★ ★</Text>
              <Text style={ratingText}>
                How would you rate your experience? It only takes a minute.
              </Text>
            </Section>

            <Section style={ctaSection}>
              <Button style={ctaButton} href={reviewUrl}>
                Write a review
              </Button>
            </Section>

            <Section style={benefitsBox}>
              <Text style={benefitsTitle}>Why your review matters</Text>
              <Text style={benefitItem}>✓ Helps shoppers choose the right product</Text>
              <Text style={benefitItem}>✓ Marks your purchase as verified</Text>
              <Text style={benefitItem}>✓ Tells us what we&apos;re doing well</Text>
            </Section>

            <Hr style={hr} />

            <Text style={supportText}>
              Questions about your order?{" "}
              <Link href={`mailto:${supportEmail}`} style={supportLink}>
                Contact our support team
              </Link>
              .
            </Text>

            <Text style={fallbackText}>
              If the button doesn&apos;t work, copy and paste this link into your
              browser:
            </Text>
            <Link href={reviewUrl} style={fallbackLink}>
              {reviewUrl}
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
              You received this email because your order was marked as delivered.
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

const ratingHint = {
  margin: "0 0 24px",
  textAlign: "center" as const,
};

const ratingStars = {
  color: "#f59e0b",
  fontSize: "22px",
  letterSpacing: "4px",
  lineHeight: "28px",
  margin: "0 0 8px",
};

const ratingText = {
  color: "#4b5563",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0",
};

const ctaSection = {
  margin: "0 0 24px",
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

const benefitsBox = {
  backgroundColor: "#fafafa",
  borderRadius: "8px",
  margin: "0 0 24px",
  padding: "16px 18px",
};

const benefitsTitle = {
  color: "#111827",
  fontSize: "14px",
  fontWeight: "600" as const,
  margin: "0 0 10px",
};

const benefitItem = {
  color: "#4b5563",
  fontSize: "13px",
  lineHeight: "22px",
  margin: "0 0 4px",
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

export default ReviewInvitationEmail;
