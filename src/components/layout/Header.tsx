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
import { Separator } from "@/components/ui/separator";
import { HeaderNav } from "./header-nav";
import { HeaderSearch } from "./header-search";
import { HeaderCart } from "./header-actions";

const HEADER_GUTTER = "clamp(1.5rem, 4vw, 4.8rem)";

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
        "sticky top-0 z-50 w-full border-b border-border/40 bg-white transition-shadow duration-300",
        scrolled && "shadow-[0_2px_16px_rgba(0,0,0,0.06)]"
      )}
    >
      <div
        className="mx-auto flex h-[4.5rem] w-full max-w-[1600px] items-center gap-6 sm:h-20 sm:gap-8"
        style={{
          paddingLeft: HEADER_GUTTER,
          paddingRight: HEADER_GUTTER,
        }}
      >
        <Link
          href="/home"
          className="shrink-0 text-lg font-bold tracking-tight text-[#6254f3] transition-opacity duration-200 hover:opacity-90 sm:text-xl"
        >
          {STORE_NAME}
        </Link>

        <div className="hidden min-w-0 flex-1 justify-center lg:flex">
          <HeaderSearch />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-6 sm:gap-8 md:gap-10">
          <div className="hidden md:flex md:items-center">
            <HeaderNav />
          </div>
          <HeaderCart />
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 md:hidden"
                  aria-label="Open menu"
                />
              }
            >
              <Menu className="size-6" />
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-xs gap-0 p-0">
              <SheetHeader className="border-b px-6 py-5 text-left">
                <SheetTitle className="text-lg font-bold text-[#6254f3]">
                  {STORE_NAME}
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-6 px-6 py-6">
                <HeaderSearch />
                <Separator />
                <HeaderNav
                  orientation="vertical"
                  onNavigate={() => setMobileOpen(false)}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
