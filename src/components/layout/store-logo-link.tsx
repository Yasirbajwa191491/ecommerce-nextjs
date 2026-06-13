"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HOME_PATH, STORE_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";

type StoreLogoLinkProps = {
  className?: string;
  onNavigate?: () => void;
};

export function StoreLogoLink({ className, onNavigate }: StoreLogoLinkProps) {
  const pathname = usePathname();
  const isHome = pathname === HOME_PATH || pathname === "/";

  const handleClick = () => {
    onNavigate?.();
    if (isHome) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <Link
      href={HOME_PATH}
      onClick={handleClick}
      aria-label={`${STORE_NAME} — go to homepage`}
      className={cn(
        "cursor-pointer font-bold tracking-tight transition-opacity duration-200 hover:opacity-90",
        className ?? "text-[#6254f3]"
      )}
    >
      {STORE_NAME}
    </Link>
  );
}
