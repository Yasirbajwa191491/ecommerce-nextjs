"use client";

import Link from "next/link";
import { m, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import {
  hoverArrowReveal,
  hoverCaptionLift,
  hoverCardLift,
  hoverImageZoom,
  hoverImageZoomSubtle,
  hoverOrchestrator,
  hoverOverlayShift,
  hoverShadowGlow,
} from "@/lib/motion/image-card-hover";
import { cn } from "@/lib/utils";

type MotionHoverCardProps = {
  children: ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
  withShadow?: boolean;
};

export function MotionHoverCard({
  children,
  className,
  href,
  onClick,
  withShadow = true,
}: MotionHoverCardProps) {
  const reduceMotion = useReducedMotion();

  const surface = (
    <m.div
      className={cn(
        "relative h-full overflow-hidden rounded-2xl border border-border/60 bg-card",
        withShadow && "shadow-sm",
        className
      )}
      initial={reduceMotion ? false : "rest"}
      whileHover={reduceMotion ? undefined : "hover"}
      animate="rest"
      variants={reduceMotion ? undefined : hoverOrchestrator}
    >
      <m.div
        variants={reduceMotion ? undefined : hoverCardLift}
        className="relative h-full"
      >
        {withShadow ? (
          <m.div
            variants={reduceMotion ? undefined : hoverShadowGlow}
            className="relative h-full rounded-2xl"
          >
            {children}
          </m.div>
        ) : (
          children
        )}
      </m.div>
    </m.div>
  );

  if (href) {
    return (
      <Link href={href} onClick={onClick} className="block h-full">
        {surface}
      </Link>
    );
  }

  return surface;
}

type MotionHoverImageProps = {
  children: ReactNode;
  className?: string;
  zoom?: "default" | "subtle";
};

export function MotionHoverImage({
  children,
  className,
  zoom = "default",
}: MotionHoverImageProps) {
  const reduceMotion = useReducedMotion();
  const variants = zoom === "subtle" ? hoverImageZoomSubtle : hoverImageZoom;

  if (reduceMotion) {
    return <div className={cn("overflow-hidden", className)}>{children}</div>;
  }

  return (
    <div className={cn("overflow-hidden", className)}>
      <m.div
        variants={variants}
        className="size-full origin-center will-change-transform"
      >
        {children}
      </m.div>
    </div>
  );
}

export function MotionHoverOverlay({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={cn("pointer-events-none", className)}>{children}</div>;
  }

  return (
    <m.div
      variants={hoverOverlayShift}
      className={cn("pointer-events-none absolute inset-0", className)}
    >
      {children}
    </m.div>
  );
}

export function MotionHoverCaption({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <m.div variants={hoverCaptionLift} className={cn("relative z-10", className)}>
      {children}
    </m.div>
  );
}

export function MotionHoverArrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <span className={className}>{children}</span>;
  }

  return (
    <m.span
      variants={hoverArrowReveal}
      className={cn("pointer-events-none absolute z-10", className)}
    >
      {children}
    </m.span>
  );
}

/** Story / editorial image with slow zoom on hover */
export function MotionHoverStoryImage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <div className={cn("overflow-hidden rounded-2xl", className)}>{children}</div>
    );
  }

  return (
    <m.div
      className={cn(
        "overflow-hidden rounded-2xl border border-border/60 bg-muted/30 shadow-sm",
        className
      )}
      initial="rest"
      whileHover="hover"
      animate="rest"
      variants={hoverOrchestrator}
    >
      <m.div variants={hoverImageZoomSubtle} className="will-change-transform">
        {children}
      </m.div>
    </m.div>
  );
}
