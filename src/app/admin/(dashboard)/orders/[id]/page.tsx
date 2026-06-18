"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import Image from "next/image";
import { api } from "../../../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../../../convex/_generated/dataModel";
import type { TransactionLog } from "@/types/order";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  OrderStatusBadge,
  PaymentMethodBadge,
  PaymentStatusBadge,
} from "@/components/admin/order-status-badge";
import { DeleteConfirmDialog } from "@/components/admin/delete-confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrencyAmount } from "@/lib/currencies";
import { normalizeOrderDiscountTotal, normalizeOrderItemLike } from "@/lib/order-item-display";
import { toastError, toastSuccess } from "@/lib/app-toast";
import type { OrderStatus, PaymentStatus } from "@/types/order";
import { ArrowLeft, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ReviewCollectionPanel } from "@/components/admin/review-collection-panel";
import { OrderDeliverySummary } from "@/components/orders/order-delivery-summary";

const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "processing",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

const COD_PAYMENT_STATUSES: PaymentStatus[] = [
  "pending",
  "paid",
  "failed",
  "refunded",
];

function formatDateTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function formatEventLabel(event: string) {
  return event
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function AdminOrderDetailPage() {
  const params = useParams();
  const orderId = params.id as Id<"orders">;

  const detail = useQuery(api.adminOrders.getDetail, { orderId });
  const backfillTransactionLogs = useMutation(
    api.adminOrders.backfillTransactionLogs
  );
  const backfillAttemptedRef = useRef(false);
  const updateOrderStatus = useMutation(api.adminOrders.updateOrderStatus);
  const updateCodPaymentStatus = useMutation(
    api.adminOrders.updateCodPaymentStatus
  );
  const sendReviewInvitation = useMutation(api.adminOrders.sendReviewInvitation);

  const [pendingOrderStatus, setPendingOrderStatus] = useState<OrderStatus | "">("");
  const [pendingPaymentStatus, setPendingPaymentStatus] = useState<
    PaymentStatus | ""
  >("");
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
  const [isSendingInvitation, setIsSendingInvitation] = useState(false);

  const order = detail?.order;
  const items = detail?.items ?? [];
  const promotions = detail?.promotions ?? [];
  const logs = detail?.transactionLogs ?? [];

  const reviewStatus = useQuery(
    api.productReviews.getOrderReviewStatus,
    order?.status === "delivered"
      ? {
          orderNumber: order.orderNumber,
          customerEmail: order.customerEmail,
        }
      : "skip"
  );
  const discountTotal = order
    ? normalizeOrderDiscountTotal(order, items)
    : 0;

  useEffect(() => {
    if (!detail?.order || backfillAttemptedRef.current) return;
    if (detail.transactionLogs.length > 0) return;

    backfillAttemptedRef.current = true;
    void backfillTransactionLogs({ orderId });
  }, [detail, orderId, backfillTransactionLogs]);

  const selectedOrderStatus = pendingOrderStatus || order?.status || "pending";
  const selectedPaymentStatus =
    pendingPaymentStatus || order?.paymentStatus || "pending";

  const statusDialogDescription = useMemo(() => {
    if (!order || !pendingOrderStatus) return "";
    return `Change order status from "${order.status}" to "${pendingOrderStatus}"? This will be recorded in the transaction log.`;
  }, [order, pendingOrderStatus]);

  const paymentDialogDescription = useMemo(() => {
    if (!order || !pendingPaymentStatus) return "";
    return `Change payment status from "${order.paymentStatus}" to "${pendingPaymentStatus}"? This will be recorded in the transaction log.`;
  }, [order, pendingPaymentStatus]);

  const handleOrderStatusChange = (value: string) => {
    if (!order || value === order.status) return;
    setPendingOrderStatus(value as OrderStatus);
    setStatusDialogOpen(true);
  };

  const handlePaymentStatusChange = (value: string) => {
    if (!order || value === order.paymentStatus) return;
    setPendingPaymentStatus(value as PaymentStatus);
    setPaymentDialogOpen(true);
  };

  const confirmOrderStatusUpdate = async () => {
    if (!pendingOrderStatus) return;
    setIsUpdatingStatus(true);
    try {
      await updateOrderStatus({ orderId, status: pendingOrderStatus });
      toastSuccess("Order status updated");
      setStatusDialogOpen(false);
      setPendingOrderStatus("");
    } catch (error) {
      toastError(
        error instanceof Error ? error.message : "Failed to update order status"
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSendReviewInvitation = async () => {
    setIsSendingInvitation(true);
    try {
      await sendReviewInvitation({ orderId });
      toastSuccess("Review invitation email queued");
    } catch (error) {
      toastError(error, {
        title: "Couldn't send invitation",
        fallback: "Failed to send review invitation email.",
      });
    } finally {
      setIsSendingInvitation(false);
    }
  };

  const confirmPaymentStatusUpdate = async () => {
    if (!pendingPaymentStatus) return;
    setIsUpdatingPayment(true);
    try {
      await updateCodPaymentStatus({
        orderId,
        paymentStatus: pendingPaymentStatus,
      });
      toastSuccess("Payment status updated");
      setPaymentDialogOpen(false);
      setPendingPaymentStatus("");
    } catch (error) {
      toastError(
        error instanceof Error ? error.message : "Failed to update payment status"
      );
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  if (detail === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" render={<Link href="/admin/orders" />}>
          <ArrowLeft className="size-4" />
          Back to orders
        </Button>
        <p className="text-muted-foreground">Order not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <AdminPageHeader
          title={`Order ${order.orderNumber}`}
          description="View and manage order details."
        />
        <Button variant="outline" render={<Link href="/admin/orders" />}>
          <ArrowLeft className="size-4" />
          Back to orders
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Order number</span>
              <span className="font-medium">{order.orderNumber}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Order date</span>
              <span>{formatDateTime(order.createdAt)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Order status</span>
              <OrderStatusBadge status={order.status} />
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Payment method</span>
              <PaymentMethodBadge method={order.paymentMethod} />
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Payment status</span>
              <PaymentStatusBadge status={order.paymentStatus} />
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrencyAmount(order.subtotal, order.currency)}</span>
            </div>
            {discountTotal > 0 ? (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Discount</span>
                <span className="text-rose-600">
                  −{formatCurrencyAmount(discountTotal, order.currency)}
                </span>
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Tax</span>
              <span>{formatCurrencyAmount(order.tax, order.currency)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Shipping</span>
              <span>{formatCurrencyAmount(order.shipping, order.currency)}</span>
            </div>
            {(order.deliveryCharge ?? 0) > 0 ? (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">
                  {order.deliveryMethodLabel ?? "Delivery"}
                </span>
                <span>
                  {formatCurrencyAmount(order.deliveryCharge ?? 0, order.currency)}
                </span>
              </div>
            ) : null}
            <div className="flex justify-between gap-4 border-t pt-3 font-semibold">
              <span>Grand total</span>
              <span>{formatCurrencyAmount(order.total, order.currency)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delivery</CardTitle>
          </CardHeader>
          <CardContent>
            <OrderDeliverySummary
              deliveryMethod={order.deliveryMethod}
              deliveryMethodLabel={order.deliveryMethodLabel}
              deliveryEstimate={order.deliveryEstimate}
              deliveryCharge={order.deliveryCharge}
              shipping={order.shipping}
              currency={order.currency}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Full name</p>
              <p className="font-medium">{order.customerName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Email</p>
              <p>{order.customerEmail}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Phone</p>
              <p>{order.customerPhone}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Address</p>
              <p className="whitespace-pre-wrap">{order.customerAddress}</p>
            </div>
            {order.customerNotes ? (
              <div>
                <p className="text-muted-foreground">Notes</p>
                <p className="whitespace-pre-wrap">{order.customerNotes}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ordered Products</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Original</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Final</TableHead>
                <TableHead>Shipping</TableHead>
                <TableHead>Warranty</TableHead>
                <TableHead>Line total</TableHead>
                {order.status === "delivered" ? (
                  <TableHead>Review</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item: Doc<"orderItems">) => {
                const normalized = normalizeOrderItemLike(item);
                const itemReview = reviewStatus?.find(
                  (r: { productId: string; status: string }) =>
                    r.productId === item.productId
                );
                return (
                <TableRow key={item._id}>
                  <TableCell>
                    {item.imageUrl ? (
                      <div className="relative size-10 overflow-hidden rounded-md border">
                        <Image
                          src={item.imageUrl}
                          alt={item.productName}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.productName}
                      {item.isPromotionGift ? (
                        <Badge variant="secondary" className="text-[10px]">
                          Promotion gift
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>{item.sku || "—"}</TableCell>
                  <TableCell>{item.color}</TableCell>
                  <TableCell>{item.size || "—"}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>
                    {formatCurrencyAmount(
                      normalized.originalUnitPrice,
                      order.currency
                    )}
                  </TableCell>
                  <TableCell>
                    {normalized.discountPercent > 0
                      ? `${normalized.discountPercent}% (−${formatCurrencyAmount(normalized.lineDiscountTotal, order.currency)})`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {formatCurrencyAmount(normalized.finalUnitPrice, order.currency)}
                  </TableCell>
                  <TableCell>
                    {normalized.lineShippingTotal > 0
                      ? formatCurrencyAmount(
                          normalized.lineShippingTotal,
                          order.currency
                        )
                      : "—"}
                  </TableCell>
                  <TableCell className="max-w-[12rem] text-xs text-muted-foreground">
                    {item.warrantySummary ?? "—"}
                  </TableCell>
                  <TableCell>
                    {formatCurrencyAmount(item.lineTotal, order.currency)}
                  </TableCell>
                  {order.status === "delivered" ? (
                    <TableCell>
                      {itemReview?.status === "approved" ? (
                        <Badge className="bg-emerald-600">Approved</Badge>
                      ) : itemReview?.status === "pending" ? (
                        <Badge variant="outline">Pending</Badge>
                      ) : itemReview?.status === "eligible" ? (
                        <Badge variant="secondary">Not reviewed</Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  ) : null}
                </TableRow>
              );
              })}
            </TableBody>
          </Table>
          {promotions.length > 0 ? (
            <div className="mt-6 space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                Promotions applied
              </p>
              {promotions.map((promo) => (
                <div key={promo._id} className="text-sm">
                  <span className="font-medium">{promo.promotionName}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {promo.freeQuantity} free · saved{" "}
                    {formatCurrencyAmount(promo.savingsAmount, order.currency)}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
          <div className="mt-4 flex flex-col items-end gap-1 text-sm">
            <div className="flex w-full max-w-xs justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrencyAmount(order.subtotal, order.currency)}</span>
            </div>
            {discountTotal > 0 ? (
              <div className="flex w-full max-w-xs justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span className="text-rose-600">
                  −{formatCurrencyAmount(discountTotal, order.currency)}
                </span>
              </div>
            ) : null}
            <div className="flex w-full max-w-xs justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>{formatCurrencyAmount(order.tax, order.currency)}</span>
            </div>
            <div className="flex w-full max-w-xs justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span>{formatCurrencyAmount(order.shipping, order.currency)}</span>
            </div>
            {(order.deliveryCharge ?? 0) > 0 ? (
              <div className="flex w-full max-w-xs justify-between">
                <span className="text-muted-foreground">
                  {order.deliveryMethodLabel ?? "Delivery"}
                </span>
                <span>
                  {formatCurrencyAmount(order.deliveryCharge ?? 0, order.currency)}
                </span>
              </div>
            ) : null}
            <div className="flex w-full max-w-xs justify-between font-semibold">
              <span>Grand total</span>
              <span>{formatCurrencyAmount(order.total, order.currency)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Payment Information</CardTitle>
            <CardDescription>
              {order.paymentMethod === "stripe"
                ? "Stripe payment details are read-only and updated via webhooks."
                : "Cash on delivery payment can be updated manually."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Payment method</span>
              <PaymentMethodBadge method={order.paymentMethod} />
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Payment status</span>
              {order.paymentMethod === "cod" ? (
                <Select
                  value={selectedPaymentStatus}
                  onValueChange={(value) => {
                    if (value) handlePaymentStatusChange(value);
                  }}
                >
                  <SelectTrigger className="h-8 w-[9rem]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COD_PAYMENT_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <PaymentStatusBadge status={order.paymentStatus} />
              )}
            </div>
            {order.paymentMethod === "stripe" ? (
              <>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Stripe session ID</span>
                  <span className="max-w-[14rem] truncate font-mono text-xs">
                    {order.stripeSessionId || "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Payment intent ID</span>
                  <span className="max-w-[14rem] truncate font-mono text-xs">
                    {order.stripePaymentIntentId || "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Transaction ID</span>
                  <span className="max-w-[14rem] truncate font-mono text-xs">
                    {order.stripeTransactionId || "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Amount paid</span>
                  <span>{formatCurrencyAmount(order.total, order.currency)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Payment date</span>
                  <span>
                    {order.paidAt ? formatDateTime(order.paidAt) : "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Currency</span>
                  <span>{order.currency}</span>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order Status Management</CardTitle>
            <CardDescription>
              Update fulfillment status. Changes are logged for audit.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="order-status-select">Order status</Label>
              <Select
                value={selectedOrderStatus}
                onValueChange={(value) => {
                  if (value) handleOrderStatusChange(value);
                }}
              >
                <SelectTrigger id="order-status-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              Current status: <OrderStatusBadge status={order.status} />
            </p>
            {order.status === "delivered" ? (
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start gap-2"
                disabled={isSendingInvitation}
                onClick={() => void handleSendReviewInvitation()}
              >
                <Mail className="size-4" />
                {isSendingInvitation
                  ? "Sending invitation…"
                  : "Send review invitation email"}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {order ? (
        <ReviewCollectionPanel
          orderId={orderId}
          orderNumber={order.orderNumber}
          orderStatus={order.status}
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Transaction Logs</CardTitle>
          <CardDescription>Immutable audit history for this order.</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transaction logs yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Actor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log: TransactionLog) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {formatEventLabel(log.event)}
                    </TableCell>
                    <TableCell>{log.description}</TableCell>
                    <TableCell>{formatDateTime(log.createdAt)}</TableCell>
                    <TableCell>
                      {log.actorName || log.actorType}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        title="Update order status?"
        description={statusDialogDescription}
        confirmLabel="Confirm update"
        loading={isUpdatingStatus}
        loadingLabel="Updating..."
        confirmVariant="default"
        onConfirm={confirmOrderStatusUpdate}
      />

      <DeleteConfirmDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        title="Update payment status?"
        description={paymentDialogDescription}
        confirmLabel="Confirm update"
        loading={isUpdatingPayment}
        loadingLabel="Updating..."
        confirmVariant="default"
        onConfirm={confirmPaymentStatusUpdate}
      />
    </div>
  );
}
