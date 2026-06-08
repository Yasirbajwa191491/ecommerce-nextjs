import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export type ReviewInvitationEmailProps = {
  customerName: string;
  orderNumber: string;
  reviewUrl: string;
  productNames: string[];
};

export function ReviewInvitationEmail({
  customerName,
  orderNumber,
  reviewUrl,
  productNames,
}: ReviewInvitationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Share your experience with order {orderNumber}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>How was your order?</Heading>
          <Text style={text}>Hi {customerName},</Text>
          <Text style={text}>
            Your order <strong>{orderNumber}</strong> has been delivered. We&apos;d
            love to hear what you think about your purchase
            {productNames.length > 0 ? (
              <>
                {" "}
                ({productNames.slice(0, 3).join(", ")}
                {productNames.length > 3 ? "…" : ""})
              </>
            ) : null}
            .
          </Text>
          <Section style={buttonSection}>
            <Button style={button} href={reviewUrl}>
              Write a review
            </Button>
          </Section>
          <Text style={muted}>
            Verified purchases help other shoppers make confident decisions.
          </Text>
          <Hr style={hr} />
          <Text style={footer}>
            If the button doesn&apos;t work, copy this link into your browser:
            <br />
            {reviewUrl}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "32px 24px",
  maxWidth: "560px",
  borderRadius: "8px",
};

const heading = {
  fontSize: "24px",
  fontWeight: "700" as const,
  color: "#1a1a1a",
  margin: "0 0 24px",
};

const text = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#404040",
  margin: "0 0 16px",
};

const buttonSection = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#6254f3",
  borderRadius: "9999px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600" as const,
  textDecoration: "none",
  padding: "12px 32px",
  display: "inline-block",
};

const muted = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#6b7280",
  margin: "0",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "24px 0",
};

const footer = {
  fontSize: "12px",
  lineHeight: "20px",
  color: "#9ca3af",
  wordBreak: "break-all" as const,
};
