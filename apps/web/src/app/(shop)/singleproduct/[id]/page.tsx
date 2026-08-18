import { redirect } from "next/navigation";
import { productPath } from "@/lib/product-url";

export default async function LegacySingleProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(productPath(id));
}
