import Link from "next/link";
import { DEFAULT_CURRENCY, formatCurrencyAmount } from "@/lib/currencies";
import { calculateFinalPrice } from "@/lib/pricing";

type CatalogSeoProduct = {
  _id: string;
  name: string;
  price: number;
  discountPercent?: number | null;
};

type CatalogSeoSnapshotProps = {
  products: CatalogSeoProduct[];
  priceBounds: { minPrice: number; maxPrice: number };
};

/**
 * Server-rendered catalog summary for crawlers and no-JS clients.
 * Hidden visually; interactive catalog remains the client Convex view.
 */
export function CatalogSeoSnapshot({
  products,
  priceBounds,
}: CatalogSeoSnapshotProps) {
  if (products.length === 0) {
    return (
      <p className="sr-only">
        Browse our product catalog. Price filters appear once products are available.
      </p>
    );
  }

  return (
    <section className="sr-only" aria-label="Product catalog summary">
      <p>
        Price range{" "}
        {formatCurrencyAmount(priceBounds.minPrice, DEFAULT_CURRENCY)} –{" "}
        {formatCurrencyAmount(priceBounds.maxPrice, DEFAULT_CURRENCY)}
      </p>
      <ul>
        {products.map((product) => {
          const finalPrice = calculateFinalPrice(
            product.price,
            product.discountPercent ?? 0
          );
          return (
            <li key={product._id}>
              <Link href={`/product/${product._id}`}>
                {product.name} — {formatCurrencyAmount(finalPrice, DEFAULT_CURRENCY)}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
