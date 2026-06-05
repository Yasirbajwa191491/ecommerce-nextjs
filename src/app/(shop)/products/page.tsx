"use client";

import { Suspense } from "react";
import ProductCatalog from "@/components/products/ProductCatalog";
import { Skeleton } from "@/components/ui/skeleton";

function ProductsPageFallback() {
  return (
    <div className="min-h-screen bg-muted/20 px-4 py-12 sm:px-6">
      <Skeleton className="mx-auto mb-8 h-28 max-w-7xl rounded-2xl" />
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[16rem_1fr]">
        <Skeleton className="h-[28rem] rounded-2xl" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductsPageFallback />}>
      <ProductCatalog />
    </Suspense>
  );
}
