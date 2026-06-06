"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  AdminFormField,
  invalidInputClass,
} from "@/components/admin/admin-form-field";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  OrderStatusBadge,
  PaymentMethodBadge,
  PaymentStatusBadge,
} from "@/components/admin/order-status-badge";
import { OrderProgressTimeline } from "@/components/orders/order-progress-timeline";
import { toastError } from "@/lib/app-toast";
import { formatCurrencyAmount } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import {
  hasTrackByCustomerErrors,
  hasTrackByOrderErrors,
  validateTrackByCustomerForm,
  validateTrackByOrderForm,
  type TrackByCustomerErrors,
  type TrackByOrderErrors,
} from "@/lib/validation/track-order-form";
import type { PublicOrderSummary } from "@/types/order";
import {
  ArrowRight,
  Loader2,
  Mail,
  PackageSearch,
  Phone,
  Search,
  Hash,
} from "lucide-react";

const PRIMARY_BUTTON_CLASS =
  "group h-11 gap-2 rounded-full bg-[#6254f3] px-8 text-sm font-semibold !text-white shadow-md shadow-[#6254f3]/25 transition-all hover:bg-[#5548e0] hover:!text-white hover:shadow-lg active:scale-[0.98] disabled:opacity-50 [&_svg]:!text-white";

const COMPACT_PRIMARY_BUTTON_CLASS =
  "h-9 gap-1.5 rounded-full bg-[#6254f3] px-5 text-sm font-semibold !text-white shadow-sm shadow-[#6254f3]/20 transition-all hover:bg-[#5548e0] hover:!text-white active:scale-[0.98] [&_svg]:!text-white";

function formatDateTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function CustomerOrderCard({ order }: { order: PublicOrderSummary }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold tracking-tight">{order.orderNumber}</p>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {formatDateTime(order.createdAt)}
          </p>
          <div className="flex flex-wrap gap-2">
            <PaymentMethodBadge method={order.paymentMethod} />
            <PaymentStatusBadge status={order.paymentStatus} />
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          <p className="text-lg font-semibold text-[#6254f3]">
            {formatCurrencyAmount(order.total, order.currency)}
          </p>
          {(order.discountTotal > 0 || order.shipping > 0) && (
            <div className="text-xs text-muted-foreground">
              {order.discountTotal > 0 ? (
                <span>
                  Discount: −{formatCurrencyAmount(order.discountTotal, order.currency)}
                </span>
              ) : null}
              {order.discountTotal > 0 && order.shipping > 0 ? " · " : null}
              {order.shipping > 0 ? (
                <span>
                  Shipping: {formatCurrencyAmount(order.shipping, order.currency)}
                </span>
              ) : null}
            </div>
          )}
          <Button
            size="sm"
            className={COMPACT_PRIMARY_BUTTON_CLASS}
            render={
              <Link
                href={`/track-order/${encodeURIComponent(order.orderNumber)}`}
              />
            }
          >
            View details
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function TrackOrderView() {
  const router = useRouter();
  const trackByOrderNumber = useAction(api.orderTracking.trackByOrderNumber);
  const trackByCustomer = useAction(api.orderTracking.trackByCustomer);

  const [orderNumber, setOrderNumber] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderErrors, setOrderErrors] = useState<TrackByOrderErrors>({});
  const [customerErrors, setCustomerErrors] = useState<TrackByCustomerErrors>(
    {}
  );
  const [isSearchingOrder, setIsSearchingOrder] = useState(false);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [orderResult, setOrderResult] = useState<
    Awaited<ReturnType<typeof trackByOrderNumber>> | null
  >(null);
  const [customerResults, setCustomerResults] = useState<
    Awaited<ReturnType<typeof trackByCustomer>> | null
  >(null);

  const handleTrackByOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    const errors = validateTrackByOrderForm({ orderNumber });
    setOrderErrors(errors);
    if (hasTrackByOrderErrors(errors)) return;

    setIsSearchingOrder(true);
    setOrderResult(null);
    try {
      const result = await trackByOrderNumber({
        orderNumber: orderNumber.trim(),
      });
      setOrderResult(result);
      if (!result.found) {
        toastError(result.message);
      }
    } catch {
      toastError("We couldn't find any orders matching your details.");
    } finally {
      setIsSearchingOrder(false);
    }
  };

  const handleTrackByCustomer = async (event: React.FormEvent) => {
    event.preventDefault();
    const errors = validateTrackByCustomerForm({
      email: customerEmail,
      phone: customerPhone,
    });
    setCustomerErrors(errors);
    if (hasTrackByCustomerErrors(errors)) return;

    setIsSearchingCustomer(true);
    setCustomerResults(null);
    try {
      const result = await trackByCustomer({
        email: customerEmail.trim() || undefined,
        phone: (customerPhone ?? "").trim() || undefined,
      });
      setCustomerResults(result);
      if (!result.found) {
        toastError(result.message);
      }
    } catch {
      toastError("We couldn't find any orders matching your details.");
    } finally {
      setIsSearchingCustomer(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <div className="mb-8 text-center sm:mb-10">
        <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-3xl bg-[#6254f3]/10 text-[#6254f3] shadow-sm ring-1 ring-[#6254f3]/15">
          <PackageSearch className="size-8" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Track your order
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
          Enter your order number or the contact details used at checkout to
          see real-time status and delivery progress.
        </p>
      </div>

      <Tabs defaultValue="order-number" className="space-y-6">
        <div className="flex justify-center">
          <TabsList className="inline-flex h-auto w-fit gap-1 rounded-2xl bg-muted/50 p-1.5">
            <TabsTrigger
              value="order-number"
              className="h-11 shrink-0 rounded-xl px-3 sm:px-4 data-active:bg-background data-active:text-[#6254f3] data-active:shadow-sm"
            >
              <Hash className="size-4" />
              By order number
            </TabsTrigger>
            <TabsTrigger
              value="customer"
              className="h-11 shrink-0 rounded-xl px-3 sm:px-4 data-active:bg-background data-active:text-[#6254f3] data-active:shadow-sm"
            >
              <Mail className="size-4" />
              By customer info
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="order-number" className="mt-0">
          <Card className="overflow-hidden rounded-2xl border-border/60 shadow-lg ring-1 ring-black/[0.03]">
            <CardHeader className="space-y-1 border-b border-border/50 bg-muted/20 px-5 py-6 sm:px-8">
              <CardTitle className="text-xl">Track by order number</CardTitle>
              <CardDescription>
                Your order number is in your confirmation email and on the
                checkout success page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-5 py-6 sm:px-8">
              <form onSubmit={handleTrackByOrder} className="space-y-5">
                <AdminFormField
                  label="Order number"
                  htmlFor="track-order-number"
                  error={orderErrors.orderNumber}
                  required
                >
                  <Input
                    id="track-order-number"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="ORD-20260101-ABC123"
                    className={cn(
                      "h-11",
                      invalidInputClass(orderErrors.orderNumber)
                    )}
                    autoComplete="off"
                  />
                </AdminFormField>
                <div className="flex justify-center">
                  <Button
                    type="submit"
                    disabled={isSearchingOrder}
                    className={PRIMARY_BUTTON_CLASS}
                  >
                    {isSearchingOrder ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Search className="size-4" />
                    )}
                    Track order
                  </Button>
                </div>
              </form>

              {orderResult?.found ? (
                <div className="space-y-5 rounded-2xl border border-[#6254f3]/15 bg-[#6254f3]/[0.04] p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Order found
                      </p>
                      <p className="mt-1 text-lg font-semibold">
                        {orderResult.order.orderNumber}
                      </p>
                    </div>
                    <OrderStatusBadge status={orderResult.order.status} />
                  </div>

                  <OrderProgressTimeline status={orderResult.order.status} />

                  <div className="grid gap-4 text-sm sm:grid-cols-2">
                    <div className="rounded-xl bg-background/80 p-3 ring-1 ring-border/50">
                      <p className="text-muted-foreground">Payment</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <PaymentMethodBadge
                          method={orderResult.order.paymentMethod}
                        />
                        <PaymentStatusBadge
                          status={orderResult.order.paymentStatus}
                        />
                      </div>
                    </div>
                    <div className="rounded-xl bg-background/80 p-3 ring-1 ring-border/50">
                      <p className="text-muted-foreground">Total amount</p>
                      <p className="mt-2 text-lg font-semibold">
                        {formatCurrencyAmount(
                          orderResult.order.total,
                          orderResult.order.currency
                        )}
                      </p>
                    </div>
                    <div className="rounded-xl bg-background/80 p-3 ring-1 ring-border/50">
                      <p className="text-muted-foreground">Order date</p>
                      <p className="mt-2 font-medium">
                        {formatDateTime(orderResult.order.createdAt)}
                      </p>
                    </div>
                    {orderResult.order.paidAt ? (
                      <div className="rounded-xl bg-background/80 p-3 ring-1 ring-border/50">
                        <p className="text-muted-foreground">Payment completed</p>
                        <p className="mt-2 font-medium">
                          {formatDateTime(orderResult.order.paidAt)}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex justify-center">
                    <Button
                      className={PRIMARY_BUTTON_CLASS}
                      onClick={() =>
                        router.push(
                          `/track-order/${encodeURIComponent(orderResult.order.orderNumber)}`
                        )
                      }
                    >
                      View full details
                      <ArrowRight className="size-4" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customer" className="mt-0">
          <Card className="overflow-hidden rounded-2xl border-border/60 shadow-lg ring-1 ring-black/[0.03]">
            <CardHeader className="space-y-1 border-b border-border/50 bg-muted/20 px-5 py-6 sm:px-8">
              <CardTitle className="text-xl">Track by customer info</CardTitle>
              <CardDescription>
                Provide the email address or phone number from your order —
                you only need one of them.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-5 py-6 sm:px-8">
              <form onSubmit={handleTrackByCustomer} className="space-y-5">
                {customerErrors.form ? (
                  <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {customerErrors.form}
                  </p>
                ) : null}

                <AdminFormField
                  label="Email address"
                  htmlFor="track-customer-email"
                  error={customerErrors.email}
                >
                  <div className="relative">
                    <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="track-customer-email"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="you@example.com"
                      className={cn(
                        "h-11 pl-9",
                        invalidInputClass(customerErrors.email)
                      )}
                    />
                  </div>
                </AdminFormField>

                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/70" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-card px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      or
                    </span>
                  </div>
                </div>

                <AdminFormField
                  label="Phone number"
                  htmlFor="track-customer-phone"
                  error={customerErrors.phone}
                >
                  <PhoneInput
                    id="track-customer-phone"
                    value={customerPhone}
                    onChange={(value) => setCustomerPhone(value ?? "")}
                    className={invalidInputClass(customerErrors.phone)}
                  />
                </AdminFormField>

                <div className="flex justify-center">
                  <Button
                    type="submit"
                    disabled={isSearchingCustomer}
                    className={PRIMARY_BUTTON_CLASS}
                  >
                    {isSearchingCustomer ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Phone className="size-4" />
                    )}
                    Find my orders
                  </Button>
                </div>
              </form>

              {customerResults?.found && customerResults.orders.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">
                    {customerResults.orders.length} order
                    {customerResults.orders.length === 1 ? "" : "s"} found
                  </p>
                  <div className="space-y-3">
                    {customerResults.orders.map((order) => (
                      <CustomerOrderCard key={order.orderNumber} order={order} />
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
