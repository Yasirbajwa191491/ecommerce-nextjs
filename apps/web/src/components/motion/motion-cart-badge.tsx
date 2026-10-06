"use client";

import { m, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type MotionCartBadgeProps = {
  count: number;
  className?: string;
};

export function MotionCartBadge({ count, className }: MotionCartBadgeProps) {
  const reduceMotion = useReducedMotion();
  const prevCountRef = useRef(count);
  const [pulseKey, setPulseKey] = useState(0);

  useEffect(() => {
    const previous = prevCountRef.current;
    prevCountRef.current = count;
    if (count <= previous || reduceMotion) return;

    const timer = window.setTimeout(() => {
      setPulseKey((key) => key + 1);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [count, reduceMotion]);

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
      {pulseKey > 0 ? (
        <m.span
          key={pulseKey}
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
