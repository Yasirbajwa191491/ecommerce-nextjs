"use client";

import Link from "next/link";
import {
  Heart,
  LogIn,
  Package,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCartContext } from "@/context/cart_context";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function HeaderActions() {
  const { total_item } = useCartContext();

  return (
    <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="hidden size-10 rounded-full text-muted-foreground hover:text-foreground sm:inline-flex"
        aria-label="Wishlist"
        asChild
      >
        <Link href="/products">
          <Heart className="size-[1.125rem]" />
        </Link>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="size-10 rounded-full text-muted-foreground transition-colors duration-200 hover:text-foreground"
              aria-label="Account menu"
            />
          }
        >
          <UserRound className="size-[1.125rem]" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium text-foreground">My account</p>
              <p className="text-xs text-muted-foreground">
                Sign in to track orders
              </p>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            render={<Link href="/home" className="w-full cursor-pointer" />}
          >
            <UserRound className="size-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem
            render={<Link href="/cart" className="w-full cursor-pointer" />}
          >
            <Package className="size-4" />
            Orders
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            render={<Link href="/contact" className="w-full cursor-pointer" />}
          >
            Help &amp; support
          </DropdownMenuItem>
          <DropdownMenuItem
            render={<Link href="/home" className="w-full cursor-pointer" />}
          >
            <LogIn className="size-4" />
            Sign in
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Link
        href="/cart"
        aria-label={`Shopping cart, ${total_item} items`}
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "relative size-10 rounded-full text-muted-foreground transition-colors duration-200 hover:text-foreground"
        )}
      >
        <ShoppingBag className="size-[1.125rem]" />
        <Badge
          variant="default"
          className="absolute -top-0.5 -right-0.5 flex size-5 min-w-5 items-center justify-center rounded-full border-2 border-background p-0 text-[0.625rem] font-semibold tabular-nums"
        >
          {total_item > 99 ? "99+" : total_item}
        </Badge>
      </Link>
    </div>
  );
}
