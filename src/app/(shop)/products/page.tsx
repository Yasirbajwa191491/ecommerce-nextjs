import type { Metadata } from "next";
import { Suspense } from "react";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import ProductCatalog from "@/components/products/ProductCatalog";
import { CatalogSeoSnapshot } from "@/components/products/catalog-seo-snapshot";
import { MotionSkeleton } from "@/components/motion";
import { STORE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Products",
  description: `Browse the ${STORE_NAME} catalog — filter by category, price, brand, and more.`,
};

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

async function ProductsCatalogSeo() {
  try {
    const now = Date.now();
    const [priceBounds, firstPage] = await Promise.all([
      fetchQuery(api.products.getPublicPriceBounds, {}),
      fetchQuery(api.products.listPublicPaginated, {
        paginationOpts: { numItems: 12, cursor: null },
        sort: "default",
        now,
      }),
    ]);

    return (
      <CatalogSeoSnapshot
        products={firstPage.page}
        priceBounds={priceBounds}
      />
    );
  } catch {
    return null;
  }
}

export default function ProductsPage() {
  return (
    <>
      <Suspense fallback={null}>
        <ProductsCatalogSeo />
      </Suspense>
      <Suspense fallback={<ProductsPageFallback />}>
        <ProductCatalog />
      </Suspense>
    </>
  );
}
