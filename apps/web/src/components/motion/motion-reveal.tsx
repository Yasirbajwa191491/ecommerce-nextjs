"use client";

import { m, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import {
  revealVariants,
  type RevealVariant,
  withReducedMotion,
} from "@/lib/motion";
import { viewportReveal } from "@/lib/motion/transitions";
import { cn } from "@/lib/utils";

type MotionRevealProps = {
  children: ReactNode;
  className?: string;
  variant?: RevealVariant;
  delay?: number;
  as?: "div" | "section" | "article" | "li";
};

export function MotionReveal({
  children,
  className,
  variant = "up",
  delay = 0,
  as = "div",
}: MotionRevealProps) {
  const reduceMotion = useReducedMotion();
  const Component = m[as];
  const variants = withReducedMotion(revealVariants[variant], reduceMotion);

  return (
    <Component
      className={cn(className)}
      initial="hidden"
      whileInView="visible"
      viewport={viewportReveal}
      variants={variants}
      transition={delay > 0 ? { delay: delay / 1000 } : undefined}
    >
      {children}
    </Component>
  );
}
