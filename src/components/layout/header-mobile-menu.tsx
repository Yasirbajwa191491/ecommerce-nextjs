"use client";

import Link from "next/link";
import { HeaderNav } from "./header-nav";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCartContext } from "@/context/cart_context";
import { ShoppingBag, X } from "lucide-react";

type HeaderMobileMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function HeaderMobileMenu({ open, onOpenChange }: HeaderMobileMenuProps) {
  const { total_item } = useCartContext();

  const close = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex h-dvh max-h-dvh w-[min(100vw-1rem,20rem)] max-w-none flex-col gap-0 overflow-hidden rounded-none border-l border-border/60 bg-white p-0 shadow-xl inset-y-0 sm:max-w-none sm:w-[22.5rem] md:w-[24rem]"
      >
        {/* Drawer header — spacing via globals.css [data-drawer-*] (Tailwind px/py were reset by GlobalStyle *) */}
        <div
          data-drawer-header
          className="shrink-0 border-b border-border/60"
        >
          <div data-drawer-header-row>
            <SheetTitle className="m-0 shrink-0 p-0 text-xl font-bold leading-none tracking-tight text-foreground">
              Menu
            </SheetTitle>
            <SheetClose
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 shrink-0 rounded-full text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  aria-label="Close menu"
                />
              }
            >
              <X className="size-5" />
            </SheetClose>
          </div>
        </div>

        {/* Nav links only — search lives in the main header */}
        <div
          data-drawer-body
          className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain"
        >
          <HeaderNav variant="drawer" orientation="vertical" onNavigate={close} />
        </div>

        {/* Footer */}
        <div
          data-drawer-footer
          className="shrink-0 border-t border-border/60 bg-muted/20"
        >
          <Button
            render={<Link href="/cart" onClick={close} />}
            className="h-12 w-full gap-2.5 rounded-full bg-[#6254f3] text-sm font-semibold text-white shadow-sm hover:bg-[#6254f3]/90"
          >
            <ShoppingBag className="size-4 shrink-0" />
            View cart ({total_item})
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
