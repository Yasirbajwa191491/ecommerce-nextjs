import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type OtpEmailProps = {
  otp: string;
  type: string;
};

export function OtpEmail({ otp, type }: OtpEmailProps) {
  const title =
    type === "email-verification"
      ? "Verify your email"
      : type === "sign-in"
        ? "Sign in to Admin"
        : "Your verification code";

  return (
    <Html>
      <Head />
      <Preview>{`${title}: ${otp}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{title}</Heading>
          <Text style={text}>
            Use the code below to continue. It expires shortly.
          </Text>
          <Section style={codeBox}>
            <Text style={code}>{otp}</Text>
          </Section>
          <Text style={footer}>
            If you did not request this, you can ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f6f8",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  margin: "40px auto",
  padding: "32px",
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  maxWidth: "480px",
};

const h1 = {
  color: "#1a1a1a",
  fontSize: "24px",
  fontWeight: "600" as const,
  margin: "0 0 16px",
};

const text = {
  color: "#52525b",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 24px",
};

const codeBox = {
  backgroundColor: "#f4f3ff",
  borderRadius: "8px",
  padding: "20px",
  textAlign: "center" as const,
  margin: "0 0 24px",
};

const code = {
  color: "#6254f3",
  fontSize: "32px",
  fontWeight: "700" as const,
  letterSpacing: "8px",
  margin: "0",
};

const footer = {
  color: "#a1a1aa",
  fontSize: "13px",
  margin: "0",
};

export default OtpEmail;
