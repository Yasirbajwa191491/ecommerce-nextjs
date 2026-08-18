import type { AdminColumnDef } from "@/lib/admin/column-visibility";

export const PRODUCT_TABLE_COLUMNS: AdminColumnDef[] = [
  { id: "image", label: "Images" },
  { id: "name", label: "Name", locked: true },
  { id: "brand", label: "Brand" },
  { id: "category", label: "Category" },
  { id: "price", label: "Price" },
  { id: "currency", label: "Currency", defaultVisible: false },
  { id: "colors", label: "Colors", defaultVisible: false },
  { id: "stock", label: "Stock" },
  { id: "rating", label: "Rating (computed)" },
  { id: "reviews", label: "Reviews (computed)", defaultVisible: false },
  { id: "featured", label: "Featured", defaultVisible: false },
  { id: "shipping", label: "Free shipping", defaultVisible: false },
  { id: "description", label: "Description", defaultVisible: false },
  { id: "actions", label: "Actions", locked: true },
];

export const PRODUCT_COLUMNS_STORAGE_KEY = "admin-products-column-visibility";
