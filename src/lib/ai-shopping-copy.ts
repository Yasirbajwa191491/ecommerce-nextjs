/** Copy-only AI shopping content — no icon imports (safe for all client/server bundles). */

export const AI_SHOPPING_JOURNEY = [
  "AI-powered discovery",
  "Product exploration",
  "Smart recommendations",
  "Confident purchase",
] as const;

export const AI_SHOPPING_FAQ = [
  {
    question: "Do I need an account to use AI shopping?",
    answer:
      "No account is required to search, use the assistant, or checkout as a guest. AI search and voice shopping work immediately. Session-based recommendations use products you view and cart items stored in your browser during this visit.",
  },
  {
    question: "How do personalized recommendations work without an account?",
    answer:
      "Recommendations can use products you view and items in your cart during this visit — no sign-in required. If you place an order, checkout details can help improve future suggestions on later visits.",
  },
  {
    question: "Can the assistant help with my order?",
    answer:
      "Yes. Ask about order status, delivery, or returns. You can also use Track Order and ask the AI assistant for help.",
  },
  {
    question: "Is voice shopping available on mobile?",
    answer:
      "Yes. Tap the AI assistant button and use voice or text — both work on mobile and desktop.",
  },
] as const;
