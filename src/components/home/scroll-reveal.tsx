"use client";

import { createContext, useContext, type ReactNode } from "react";
import { m, useReducedMotion } from "framer-motion";
import {
  revealVariants,
  staggerContainer,
  staggerItem,
  staggerItemApple,
  staggerItemScale,
  type RevealVariant,
  withReducedMotion,
} from "@/lib/motion";
import { viewportReveal } from "@/lib/motion/transitions";
import { cn } from "@/lib/utils";

type RevealVariantLocal = RevealVariant;

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  variant?: RevealVariantLocal;
  delay?: number;
};

export function ScrollReveal({
  children,
  className,
  variant = "apple",
  delay = 0,
}: ScrollRevealProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <m.div
      className={cn(className)}
      initial="hidden"
      whileInView="visible"
      viewport={viewportReveal}
      variants={revealVariants[variant]}
      transition={delay > 0 ? { delay: delay / 1000 } : undefined}
    >
      {children}
    </m.div>
  );
}

const StaggerVariantContext = createContext<RevealVariantLocal>("apple");

type StaggerGroupProps = {
  children: ReactNode;
  className?: string;
  staggerMs?: number;
};

export function StaggerGroup({
  children,
  className,
  staggerMs = 0.1,
}: StaggerGroupProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <StaggerVariantContext.Provider value="apple">
      <m.div
        className={className}
        initial="hidden"
        whileInView="visible"
        viewport={viewportReveal}
        variants={staggerContainer(staggerMs, 0.06)}
      >
        {children}
      </m.div>
    </StaggerVariantContext.Provider>
  );
}

type StaggerItemProps = {
  children: ReactNode;
  index: number;
  className?: string;
  variant?: RevealVariantLocal;
  staggerMs?: number;
};

export function StaggerItem({
  children,
  index: _index,
  className,
  variant = "apple",
  staggerMs: _staggerMs = 100,
}: StaggerItemProps) {
  const reduceMotion = useReducedMotion();
  const parentVariant = useContext(StaggerVariantContext);
  const resolvedVariant = variant ?? parentVariant;

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const itemVariant =
    resolvedVariant === "scale"
      ? staggerItemScale
      : resolvedVariant === "up" || resolvedVariant === "apple"
        ? staggerItemApple
        : staggerItem;

  return (
    <m.div className={cn(className)} variants={withReducedMotion(itemVariant, false)}>
      {children}
    </m.div>
  );
}
