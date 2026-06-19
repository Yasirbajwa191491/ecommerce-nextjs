"use client";

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  HEADER_STORE_NAME_DESKTOP,
  HEADER_STORE_NAME_MOBILE,
} from "@/lib/typography";
import { StoreLogoLink } from "@/components/layout/store-logo-link";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";
import { HeaderNav } from "./header-nav";
import { HeaderSearch, HeaderSearchFallback } from "./header-search";
import { HeaderCart } from "./header-actions";
import { HeaderMobileMenu } from "./header-mobile-menu";

const HEADER_GUTTER = "clamp(1.25rem, 4vw, 4.8rem)";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchReady, setSearchReady] = useState(false);
  const isLg = useMediaQuery("(min-width: 1024px)");

  useEffect(() => {
    setSearchReady(true);
  }, []);

  const mobileSearch = !searchReady ? (
    <HeaderSearchFallback className="w-full max-w-none" />
  ) : !isLg ? (
    <HeaderSearch className="w-full max-w-none" />
  ) : null;

  const desktopSearch = searchReady && isLg ? (
    <HeaderSearch className="w-full max-w-2xl xl:max-w-3xl" />
  ) : null;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const gutterStyle = {
    paddingLeft: HEADER_GUTTER,
    paddingRight: HEADER_GUTTER,
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b border-border/40 bg-white transition-shadow duration-300",
        scrolled && "shadow-[0_2px_16px_rgba(0,0,0,0.06)]"
      )}
    >
      {/* Phone + tablet: logo/actions row, then full-width search (hidden on lg) */}
      <div
        className="mx-auto w-full max-w-[1600px] pb-3 pt-3 sm:pb-3.5 sm:pt-3.5 md:pt-4 lg:hidden"
        style={gutterStyle}
      >
        <div className="flex items-center justify-between gap-3">
          <StoreLogoLink
            onNavigate={() => setMobileOpen(false)}
            className={HEADER_STORE_NAME_MOBILE}
          />

          <div className="flex shrink-0 items-center gap-2.5 sm:gap-4">
            <HeaderCart compact />
            <Button
              variant="outline"
              size="icon"
              className="size-10 shrink-0 rounded-full border-border/80 bg-background shadow-sm"
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="size-5" />
            </Button>
          </div>
        </div>

        <div className="mt-2.5 w-full sm:mt-3">{mobileSearch}</div>
      </div>

      {/* Laptop / desktop only (lg / 1024px+) */}
      <div
        className="mx-auto hidden h-20 w-full max-w-[1600px] items-center gap-8 lg:flex"
        style={gutterStyle}
      >
        <StoreLogoLink className={HEADER_STORE_NAME_DESKTOP} />

        <div className="flex min-w-0 flex-1 justify-center px-4 xl:px-8">
          {desktopSearch}
        </div>

        <div className="flex shrink-0 items-center gap-10">
          <HeaderNav />
          <HeaderCart />
        </div>
      </div>

      <HeaderMobileMenu open={mobileOpen} onOpenChange={setMobileOpen} />
    </header>
  );
}
