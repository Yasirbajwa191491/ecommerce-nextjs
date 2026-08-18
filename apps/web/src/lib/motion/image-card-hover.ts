import type { Transition, Variants } from "framer-motion";
import { EASE_PREMIUM } from "./transitions";

/** Smooth, slow zoom — similar to premium ecommerce catalog cards */
export const IMAGE_ZOOM_TRANSITION: Transition = {
  duration: 0.85,
  ease: [0.25, 0.46, 0.45, 0.94],
};

export const CARD_LIFT_SPRING: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 26,
  mass: 0.85,
};

export const hoverCardLift: Variants = {
  rest: {
    y: 0,
    scale: 1,
  },
  hover: {
    y: -8,
    scale: 1.015,
    transition: CARD_LIFT_SPRING,
  },
};

export const hoverImageZoom: Variants = {
  rest: { scale: 1 },
  hover: {
    scale: 1.12,
    transition: IMAGE_ZOOM_TRANSITION,
  },
};

export const hoverImageZoomSubtle: Variants = {
  rest: { scale: 1 },
  hover: {
    scale: 1.06,
    transition: { duration: 0.7, ease: EASE_PREMIUM },
  },
};

export const hoverCaptionLift: Variants = {
  rest: { y: 0, opacity: 1 },
  hover: {
    y: -5,
    opacity: 1,
    transition: { duration: 0.45, ease: EASE_PREMIUM },
  },
};

export const hoverArrowReveal: Variants = {
  rest: { opacity: 0, x: 6, scale: 0.92 },
  hover: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.4, ease: EASE_PREMIUM, delay: 0.04 },
  },
};

export const hoverOverlayShift: Variants = {
  rest: { opacity: 0.72 },
  hover: {
    opacity: 0.88,
    transition: { duration: 0.55, ease: EASE_PREMIUM },
  },
};

export const hoverShadowGlow: Variants = {
  rest: {
    boxShadow: "0 4px 14px -4px rgba(15, 23, 42, 0.12)",
  },
  hover: {
    boxShadow:
      "0 24px 48px -16px rgba(98, 84, 243, 0.22), 0 8px 20px -8px rgba(15, 23, 42, 0.15)",
    transition: { duration: 0.5, ease: EASE_PREMIUM },
  },
};

/** Passes `hover` variant to all child `m.*` components with matching variants */
export const hoverOrchestrator: Variants = {
  rest: {},
  hover: {
    transition: { staggerChildren: 0.03, delayChildren: 0 },
  },
};

export const hoverStoryText: Variants = {
  rest: { opacity: 0, x: -12 },
  hover: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: EASE_PREMIUM, delay: 0.08 },
  },
};
