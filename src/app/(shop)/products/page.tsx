"use client";

import { Suspense } from "react";
import ProductCatalog from "@/components/products/ProductCatalog";
import { MotionSkeleton } from "@/components/motion";

function ProductsPageFallback() {
  return (
    <div className="min-h-screen bg-muted/20 px-4 py-12 sm:px-6">
      <MotionSkeleton shimmer className="mx-auto mb-8 h-28 max-w-7xl rounded-2xl" />
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[16rem_1fr]">
        <MotionSkeleton shimmer className="h-[28rem] rounded-2xl" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <MotionSkeleton key={i} shimmer className="h-80 rounded-2xl" />
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
