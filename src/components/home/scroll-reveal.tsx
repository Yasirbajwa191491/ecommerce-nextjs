"use client";

import {
  createContext,
  useContext,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { cn } from "@/lib/utils";

type RevealVariant = "up" | "scale" | "fade" | "left" | "right";

const variantClass: Record<RevealVariant, string> = {
  up: "home-reveal-up",
  scale: "home-reveal-scale",
  fade: "home-reveal-fade",
  left: "home-reveal-left",
  right: "home-reveal-right",
};

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  variant?: RevealVariant;
  delay?: number;
};

export function ScrollReveal({
  children,
  className,
  variant = "up",
  delay = 0,
}: ScrollRevealProps) {
  const { ref, isVisible } = useScrollReveal();
  const style =
    delay > 0 ? ({ transitionDelay: `${delay}ms` } as CSSProperties) : undefined;

  return (
    <div
      ref={ref}
      className={cn(
        "home-reveal",
        variantClass[variant],
        isVisible && "home-reveal-visible",
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
}

const StaggerVisibleContext = createContext(false);

type StaggerGroupProps = {
  children: ReactNode;
  className?: string;
};

export function StaggerGroup({ children, className }: StaggerGroupProps) {
  const { ref, isVisible } = useScrollReveal();

  return (
    <StaggerVisibleContext.Provider value={isVisible}>
      <div ref={ref} className={className}>
        {children}
      </div>
    </StaggerVisibleContext.Provider>
  );
}

type StaggerItemProps = {
  children: ReactNode;
  index: number;
  className?: string;
  variant?: RevealVariant;
  staggerMs?: number;
};

export function StaggerItem({
  children,
  index,
  className,
  variant = "up",
  staggerMs = 85,
}: StaggerItemProps) {
  const isVisible = useContext(StaggerVisibleContext);

  return (
    <div
      className={cn(
        "home-reveal",
        variantClass[variant],
        isVisible && "home-reveal-visible",
        className
      )}
      style={{ transitionDelay: `${index * staggerMs}ms` }}
    >
      {children}
    </div>
  );
}
