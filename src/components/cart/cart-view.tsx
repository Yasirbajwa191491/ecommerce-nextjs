"use client";

import Link from "next/link";
import { ChevronRight, ShoppingCart, Trash2 } from "lucide-react";
import { AnimatePresence, m } from "framer-motion";
import { toast } from "sonner";
import { useCartContext } from "@/context/cart_context";
import { CartItemMobile, CartItemRow } from "@/components/cart/cart-item";
import { CartOrderSummary } from "@/components/cart/cart-order-summary";
import { CartEmptyState } from "@/components/cart/cart-empty-state";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import FormatPrice from "@/helpers/FormatPrice";
import { cn } from "@/lib/utils";
import { PromotionAppliedSection } from "@/components/promotions/promotion-applied-section";
import { useCartPricing, toCartPricedLine } from "@/hooks/useCartPricing";
import { fadeUp } from "@/lib/motion";
import { SHOP_BREADCRUMB, SHOP_PAGE_LEAD, SHOP_PAGE_TITLE } from "@/lib/typography";

export function CartView() {
  const {
    cart,
    total_item,
    total_price,
    setIncrement,
    setDecrease,
    removeItem,
    clearCart,
  } = useCartContext();

  const { priced, pricingError, isLoading, getPricedItem } = useCartPricing(cart);
  const giftItems = priced?.items?.filter((item) => item.isPromotionGift) ?? [];
  const currency = priced?.currency;
  const displaySubtotal = priced?.subtotal ?? total_price;
  const displayTotal = priced?.total ?? total_price;

  const handleClearCart = () => {
    clearCart();
    toast.success("Cart cleared");
  };

  return (
    <div className="min-h-[60vh] bg-gradient-to-b from-muted/40 via-background to-background">
      <section className="w-full px-4 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10 xl:px-16 2xl:px-20">
        <nav
          aria-label="Breadcrumb"
          className={cn("mb-5", SHOP_BREADCRUMB)}
        >
          <Link href="/home" className="transition-colors hover:text-foreground">
            Home
          </Link>
          <ChevronRight className="size-3.5 shrink-0 opacity-50" />
          <span className="font-medium text-foreground">Shopping cart</span>
        </nav>

        {!cart.length ? (
          <>
            <div className="mb-8">
              <h1 className={SHOP_PAGE_TITLE}>
                Your shopping cart
              </h1>
            </div>
            <CartEmptyState />
          </>
        ) : (
          <>
            <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#6254f3]/10 text-[#6254f3] shadow-sm">
                  <ShoppingCart className="size-6" />
                </span>
                <div>
                  <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    Your shopping cart
                  </h1>
                  <p className={SHOP_PAGE_LEAD}>
                    Review items, adjust quantities, and proceed when you are
                    ready.
                  </p>
                </div>
              </div>
              <Badge
                variant="secondary"
                className="w-fit rounded-full bg-[#6254f3]/10 px-4 py-1.5 text-sm font-semibold text-[#6254f3]"
              >
                {total_item} {total_item === 1 ? "item" : "items"}
              </Badge>
            </div>

            {pricingError ? (
              <Alert variant="destructive" className="mb-6">
                <AlertTitle>Cart update needed</AlertTitle>
                <AlertDescription>{pricingError}</AlertDescription>
              </Alert>
            ) : null}

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px] xl:items-start xl:gap-10 2xl:grid-cols-[minmax(0,1fr)_420px] 2xl:gap-12">
              <div className="min-w-0 space-y-4">
                <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-md ring-1 ring-foreground/5">
                  {/* Mobile / tablet */}
                  <div className="space-y-4 p-4 lg:hidden">
                    <AnimatePresence initial={false} mode="popLayout">
                      {cart.map((item) => {
                        const pricedLine = getPricedItem(item);
                        return (
                          <CartItemMobile
                            key={item.id}
                            item={item}
                            pricedLine={
                              pricedLine ? toCartPricedLine(pricedLine) : undefined
                            }
                            currency={currency}
                            onIncrement={setIncrement}
                            onDecrement={setDecrease}
                            onRemove={removeItem}
                          />
                        );
                      })}
                    </AnimatePresence>
                  </div>

                  {/* Desktop table */}
                  <div className="hidden lg:block">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-border/60 bg-muted/30 hover:bg-muted/30">
                          <TableHead className="h-12 py-4 pl-8 text-xs font-bold tracking-wider text-foreground/70 uppercase xl:pl-10">
                            Product
                          </TableHead>
                          <TableHead className="h-12 w-32 py-4 text-right text-xs font-bold tracking-wider text-foreground/70 uppercase">
                            Unit price
                          </TableHead>
                          <TableHead className="h-12 w-44 py-4 text-center text-xs font-bold tracking-wider text-foreground/70 uppercase">
                            Quantity
                          </TableHead>
                          <TableHead className="h-12 w-32 py-4 text-right text-xs font-bold tracking-wider text-foreground/70 uppercase">
                            Subtotal
                          </TableHead>
                          <TableHead className="h-12 w-28 py-4 pr-8 xl:pr-10">
                            <span className="sr-only">Actions</span>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cart.map((item) => {
                          const pricedLine = getPricedItem(item);
                          return (
                            <CartItemRow
                              key={item.id}
                              item={item}
                              pricedLine={
                                pricedLine
                                  ? toCartPricedLine(pricedLine)
                                  : undefined
                              }
                              currency={currency}
                              onIncrement={setIncrement}
                              onDecrement={setDecrease}
                              onRemove={removeItem}
                            />
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-border/60 bg-muted/15 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8 xl:px-10">
                    <p className="text-sm text-muted-foreground sm:flex-1">
                      <span className="font-medium text-foreground">
                        {total_item} {total_item === 1 ? "item" : "items"}
                      </span>{" "}
                      in cart ·{" "}
                      <span className="font-semibold tabular-nums text-foreground">
                        <FormatPrice price={displaySubtotal} currency={currency} />
                      </span>{" "}
                      products total
                    </p>
                    <div className="w-fit self-end sm:self-auto">
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-fit gap-1.5 rounded-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            />
                          }
                        >
                          <Trash2 className="size-4" />
                          Clear cart
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogMedia>
                              <Trash2 />
                            </AlertDialogMedia>
                            <AlertDialogTitle>Clear your cart?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove all {total_item}{" "}
                              {total_item === 1 ? "item" : "items"} from your
                              cart. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep items</AlertDialogCancel>
                            <AlertDialogAction
                              variant="destructive"
                              onClick={handleClearCart}
                            >
                              Clear cart
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </div>

              <m.aside
                className="space-y-4 xl:sticky xl:top-24"
                initial="hidden"
                animate="visible"
                variants={fadeUp}
              >
                <PromotionAppliedSection
                  gifts={giftItems.map((item) => ({
                    productName: item.productName,
                    color: item.color,
                    quantity: item.quantity,
                    imageUrl: item.imageUrl,
                    promotionName: item.promotionName,
                    isPromotionGift: true,
                  }))}
                  summaries={priced?.promotionSummaries}
                  promotionSavingsTotal={priced?.promotionSavingsTotal}
                  currency={currency}
                />
                <CartOrderSummary
                  totalItem={total_item}
                  subtotal={displaySubtotal}
                  discountTotal={priced?.discountTotal ?? 0}
                  shipping={priced?.shipping ?? 0}
                  tax={priced?.tax ?? 0}
                  total={displayTotal}
                  currency={currency}
                  isLoading={isLoading}
                />
              </m.aside>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
