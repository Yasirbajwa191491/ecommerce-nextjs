import { Doc, Id } from "@convex/_generated/dataModel";

/** Enriched product returned by public catalog queries. */
export type Product = Doc<"products"> & {
  category?: {
    _id: Id<"productCategories">;
    name: string;
    slug: string;
  } | null;
};

export type FeaturedProduct = Product;
