"use client";

import { m, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type MotionCartBadgeProps = {
  count: number;
  className?: string;
};

export function MotionCartBadge({ count, className }: MotionCartBadgeProps) {
  const reduceMotion = useReducedMotion();
  const prevCountRef = useRef(count);
  const pulseKeyRef = useRef(0);
  const shouldPulse = count > prevCountRef.current;

  useEffect(() => {
    if (shouldPulse && !reduceMotion) {
      pulseKeyRef.current += 1;
    }
    prevCountRef.current = count;
  }, [count, shouldPulse, reduceMotion]);

  const display = count > 99 ? "99+" : count;

  if (reduceMotion) {
    return (
      <span className={className} aria-hidden>
        {display}
      </span>
    );
  }

  return (
    <m.span
      className={cn("relative inline-flex", className)}
      aria-hidden
      layout
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    >
      {shouldPulse ? (
        <m.span
          key={pulseKeyRef.current}
          className="pointer-events-none absolute inset-0 rounded-full bg-[#6254f3]"
          initial={{ scale: 1, opacity: 0.6 }}
          animate={{ scale: 1.8, opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      ) : null}
      <m.span
        key={display}
        initial={{ scale: 1.3, opacity: 0.8 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 22 }}
        className="relative"
      >
        {display}
      </m.span>
    </m.span>
  );
}
