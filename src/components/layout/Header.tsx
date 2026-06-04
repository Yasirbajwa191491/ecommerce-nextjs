"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { STORE_NAME } from "@/lib/site";
import { Button } from "@/components/ui/button";
import { HeaderNav } from "./header-nav";
import { HeaderSearch } from "./header-search";
import { HeaderCart } from "./header-actions";
import { HeaderMobileMenu } from "./header-mobile-menu";

const HEADER_GUTTER = "clamp(1.25rem, 4vw, 4.8rem)";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
      {/* Phone + tablet only (hidden on lg / 1024px+) */}
      <div
        className="mx-auto grid h-[4.25rem] w-full max-w-[1600px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 max-lg:grid sm:gap-x-4 md:h-[4.5rem] md:gap-x-6 lg:!hidden"
        style={gutterStyle}
      >
        <Link
          href="/home"
          className="max-w-[7.5rem] justify-self-start truncate text-sm font-bold tracking-tight text-[#6254f3] sm:max-w-none sm:text-base md:text-lg"
        >
          {STORE_NAME}
        </Link>

        <div className="flex min-w-0 w-full justify-center px-1 sm:px-2 md:max-w-xl">
          <HeaderSearch className="w-full max-w-none" />
        </div>

        <div className="flex items-center justify-self-end gap-2.5 sm:gap-4">
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

      {/* Laptop / desktop only (lg / 1024px+) */}
      <div
        className="mx-auto hidden h-20 w-full max-w-[1600px] items-center gap-8 lg:flex"
        style={gutterStyle}
      >
        <Link
          href="/home"
          className="shrink-0 text-xl font-bold tracking-tight text-[#6254f3] transition-opacity duration-200 hover:opacity-90"
        >
          {STORE_NAME}
        </Link>

        <div className="flex min-w-0 flex-1 justify-center px-6">
          <HeaderSearch className="w-full max-w-xl" />
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
