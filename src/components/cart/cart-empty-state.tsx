"use client";

import Link from "next/link";
import { ShoppingBag, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export function CartEmptyState() {
  return (
    <Empty className="mx-auto max-w-xl rounded-2xl border border-dashed border-border/80 bg-card py-16 shadow-sm">
      <EmptyHeader>
        <EmptyMedia
          variant="icon"
          className="size-14 rounded-2xl bg-[#6254f3]/10 text-[#6254f3]"
        >
          <ShoppingBag className="size-7" />
        </EmptyMedia>
        <EmptyTitle className="text-xl font-bold">Your cart is empty</EmptyTitle>
        <EmptyDescription className="text-base">
          Discover curated products and add your favorites. Your selections
          will appear here when you are ready to checkout.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button
          render={<Link href="/products" />}
          size="lg"
          className="h-12 gap-2 rounded-full bg-[#6254f3] px-8 text-base font-semibold !text-white shadow-md shadow-[#6254f3]/25 hover:bg-[#5548e0] hover:!text-white [&_svg]:!text-white"
        >
          <Sparkles className="size-4" />
          Start shopping
        </Button>
      </EmptyContent>
    </Empty>
  );
}
