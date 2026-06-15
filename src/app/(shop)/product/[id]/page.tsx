import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { ProductDetailView } from "@/components/products/product-detail-view";
import { buildProductPageMetadata } from "@/lib/product-metadata";

type ProductPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const product = await fetchQuery(api.products.getById, {
      id: id as Id<"products">,
    });
    if (!product) {
      return { title: "Product not found" };
    }
    return buildProductPageMetadata(product);
  } catch {
    return { title: "Product" };
  }
}

export default function ProductPage({ params }: ProductPageProps) {
  return <ProductDetailView params={params} />;
}
