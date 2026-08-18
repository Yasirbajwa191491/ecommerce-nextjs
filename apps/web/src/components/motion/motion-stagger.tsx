"use client";

import { createContext, useContext, type ReactNode } from "react";
import { m, useReducedMotion } from "framer-motion";
import {
  revealVariants,
  staggerContainer,
  staggerItem,
  staggerItemScale,
  type RevealVariant,
  withReducedMotion,
} from "@/lib/motion";
import { viewportReveal } from "@/lib/motion/transitions";
import { cn } from "@/lib/utils";

const StaggerVisibleContext = createContext(false);

type MotionStaggerGroupProps = {
  children: ReactNode;
  className?: string;
  staggerMs?: number;
  delayChildren?: number;
};

export function MotionStaggerGroup({
  children,
  className,
  staggerMs = 85,
  delayChildren = 0,
}: MotionStaggerGroupProps) {
  const reduceMotion = useReducedMotion();

  return (
    <StaggerVisibleContext.Provider value={!reduceMotion}>
      <m.div
        className={className}
        initial="hidden"
        whileInView="visible"
        viewport={viewportReveal}
        variants={withReducedMotion(
          staggerContainer(staggerMs / 1000, delayChildren / 1000),
          reduceMotion
        )}
      >
        {children}
      </m.div>
    </StaggerVisibleContext.Provider>
  );
}

type MotionStaggerItemProps = {
  children: ReactNode;
  index: number;
  className?: string;
  variant?: RevealVariant;
  staggerMs?: number;
};

export function MotionStaggerItem({
  children,
  index,
  className,
  variant = "up",
  staggerMs = 85,
}: MotionStaggerItemProps) {
  const reduceMotion = useReducedMotion();
  const isParentVisible = useContext(StaggerVisibleContext);

  const itemVariants =
    variant === "scale"
      ? withReducedMotion(staggerItemScale, reduceMotion)
      : withReducedMotion(staggerItem, reduceMotion);

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  if (!isParentVisible) {
    const hiddenVariant = revealVariants[variant].hidden;
    const style =
      typeof hiddenVariant === "object" && hiddenVariant !== null
        ? {
            opacity: "opacity" in hiddenVariant ? hiddenVariant.opacity : 0,
            transform:
              "y" in hiddenVariant && hiddenVariant.y
                ? `translateY(${hiddenVariant.y}px)`
                : "scale" in hiddenVariant && hiddenVariant.scale
                  ? `scale(${hiddenVariant.scale})`
                  : undefined,
          }
        : undefined;

    return (
      <div className={className} style={style as React.CSSProperties}>
        {children}
      </div>
    );
  }

  return (
    <m.div
      className={cn(className)}
      variants={itemVariants}
      custom={index}
      transition={{ delay: (index * staggerMs) / 1000 }}
    >
      {children}
    </m.div>
  );
}
