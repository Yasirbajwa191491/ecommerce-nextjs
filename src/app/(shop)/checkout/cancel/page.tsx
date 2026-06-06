"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function CheckoutCancelContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("orderNumber");

  return (
    <div className="min-h-[60vh] bg-gradient-to-b from-muted/40 via-background to-background">
      <section className="mx-auto w-full max-w-lg px-4 py-10 sm:px-8 sm:py-14">
        <Card className="overflow-hidden rounded-2xl border-border/60 shadow-lg">
          <CardHeader className="space-y-4 border-b border-border/60 bg-muted/20 px-6 py-8 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
              <AlertCircle className="size-8" />
            </div>
            <div>
              <CardTitle className="text-2xl">Payment cancelled</CardTitle>
              <CardDescription className="mt-2 text-base">
                Your payment was not completed. No charges were made.
                {orderNumber ? (
                  <>
                    {" "}
                    Order reference:{" "}
                    <span className="font-medium text-foreground">{orderNumber}</span>
                  </>
                ) : null}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 px-6 py-8">
            <Button
              render={<Link href="/checkout" />}
              className="h-11 gap-2 rounded-full bg-[#6254f3] hover:bg-[#5548e0]"
            >
              <RefreshCw className="size-4" />
              Try checkout again
            </Button>
            <Button
              render={<Link href="/cart" />}
              variant="outline"
              className="h-11 gap-2 rounded-full"
            >
              <ArrowLeft className="size-4" />
              Return to cart
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

export default function CheckoutCancelPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="size-8 animate-spin text-[#6254f3]" />
        </div>
      }
    >
      <CheckoutCancelContent />
    </Suspense>
  );
}
