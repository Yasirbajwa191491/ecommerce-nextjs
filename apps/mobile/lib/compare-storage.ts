import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Id } from "@convex/_generated/dataModel";

export type CompareProductSummary = {
  id: Id<"products">;
  name: string;
  company: string;
  finalPrice: number;
  currency: string;
  rating: number;
  reviewsCount: number;
  inStock: boolean;
  imageUrl?: string;
};

export const MAX_COMPARE = 4;
const STORAGE_KEY = "mobileCompareProducts";

export async function readCompareProducts(): Promise<CompareProductSummary[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CompareProductSummary[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_COMPARE) : [];
  } catch {
    return [];
  }
}

export async function writeCompareProducts(products: CompareProductSummary[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(products.slice(0, MAX_COMPARE)));
  } catch {
    // ignore persistence errors
  }
}
