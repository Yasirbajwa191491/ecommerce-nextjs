import { Doc } from "../../convex/_generated/dataModel";

export type Product = Doc<"products"> & {
  category?: {
    _id: Doc<"productCategories">["_id"];
    name: string;
    slug: string;
  } | null;
};

export type ProductCategory = Doc<"productCategories">;
