import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { calculateFinalPrice } from "./pricing";
import { isProductActive } from "./productActive";
import {
  colorFamilySlug,
  resolveColorFamily,
  resolveProductColorFamilies,
} from "./colorFamilies";
import { slugify } from "./products";
import { isPromotionActive } from "./promotions/isActive";

export const promotionFilterSlugValidator = v.union(
  v.literal("on_sale"),
  v.literal("discounted"),
  v.literal("bogo"),
  v.literal("free_gift"),
  v.literal("buy_x_get_y"),
  v.literal("limited_time")
);

export type PromotionFilterSlug =
  | "on_sale"
  | "discounted"
  | "bogo"
  | "free_gift"
  | "buy_x_get_y"
  | "limited_time";

export const PROMOTION_FILTER_LABELS: Record<PromotionFilterSlug, string> = {
  on_sale: "On Sale",
  discounted: "Discounted Products",
  bogo: "Buy One Get One Free",
  free_gift: "Free Gift Included",
  buy_x_get_y: "Buy X Get Y",
  limited_time: "Limited Time Offer",
};

const LIMITED_TIME_MS = 14 * 24 * 60 * 60 * 1000;

export type CatalogProduct = {
  _id: Id<"products">;
  name: string;
  company: string;
  price: number;
  discountPercent?: number | null;
  colors: string[];
  stock: number;
  stars: number;
  reviews: number;
  categoryId: Id<"productCategories">;
  active?: boolean | null;
  sortOrder?: number | null;
};

export type PublicFilterArgs = {
  search?: string;
  categoryId?: Id<"productCategories">;
  minPrice?: number;
  maxPrice?: number;
  brands?: string[];
  colors?: string[];
  minRating?: number;
  promotions?: PromotionFilterSlug[];
  sort?: "default" | "lowest" | "highest" | "a-z" | "z-a";
};

export type PromotionIndex = Map<
  Id<"products">,
  Set<PromotionFilterSlug>
>;

export function buildPromotionIndex(
  products: CatalogProduct[],
  promotions: Doc<"productPromotions">[],
  now: number
): PromotionIndex {
  const index: PromotionIndex = new Map();

  const ensure = (productId: Id<"products">) => {
    if (!index.has(productId)) {
      index.set(productId, new Set());
    }
    return index.get(productId)!;
  };

  for (const product of products) {
    if ((product.discountPercent ?? 0) > 0) {
      const slugs = ensure(product._id);
      slugs.add("on_sale");
      slugs.add("discounted");
    }
  }

  for (const promo of promotions) {
    if (!isPromotionActive(promo, now)) continue;

    const slugsForPromo: PromotionFilterSlug[] = [];
    if (promo.type === "bogo") slugsForPromo.push("bogo");
    if (promo.type === "free_gift") slugsForPromo.push("free_gift");
    if (promo.type === "buy_x_get_y") slugsForPromo.push("buy_x_get_y");
    if (promo.endAt - now <= LIMITED_TIME_MS) {
      slugsForPromo.push("limited_time");
    }

    if (slugsForPromo.length === 0) continue;

    const buySlugs = ensure(promo.buyProductId);
    for (const slug of slugsForPromo) {
      buySlugs.add(slug);
    }

    if (promo.getProductId) {
      const getSlugs = ensure(promo.getProductId);
      for (const slug of slugsForPromo) {
        getSlugs.add(slug);
      }
    }
  }

  return index;
}

function productMatchesBrand(product: CatalogProduct, brands: string[]): boolean {
  const companyLower = product.company.trim().toLowerCase();
  const companySlug = slugify(product.company).toLowerCase();
  return brands.some((brand) => {
    const normalized = brand.trim().toLowerCase();
    return normalized === companyLower || normalized === companySlug;
  });
}

function productMatchesColors(product: CatalogProduct, colorSlugs: string[]): boolean {
  const families = resolveProductColorFamilies(product.colors);
  const familySlugs = new Set(families.map(colorFamilySlug));
  return colorSlugs.some((slug) => familySlugs.has(slug.trim().toLowerCase()));
}

function productMatchesRating(product: CatalogProduct, minRating: number): boolean {
  if (product.reviews <= 0) return false;
  return product.stars >= minRating;
}

function productMatchesPromotions(
  productId: Id<"products">,
  promotions: PromotionFilterSlug[],
  promotionIndex: PromotionIndex
): boolean {
  const productSlugs = promotionIndex.get(productId);
  if (!productSlugs) return false;
  return promotions.some((slug) => productSlugs.has(slug));
}

export function filterCatalogProducts<
  T extends CatalogProduct,
