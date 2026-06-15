import { Button, Column, Img, Row, Section, Text } from "@react-email/components";

export type ProductPromoCardProps = {
  name: string;
  imageUrl: string;
  originalPrice: string;
  discountedPrice: string;
  discountPercent: number;
  shopUrl: string;
  ctaText?: string;
};

export function ProductPromoCard({
  name,
  imageUrl,
  originalPrice,
  discountedPrice,
  discountPercent,
  shopUrl,
  ctaText = "Shop Now",
}: ProductPromoCardProps) {
  return (
    <Section style={card}>
      <Row>
        <Column style={imageCol}>
          {imageUrl ? (
            <Img src={imageUrl} alt={name} width="200" height="200" style={image} />
          ) : (
            <div style={imagePlaceholder} />
          )}
        </Column>
        <Column style={contentCol}>
          <Text style={productName}>{name}</Text>
          <Text style={discountBadge}>{discountPercent}% OFF</Text>
          <Text style={priceRow}>
            <span style={originalPriceStyle}>{originalPrice}</span>
            <span style={salePriceStyle}> {discountedPrice}</span>
          </Text>
          <Button href={shopUrl} style={ctaButton}>
            {ctaText}
          </Button>
        </Column>
      </Row>
    </Section>
  );
}

const card = {
  backgroundColor: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  marginBottom: "16px",
  padding: "16px",
};

const imageCol = { width: "200px", verticalAlign: "top" as const };
const contentCol = { paddingLeft: "16px", verticalAlign: "top" as const };

const image = {
  borderRadius: "8px",
  objectFit: "cover" as const,
};

const imagePlaceholder = {
  width: "200px",
  height: "200px",
  backgroundColor: "#f3f4f6",
  borderRadius: "8px",
};

const productName = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#111827",
  margin: "0 0 8px",
};

const discountBadge = {
  display: "inline-block",
  backgroundColor: "#dc2626",
  color: "#ffffff",
  fontSize: "12px",
  fontWeight: "700",
  padding: "4px 10px",
  borderRadius: "999px",
  margin: "0 0 12px",
};

const priceRow = { margin: "0 0 16px", fontSize: "16px" };
const originalPriceStyle = {
  textDecoration: "line-through",
  color: "#9ca3af",
};
const salePriceStyle = {
  color: "#111827",
  fontWeight: "700",
  fontSize: "20px",
};

const ctaButton = {
  backgroundColor: "#111827",
  color: "#ffffff",
  padding: "12px 24px",
  borderRadius: "8px",
  fontSize: "14px",
  fontWeight: "600",
  textDecoration: "none",
};
