"use client";

import Link from "next/link";
import type { Id } from "../../../../convex/_generated/dataModel";

type CopilotProductLinkProps = {
  productId?: Id<"products">;
  productName?: string;
};

export function CopilotProductLink({
  productId,
  productName,
}: CopilotProductLinkProps) {
  if (!productId) return null;

  return (
    <Link
      href={`/admin/products/${productId}/edit`}
      className="text-xs font-medium text-primary hover:underline"
    >
      View {productName ?? "product"}
    </Link>
  );
}
