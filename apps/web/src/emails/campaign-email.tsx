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
import { CampaignFooter } from "./components/campaign-footer";
import { ProductPromoCard } from "./components/product-promo-card";

export type CampaignEmailProduct = {
  id: string;
  name: string;
  imageUrl: string;
  originalPrice: string;
  discountedPrice: string;
  discountPercent: number;
  shopUrl: string;
};

export type CampaignEmailProps = {
  subject: string;
  previewText?: string;
  headline?: string;
  productPromoText?: string;
  ctaText?: string;
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  unsubscribeLink: string;
  bodyHtml: string;
  products?: CampaignEmailProduct[];
};

export function CampaignEmail({
  subject,
  previewText,
  headline,
  productPromoText,
  ctaText = "Shop Now",
  companyName,
  companyEmail,
  companyPhone,
  companyAddress,
  unsubscribeLink,
  bodyHtml,
  products = [],
}: CampaignEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{previewText?.trim() || subject}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={logo}>{companyName}</Heading>

          {headline?.trim() ? (
            <Heading as="h2" style={emailHeadline}>
              {headline}
            </Heading>
          ) : null}

          <Section style={contentSection}>
            <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
          </Section>

          {products.length > 0 ? (
            <Section style={productsSection}>
              {productPromoText?.trim() ? (
                <Text style={promoText}>{productPromoText}</Text>
              ) : null}
              <Text style={sectionTitle}>Featured Deals</Text>
              {products.map((product) => (
                <ProductPromoCard
                  key={product.id}
                  name={product.name}
                  imageUrl={product.imageUrl}
                  originalPrice={product.originalPrice}
                  discountedPrice={product.discountedPrice}
                  discountPercent={product.discountPercent}
                  shopUrl={product.shopUrl}
                  ctaText={ctaText}
                />
              ))}
            </Section>
          ) : null}

          <CampaignFooter
            companyName={companyName}
            companyEmail={companyEmail}
            companyPhone={companyPhone}
            companyAddress={companyAddress}
            unsubscribeLink={unsubscribeLink}
          />
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f3f4f6",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "32px 24px",
  maxWidth: "600px",
  borderRadius: "8px",
};

const logo = {
  color: "#111827",
  fontSize: "24px",
  fontWeight: "700",
  textAlign: "center" as const,
  margin: "0 0 24px",
};

const emailHeadline = {
  color: "#111827",
  fontSize: "28px",
  fontWeight: "700",
  textAlign: "center" as const,
  margin: "0 0 20px",
  lineHeight: "36px",
};

const promoText = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#4b5563",
  textAlign: "center" as const,
  margin: "0 0 20px",
};

const contentSection = {
  color: "#374151",
  fontSize: "16px",
  lineHeight: "26px",
};

const productsSection = {
  marginTop: "32px",
};

const sectionTitle = {
  fontSize: "20px",
  fontWeight: "700",
  color: "#111827",
  margin: "0 0 16px",
  textAlign: "center" as const,
};
