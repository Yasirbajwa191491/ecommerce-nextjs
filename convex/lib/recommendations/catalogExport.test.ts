import { describe, expect, it } from "vitest";
import { CATALOG_EXPORT_FIELDS, toCatalogExportRecord } from "./catalogExport";

const product = {
  _id: "prod_headphones",
  name: "Travel Headphones",
  company: "Northwave",
  price: 89,
  currency: "USD",
  sku: "NW-1",
  colors: ["Black"],
  featured: true,
  discountPercent: 10,
  stock: 4,
  reviews: 12,
  stars: 4.5,
  description: "Wireless headphones",
  seoKeywords: ["bluetooth"],
  highlights: ["noise cancelling"],
};

describe("catalog export records", () => {
  it("keeps the Convex id and denormalized category without customer fields", () => {
    const record = toCatalogExportRecord(product, { name: "Audio", slug: "audio" });
    expect(record).toMatchObject({
      product_id: "prod_headphones",
      category_name: "Audio",
      category_slug: "audio",
      active: true,
      discount_percent: 10,
      data_origin: "real_catalog",
    });
    expect(Object.keys(record ?? {}).sort()).toEqual([...CATALOG_EXPORT_FIELDS].sort());
    expect(record).not.toHaveProperty("embedding");
    expect(record).not.toHaveProperty("email");
  });

  it("treats a missing active flag as active and skips a missing category", () => {
    expect(toCatalogExportRecord(product, { name: "Audio", slug: "audio" })?.active).toBe(true);
    expect(
      toCatalogExportRecord(
        { ...product, active: false },
        { name: "Audio", slug: "audio" }
      )?.active
    ).toBe(false);
    expect(toCatalogExportRecord(product, null)).toBeNull();
  });
});
