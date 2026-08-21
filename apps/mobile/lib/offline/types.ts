import type { Product } from "@/types/product";

export type TrackOrderCache = {
  method: "order-number" | "customer";
  query: string;
  cachedAt: number;
  orderNumber?: string;
  statusLabel?: string;
};

export type HomeCategory = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  productCount?: number;
  sampleImageUrl?: string | null;
};

export type CachedProductList = Product[];
