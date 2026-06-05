import { ProductDetailView } from "@/components/products/product-detail-view";

export default function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <ProductDetailView params={params} />;
}
