"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { STORE_NAME } from "@/lib/site";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { HeaderNav } from "./header-nav";
import { HeaderSearch } from "./header-search";
import { HeaderActions } from "./header-actions";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur-md transition-shadow duration-300",
        scrolled && "shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08)]"
      )}
    >
      <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
        {/* Top row: logo, search, actions */}
        <div className="flex h-16 items-center gap-3 sm:gap-4 lg:h-[4.25rem]">
          <Link
            href="/home"
            className="group shrink-0 transition-opacity duration-200 hover:opacity-90"
          >
            <span className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              {STORE_NAME}
            </span>
          </Link>

          <div className="hidden min-w-0 flex-1 justify-center px-2 sm:flex sm:px-4 lg:px-8">
            <HeaderSearch />
          </div>

          <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
            <HeaderActions />
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-10 rounded-full sm:hidden"
                    aria-label="Open menu"
                  />
                }
              >
                <Menu className="size-5" />
              </SheetTrigger>
              <SheetContent side="right" className="w-full max-w-sm gap-6 p-0">
                <SheetHeader className="border-b px-6 py-5 text-left">
                  <SheetTitle className="text-lg font-semibold tracking-tight">
                    {STORE_NAME}
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-6 px-6 pb-8">
                  <HeaderSearch />
                  <HeaderNav
                    orientation="vertical"
                    linkClassName="px-0 py-2.5 text-base after:hidden hover:bg-transparent"
                    onNavigate={() => setMobileOpen(false)}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Desktop nav row */}
        <div className="hidden border-t border-border/40 sm:block">
          <div className="flex h-11 items-center justify-center">
            <HeaderNav />
          </div>
        </div>
      </div>
    </header>
  );
}
