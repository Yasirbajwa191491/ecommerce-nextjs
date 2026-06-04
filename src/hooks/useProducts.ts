"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useProducts() {
  const products = useQuery(api.products.list);
  const featureProducts = useQuery(api.products.featured);
  return {
    products: products ?? [],
    featureProducts: featureProducts ?? [],
    isLoading: products === undefined,
  };
}

export function useSingleProduct(externalId: string) {
  const product = useQuery(api.products.getByExternalId, { externalId });
  return {
    singleProduct: product ?? null,
    isSingleLoading: product === undefined,
  };
}
