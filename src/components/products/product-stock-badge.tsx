import { cn } from "@/lib/utils";

const LOW_STOCK_THRESHOLD = 5;

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export function getStockStatus(stock: number): StockStatus {
  if (stock <= 0) return "out_of_stock";
  if (stock <= LOW_STOCK_THRESHOLD) return "low_stock";
  return "in_stock";
}

const STOCK_LABELS: Record<StockStatus, string> = {
  in_stock: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
};

const STOCK_STYLES: Record<StockStatus, string> = {
  in_stock: "bg-emerald-500/10 text-emerald-700",
  low_stock: "bg-amber-500/10 text-amber-700",
  out_of_stock: "bg-red-500/10 text-red-700",
};

type ProductStockBadgeProps = {
  stock: number;
  variant?: "default" | "compact";
  className?: string;
};

export function ProductStockBadge({
  stock,
  variant = "default",
  className,
}: ProductStockBadgeProps) {
  const status = getStockStatus(stock);

  return (
    <span
      className={cn(
        "inline-flex w-fit max-w-full shrink-0 self-start items-center rounded-full font-semibold uppercase tracking-wide",
        variant === "compact"
          ? "px-2 py-0.5 text-[10px]"
          : "px-2.5 py-1 text-[11px]",
        STOCK_STYLES[status],
        className
      )}
    >
      {STOCK_LABELS[status]}
    </span>
  );
}
