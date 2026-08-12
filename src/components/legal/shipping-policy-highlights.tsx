import Link from "next/link";
import { Package, PackageSearch, ShoppingCart, Tag, Truck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SHOP_BODY, SHOP_CARD_TITLE } from "@/lib/typography";
import { cn } from "@/lib/utils";

const SHIPPING_HIGHLIGHTS = [
  {
    icon: Truck,
    title: "Standard delivery",
    description:
      "Most orders ship within 1–3 business days after confirmation. Delivery estimates appear at checkout.",
  },
  {
    icon: Tag,
    title: "Shipping costs",
    description:
      "Product pages show shipping fees where applicable. Your cart and checkout summary display the full total before you pay.",
  },
  {
    icon: ShoppingCart,
    title: "Express options",
    description:
      "When available on a product, express, same-day, or next-day delivery can be selected during checkout.",
  },
  {
    icon: Package,
    title: "Unavailable items",
    description:
      "If an item becomes unavailable after you order, our team will contact you with alternatives or a refund.",
  },
  {
    icon: PackageSearch,
    title: "Tracking",
    description:
      "Track any order with your order number on the Track Order page — no account required.",
  },
] as const;

export function ShippingPolicyHighlights({ className }: { className?: string }) {
  return (
    <section className={cn("mb-8", className)} aria-labelledby="shipping-highlights-heading">
      <h2 id="shipping-highlights-heading" className="text-lg font-semibold tracking-tight">
        Delivery at a glance
      </h2>
      <p className={cn("mt-2 max-w-3xl", SHOP_BODY)}>
        Key shipping details for this store. See the full policy below for terms and conditions.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {SHIPPING_HIGHLIGHTS.map(({ icon: Icon, title, description }) => (
          <Card key={title} className="border-border/60 shadow-sm">
            <CardContent className="flex gap-3 p-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
                <Icon className="size-5" />
              </span>
              <div>
                <h3 className={SHOP_CARD_TITLE}>{title}</h3>
                <p className={cn("mt-1", SHOP_BODY)}>{description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className={cn("mt-4", SHOP_BODY)}>
        Questions about delivery?{" "}
        <Link href="/track-order" className="font-medium text-brand-primary hover:underline">
          Track your order
        </Link>{" "}
        or{" "}
        <Link href="/contact" className="font-medium text-brand-primary hover:underline">
          contact support
        </Link>
        .
      </p>
    </section>
  );
}
