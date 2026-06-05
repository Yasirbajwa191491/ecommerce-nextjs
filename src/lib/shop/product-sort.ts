export type ProductSort = "lowest" | "highest" | "a-z" | "z-a";

export const PRODUCT_SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: "lowest", label: "Price (lowest)" },
  { value: "highest", label: "Price (highest)" },
  { value: "a-z", label: "Name (A–Z)" },
  { value: "z-a", label: "Name (Z–A)" },
];
