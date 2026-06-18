"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, CreditCard } from "lucide-react";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { CheckoutOrderSummary } from "@/components/checkout/checkout-order-summary";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useCartContext } from "@/context/cart_context";
import { PromotionAppliedSection } from "@/components/promotions/promotion-applied-section";
import { useCartPricing, toCartPricedLine } from "@/hooks/useCartPricing";
import { loadCheckoutCustomer } from "@/lib/checkout-customer-storage";

export function CheckoutView() {
  const router = useRouter();
  const { cart } = useCartContext();
  const { priced, pricingError, isLoading, getPricedItem } = useCartPricing(cart);
  const [customerPrefill, setCustomerPrefill] = useState<
    ReturnType<typeof loadCheckoutCustomer>
  >(null);
  const hasCheckedInitialCart = useRef(false);

  const getPricedLine = useMemo(() => {
    return (item: (typeof cart)[number]) => {
      const line = getPricedItem(item);
      return line ? toCartPricedLine(line) : undefined;
    };
  }, [getPricedItem]);

  useEffect(() => {
    if (hasCheckedInitialCart.current) return;
    hasCheckedInitialCart.current = true;
    if (!cart.length) {
      router.replace("/cart");
    }
  }, [cart.length, router]);

  useEffect(() => {
    setCustomerPrefill(loadCheckoutCustomer());
  }, []);

  const initialFormValues = useMemo(
    () =>
      customerPrefill
        ? {
            fullName: customerPrefill.fullName,
            email: customerPrefill.email,
            phone: customerPrefill.phone,
            address: customerPrefill.address,
            notes: customerPrefill.notes ?? "",
          }
        : undefined,
    [customerPrefill]
  );

  if (!cart.length) {
    return null;
  }

  const giftItems = priced?.items?.filter((item) => item.isPromotionGift) ?? [];

  return (
    <div className="min-h-[60vh] bg-gradient-to-b from-muted/40 via-background to-background">
      <section className="w-full px-4 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10 xl:px-16 2xl:px-20">
        <nav
          aria-label="Breadcrumb"
          className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"
        >
          <Link href="/home" className="transition-colors hover:text-foreground">
            Home
          </Link>
          <ChevronRight className="size-3.5 shrink-0 opacity-50" />
          <Link href="/cart" className="transition-colors hover:text-foreground">
            Shopping cart
          </Link>
          <ChevronRight className="size-3.5 shrink-0 opacity-50" />
          <span className="font-medium text-foreground">Checkout</span>
        </nav>

        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#6254f3]/10 text-[#6254f3] shadow-sm">
              <CreditCard className="size-6" />
            </span>
            <div>
              <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Checkout
              </h1>
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                Review your order and enter your details to complete purchase.
              </p>
            </div>
          </div>
          <Button
            render={<Link href="/cart" />}
            variant="outline"
            className="w-fit rounded-full"
          >
            Back to cart
          </Button>
        </div>

        {pricingError ? (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Cannot complete checkout</AlertTitle>
            <AlertDescription>{pricingError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start xl:gap-10 2xl:grid-cols-[minmax(0,1fr)_440px] 2xl:gap-12">
          <div className="min-w-0 space-y-4 xl:sticky xl:top-24">
            <PromotionAppliedSection
              gifts={giftItems.map((item) => ({
                productName: item.productName,
                color: item.color,
                quantity: item.quantity,
                imageUrl: item.imageUrl,
                promotionName: item.promotionName,
              }))}
              summaries={priced?.promotionSummaries}
              promotionSavingsTotal={priced?.promotionSavingsTotal}
              currency={priced?.currency}
            />
            <CheckoutOrderSummary
              cart={cart}
              subtotal={priced?.subtotal ?? 0}
              discountTotal={priced?.discountTotal ?? 0}
              tax={priced?.tax ?? 0}
              shipping={priced?.shipping ?? 0}
              total={priced?.total ?? 0}
              currency={priced?.currency}
              isLoading={isLoading}
              getPricedLine={getPricedLine}
            />
          </div>

          <aside className="min-w-0">
            <CheckoutForm initialValues={initialFormValues} />
          </aside>
        </div>
      </section>
    </div>
  );
}
