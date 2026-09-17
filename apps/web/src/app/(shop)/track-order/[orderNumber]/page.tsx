"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useAction } from "convex/react";
import { OrderDeliveredReviews } from "@/components/reviews/order-delivered-reviews";
import { api } from "@convex/_generated/api";
import {
  PublicOrderTrackingPanel,
  type PublicOrderTrackingOrder,
} from "@/components/orders/public-order-tracking-panel";
import { Button } from "@/components/ui/button";
import { ShopCancelOrder } from "@/components/orders/shop-cancel-order";
import { CONTENT_SECTION_PADDING_Y, PAGE_GUTTER } from "@/lib/layout-constants";
import { SHOP_BODY, SHOP_PAGE_TITLE } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { ArrowLeft, Loader2 } from "lucide-react";

const PRIMARY_BUTTON_CLASS =
  "h-11 gap-2 rounded-full bg-[#6254f3] px-8 text-sm font-semibold !text-white shadow-md shadow-[#6254f3]/25 transition-all hover:bg-[#5548e0] hover:!text-white hover:shadow-lg active:scale-[0.98] [&_svg]:!text-white";

function TrackOrderDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orderNumber = decodeURIComponent(params.orderNumber as string);
  const highlightProductId = searchParams.get("review") ?? undefined;
  const customerEmail = searchParams.get("email") ?? undefined;
  const accessToken = searchParams.get("accessToken") ?? undefined;

  const getPublicOrderDetail = useAction(api.orderTracking.getPublicOrderDetail);

  const [result, setResult] = useState<
    Awaited<ReturnType<typeof getPublicOrderDetail>> | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    getPublicOrderDetail({ orderNumber, customerEmail, accessToken })
      .then((response) => {
        if (!cancelled) setResult(response);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [getPublicOrderDetail, orderNumber, customerEmail, accessToken, refreshToken]);

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#6254f3]" />
      </div>
    );
  }

  if (!result?.found) {
    return (
      <div
        className={cn("mx-auto max-w-lg text-center", CONTENT_SECTION_PADDING_Y)}
        style={PAGE_GUTTER}
      >
        <h1 className={SHOP_PAGE_TITLE}>Order not found</h1>
        <p className={cn("mt-2", SHOP_BODY)}>
          {result?.message ??
            "We couldn't find an order with that number. Please check and try again."}
        </p>
        <Button
          render={<Link href="/track-order" />}
          className={`mt-6 ${PRIMARY_BUTTON_CLASS}`}
        >
          Back to tracking
        </Button>
      </div>
    );
  }

  const order = result.order as PublicOrderTrackingOrder & {
    verified?: boolean;
    accessToken?: string;
  };

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/track-order/${encodeURIComponent(order.orderNumber)}`
      : undefined;

  return (
    <div className={cn("space-y-6", CONTENT_SECTION_PADDING_Y)} style={PAGE_GUTTER}>
      <Button
        variant="ghost"
        render={<Link href="/track-order" />}
        className="rounded-full px-0 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to tracking
      </Button>

      <PublicOrderTrackingPanel order={order} shareUrl={shareUrl} />

      {order.verified ? (
        <div className="mx-auto max-w-4xl">
          <ShopCancelOrder
            orderNumber={order.orderNumber}
            customerEmail={order.customerEmail}
            accessToken={order.accessToken ?? accessToken}
            onCancelled={() => setRefreshToken((current) => current + 1)}
          />
        </div>
      ) : null}

      {order.status === "delivered" && order.verified ? (
        <div className="mx-auto max-w-4xl">
          <OrderDeliveredReviews
            orderNumber={order.orderNumber}
            customerEmail={order.customerEmail}
            accessToken={order.accessToken}
            items={order.items}
            highlightProductId={highlightProductId}
          />
        </div>
      ) : null}
    </div>
  );
}

export default function TrackOrderDetailPage() {
  return (
    <div className="min-h-[60vh] bg-gradient-to-b from-muted/40 via-background to-background">
      <Suspense
        fallback={
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="size-8 animate-spin text-[#6254f3]" />
          </div>
        }
      >
        <TrackOrderDetailContent />
      </Suspense>
    </div>
  );
}
