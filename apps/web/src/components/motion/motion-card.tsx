"use client";

import { m, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { cardHover, cardTap, fadeUp, withReducedMotion } from "@/lib/motion";
import { viewportReveal } from "@/lib/motion/transitions";
import { cn } from "@/lib/utils";

type MotionCardProps = {
  children: ReactNode;
  className?: string;
  disableEntrance?: boolean;
  disableHover?: boolean;
  as?: "div" | "article" | "li";
};

export function MotionCard({
  children,
  className,
  disableEntrance = false,
  disableHover = false,
  as = "div",
}: MotionCardProps) {
  const reduceMotion = useReducedMotion();
  const Component = m[as];

  return (
    <Component
      className={cn(className)}
      initial={disableEntrance || reduceMotion ? false : "hidden"}
      whileInView={disableEntrance || reduceMotion ? undefined : "visible"}
      viewport={viewportReveal}
      variants={withReducedMotion(fadeUp, reduceMotion)}
      whileHover={disableHover || reduceMotion ? undefined : cardHover}
      whileTap={disableHover || reduceMotion ? undefined : cardTap}
      style={{ willChange: "transform, opacity" }}
    >
      {children}
    </Component>
  );
}

type MotionImageZoomProps = {
  children: ReactNode;
  className?: string;
};

export function MotionImageZoom({ children, className }: MotionImageZoomProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <m.div
      className={cn("overflow-hidden", className)}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{ willChange: "transform" }}
    >
      {children}
    </m.div>
  );
}