>(
  products: T[],
  args: PublicFilterArgs & { active?: boolean },
  promotionIndex: PromotionIndex
): T[] {
  let filtered = products.filter((p) =>
    args.active === undefined ? isProductActive(p) : isProductActive(p) === args.active
  );

  if (args.categoryId) {
    filtered = filtered.filter((p) => p.categoryId === args.categoryId);
  }

  if (args.search?.trim()) {
    const term = args.search.trim().toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.company.toLowerCase().includes(term)
    );
  }

  if (args.minPrice !== undefined) {
    filtered = filtered.filter((p) => p.price >= args.minPrice!);
  }
  if (args.maxPrice !== undefined) {
    filtered = filtered.filter((p) => p.price <= args.maxPrice!);
  }

  if (args.brands?.length) {
    filtered = filtered.filter((p) => productMatchesBrand(p, args.brands!));
  }

  if (args.colors?.length) {
    filtered = filtered.filter((p) => productMatchesColors(p, args.colors!));
  }

  if (args.minRating !== undefined) {
    filtered = filtered.filter((p) =>
      productMatchesRating(p, args.minRating!)
    );
  }

  if (args.promotions?.length) {
    filtered = filtered.filter((p) =>
      productMatchesPromotions(p._id, args.promotions!, promotionIndex)
    );
  }

  return filtered;
}

export function sortCatalogProducts<
  T extends CatalogProduct,
>(products: T[], sort: PublicFilterArgs["sort"] = "default"): T[] {
  const sorted = [...products];
  switch (sort) {
    case "lowest":
      sorted.sort(
        (a, b) =>
          calculateFinalPrice(a.price, a.discountPercent ?? 0) -
          calculateFinalPrice(b.price, b.discountPercent ?? 0)
      );
      break;
    case "highest":
      sorted.sort(
        (a, b) =>
          calculateFinalPrice(b.price, b.discountPercent ?? 0) -
          calculateFinalPrice(a.price, a.discountPercent ?? 0)
      );
      break;
    case "a-z":
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "z-a":
      sorted.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case "default":
    default:
      sorted.sort(
        (a, b) =>
          (a.sortOrder ?? Number.MAX_SAFE_INTEGER) -
          (b.sortOrder ?? Number.MAX_SAFE_INTEGER)
      );
      break;
  }
  return sorted;
}

export type FacetContext = {
  brands: Array<{ name: string; slug: string; count: number }>;
  colorFamilies: Array<{ name: string; slug: string; hex?: string; count: number }>;
  promotions: Array<{ slug: PromotionFilterSlug; label: string; count: number }>;
  ratingBuckets: Array<{ minRating: number; label: string; count: number }>;
};

export function computeFilterFacets(
  products: CatalogProduct[],
  promotionIndex: PromotionIndex,
  partialArgs: Omit<PublicFilterArgs, "brands" | "colors" | "promotions" | "minRating">
): FacetContext {
  const baseFiltered = filterCatalogProducts(products, partialArgs, promotionIndex);

  // Brands
  const brandCounts = new Map<string, { name: string; count: number }>();
  for (const product of baseFiltered) {
    const name = product.company.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const existing = brandCounts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      brandCounts.set(key, { name, count: 1 });
    }
  }

  // Color families
  const colorCounts = new Map<string, { name: string; count: number }>();
  for (const product of baseFiltered) {
    const families = resolveProductColorFamilies(product.colors);
    for (const family of families) {
      const existing = colorCounts.get(family);
      if (existing) {
        existing.count += 1;
      } else {
        colorCounts.set(family, { name: family, count: 1 });
      }
    }
  }

  // Promotions
  const promoCounts = new Map<PromotionFilterSlug, number>();
  for (const product of baseFiltered) {
    const slugs = promotionIndex.get(product._id);
    if (!slugs) continue;
    for (const slug of slugs) {
      promoCounts.set(slug, (promoCounts.get(slug) ?? 0) + 1);
    }
  }

  // Rating buckets
  const ratingBuckets = [
    { minRating: 5, label: "5 Stars" },
    { minRating: 4, label: "4 Stars & Up" },
    { minRating: 3, label: "3 Stars & Up" },
    { minRating: 2, label: "2 Stars & Up" },
    { minRating: 1, label: "1 Star & Up" },
  ].map((bucket) => ({
    ...bucket,
    count: baseFiltered.filter((p) =>
      productMatchesRating(p, bucket.minRating)
    ).length,
  }));

  const promotionSlugs = (
    Object.keys(PROMOTION_FILTER_LABELS) as PromotionFilterSlug[]
  ).filter((slug) => (promoCounts.get(slug) ?? 0) > 0);

  return {
    brands: Array.from(brandCounts.values())
      .sort(
        (a, b) =>
          b.count - a.count || a.name.localeCompare(b.name)
      )
      .map((brand) => ({
        name: brand.name,
        slug: slugify(brand.name),
        count: brand.count,
      })),
    colorFamilies: Array.from(colorCounts.values())
      .sort(
        (a, b) =>
          b.count - a.count || a.name.localeCompare(b.name)
      )
      .map((color) => ({
        name: color.name,
        slug: colorFamilySlug(color.name),
        count: color.count,
      })),
    promotions: promotionSlugs.map((slug) => ({
      slug,
      label: PROMOTION_FILTER_LABELS[slug],
      count: promoCounts.get(slug) ?? 0,
    })),
    ratingBuckets,
  };
}

export function brandNamesFromSlugs(
  slugs: string[],
  facets: FacetContext
): string[] {
  return slugs
    .map((slug) =>
      facets.brands.find((brand) => brand.slug === slug.trim().toLowerCase())
    )
    .filter((brand): brand is NonNullable<typeof brand> => Boolean(brand))
    .map((brand) => brand.name);
}

export { resolveColorFamily, colorFamilySlug };
