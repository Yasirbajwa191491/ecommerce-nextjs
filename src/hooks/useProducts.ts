"use client";

import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

type EnrichedProduct = FunctionReturnType<typeof api.products.getById>;

let productByIdCache = new Map<string, EnrichedProduct>();

export function useProducts() {
  const products = useQuery(api.products.list);
  const featureProducts = useQuery(api.products.featured);
  return {
    products: products ?? [],
    featureProducts: featureProducts ?? [],
    isLoading: products === undefined,
  };
}

export function useSingleProduct(id: Id<"products"> | string) {
  const productQuery = useQuery(
    api.products.getById,
    id ? { id: id as Id<"products"> } : "skip"
  );
  const cacheKey = id ? String(id) : "";
  if (productQuery !== undefined && cacheKey) {
    productByIdCache.set(cacheKey, productQuery);
  }
  const cached = cacheKey ? productByIdCache.get(cacheKey) : undefined;
  const singleProduct =
    productQuery !== undefined
      ? productQuery
      : cached !== undefined
        ? cached
        : null;
  const isSingleLoading =
    productQuery === undefined && cached === undefined && !!id;

  return {
    singleProduct,
    isSingleLoading,
  };
}

export function useActiveCategories() {
  const categories = useQuery(api.productCategories.listActive);
  return {
    categories: categories ?? [],
    isLoading: categories === undefined,
  };
}
