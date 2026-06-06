import { Hr, Link, Section, Text } from "@react-email/components";

export type CampaignFooterProps = {
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  unsubscribeLink: string;
};

export function CampaignFooter({
  companyName,
  companyEmail,
  companyPhone,
  companyAddress,
  unsubscribeLink,
}: CampaignFooterProps) {
  return (
    <Section style={footer}>
      <Hr style={hr} />
      <Text style={footerText}>{companyName}</Text>
      {companyAddress ? <Text style={footerText}>{companyAddress}</Text> : null}
      {companyEmail ? (
        <Text style={footerText}>
          <Link href={`mailto:${companyEmail}`} style={link}>
            {companyEmail}
          </Link>
        </Text>
      ) : null}
      {companyPhone ? <Text style={footerText}>{companyPhone}</Text> : null}
      <Text style={footerText}>
        <Link href={unsubscribeLink} style={unsubscribeLinkStyle}>
          Unsubscribe
        </Link>
      </Text>
    </Section>
  );
}

const footer = { marginTop: "32px" };
const hr = { borderColor: "#e5e7eb", margin: "24px 0" };
const footerText = {
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: "20px",
  margin: "4px 0",
  textAlign: "center" as const,
};
const link = { color: "#6b7280", textDecoration: "underline" };
const unsubscribeLinkStyle = {
  color: "#9ca3af",
  fontSize: "11px",
  textDecoration: "underline",
};
