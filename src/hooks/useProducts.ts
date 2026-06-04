"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

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
  const product = useQuery(
    api.products.getById,
    id ? { id: id as Id<"products"> } : "skip"
  );
  return {
    singleProduct: product ?? null,
    isSingleLoading: product === undefined && !!id,
  };
}

export function useActiveCategories() {
  const categories = useQuery(api.productCategories.listActive);
  return {
    categories: categories ?? [],
    isLoading: categories === undefined,
  };
}
