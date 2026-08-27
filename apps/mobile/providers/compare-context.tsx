import { getPrimaryImageUrl } from "@ecommerce/shared";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  MAX_COMPARE,
  readCompareProducts,
  writeCompareProducts,
  type CompareProductSummary,
} from "@/lib/compare-storage";
import type { Product } from "@/types/product";
import type { Id } from "@convex/_generated/dataModel";

type CompareContextValue = {
  products: CompareProductSummary[];
  compareCount: number;
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
  addProduct: (product: Product) => void;
  removeProduct: (productId: Id<"products">) => void;
  isComparing: (productId: Id<"products">) => boolean;
  openCompare: () => void;
  clearCompare: () => void;
};

const CompareContext = createContext<CompareContextValue | null>(null);

function toCompareSummary(product: Product): CompareProductSummary {
  const discount = product.discountPercent ?? 0;
  const finalPrice =
    discount > 0 ? product.price * (1 - discount / 100) : product.price;
  return {
    id: product._id as Id<"products">,
    name: product.name,
    company: product.company,
    finalPrice,
    currency: product.currency ?? "USD",
    rating: product.stars,
    reviewsCount: product.reviews,
    inStock: product.stock > 0,
    imageUrl: getPrimaryImageUrl(product) || undefined,
  };
}

export function CompareProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<CompareProductSummary[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    void readCompareProducts().then((stored) => {
      setProducts(stored);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void writeCompareProducts(products);
  }, [products, hydrated]);

  const addProduct = useCallback((product: Product) => {
    const summary = toCompareSummary(product);
    setProducts((current) => {
      const existing = current.filter((entry) => entry.id !== summary.id);
      const next = [...existing, summary].slice(-MAX_COMPARE);
      if (next.length >= 2) {
        setSheetOpen(true);
      }
      return next;
    });
  }, []);

  const removeProduct = useCallback((productId: Id<"products">) => {
    setProducts((current) => current.filter((entry) => entry.id !== productId));
  }, []);

  const isComparing = useCallback(
    (productId: Id<"products">) => products.some((entry) => entry.id === productId),
    [products]
  );

  const openCompare = useCallback(() => {
    if (products.length >= 2) {
      setSheetOpen(true);
    }
  }, [products.length]);

  const clearCompare = useCallback(() => {
    setProducts([]);
    setSheetOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      products,
      compareCount: products.length,
      sheetOpen,
      setSheetOpen,
      addProduct,
      removeProduct,
      isComparing,
      openCompare,
      clearCompare,
    }),
    [
      products,
      sheetOpen,
      addProduct,
      removeProduct,
      isComparing,
      openCompare,
      clearCompare,
    ]
  );

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export function useProductCompare() {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error("useProductCompare must be used within CompareProvider");
  }
  return context;
}

export function useProductCompareOptional() {
  return useContext(CompareContext);
}
