export type ProductSort =
  | "default"
  | "popular"
  | "newest"
  | "lowest"
  | "highest"
  | "rating"
  | "a-z"
  | "z-a";

export const PRODUCT_SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: "default", label: "Recommended" },
  { value: "popular", label: "Popular" },
  { value: "newest", label: "Newest" },
  { value: "lowest", label: "Price: Low to High" },
  { value: "highest", label: "Price: High to Low" },
  { value: "rating", label: "Rating" },
  { value: "a-z", label: "A–Z" },
  { value: "z-a", label: "Z–A" },
];
