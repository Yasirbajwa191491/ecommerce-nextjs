import { isProductActive } from "../productActive";

export const CATALOG_EXPORT_PAGE_SIZE = 50;

export type CatalogExportProduct = {
  _id: string;
  name: string;
  company: string;
  price: number;
  currency?: string;
  sku?: string;
  colors?: string[];
  featured: boolean;
  discountPercent?: number;
  stock: number;
  reviews: number;
  stars: number;
  description: string;
  seoKeywords?: string[];
  highlights?: string[];
  active?: boolean | null;
};

export type CatalogExportCategory = {
  name: string;
  slug: string;
} | null;

export type CatalogExportRecord = {
  product_id: string;
  name: string;
  company: string;
  category_name: string;
  category_slug: string;
  description: string;
  colors: string[];
  seo_keywords: string[];
  highlights: string[];
  price: number;
  currency: string | null;
  discount_percent: number | null;
  stock: number;
  active: boolean;
  featured: boolean;
  stars: number;
  reviews: number;
  sku: string | null;
  data_origin: "real_catalog";
};

export const CATALOG_EXPORT_FIELDS = [
  "product_id",
  "name",
  "company",
  "category_name",
  "category_slug",
  "description",
  "colors",
  "seo_keywords",
  "highlights",
  "price",
  "currency",
  "discount_percent",
  "stock",
  "active",
  "featured",
  "stars",
  "reviews",
  "sku",
  "data_origin",
] as const;

export function clampCatalogPageSize(limit: number): number {
  if (!Number.isFinite(limit)) return CATALOG_EXPORT_PAGE_SIZE;
  return Math.min(CATALOG_EXPORT_PAGE_SIZE, Math.max(1, Math.floor(limit)));
}

export function toCatalogExportRecord(
  product: CatalogExportProduct,
  category: CatalogExportCategory
): CatalogExportRecord | null {
  const categoryName = category?.name?.trim() ?? "";
  const categorySlug = category?.slug?.trim() ?? "";
  if (!product._id || !product.name.trim() || !product.company.trim()) return null;
  if (!categoryName || !categorySlug) return null;
  if (!Number.isFinite(product.price)) return null;
  return {
    product_id: product._id,
    name: product.name,
    company: product.company,
    category_name: categoryName,
    category_slug: categorySlug,
    description: product.description ?? "",
    colors: product.colors ?? [],
    seo_keywords: product.seoKeywords ?? [],
    highlights: product.highlights ?? [],
    price: product.price,
    currency: product.currency ?? null,
    discount_percent: product.discountPercent ?? null,
    stock: product.stock,
    active: isProductActive(product),
    featured: product.featured,
    stars: product.stars,
    reviews: product.reviews,
    sku: product.sku ?? null,
    data_origin: "real_catalog",
  };
}
