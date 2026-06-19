"use client";

import { m, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { pageTransition, withReducedMotion } from "@/lib/motion";

type ShopPageTransitionProps = {
  children: ReactNode;
};

export function ShopPageTransition({ children }: ShopPageTransitionProps) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <>{children}</>;
  }

  return (
    <m.div
      key={pathname}
      initial="hidden"
      animate="visible"
      variants={withReducedMotion(pageTransition, reduceMotion)}
      style={{ willChange: "opacity, transform" }}
    >
      {children}
    </m.div>
  );
}
