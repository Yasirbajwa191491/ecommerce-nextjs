export const EASE_PREMIUM = [0.22, 1, 0.36, 1] as const;

export const transitionEntrance = {
  duration: 0.5,
  ease: EASE_PREMIUM,
} as const;

export const transitionMicro = {
  duration: 0.2,
  ease: EASE_PREMIUM,
} as const;

export const transitionCard = {
  duration: 0.35,
  ease: EASE_PREMIUM,
} as const;

export const transitionPage = {
  duration: 0.3,
  ease: EASE_PREMIUM,
} as const;

export const transitionDropdown = {
  duration: 0.25,
  ease: EASE_PREMIUM,
} as const;

export const viewportReveal = {
  once: true,
  margin: "-8%",
  amount: 0.15,
} as const;
