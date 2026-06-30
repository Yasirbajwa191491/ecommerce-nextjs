export const RECOMMENDATION_SECTION_COPY = {
  recommended_for_you: {
    title: "Recommended For You",
    description: "Personalized picks based on your browsing and interests.",
  },
  trending_in_interests: {
    title: "Trending In Your Interests",
    description: "Popular products in categories you explore most.",
  },
  continue_shopping: {
    title: "Continue Shopping",
    description: "Pick up where you left off.",
  },
  recently_viewed: {
    title: "Recently Viewed",
    description: "Products you looked at recently.",
  },
  because_you_bought: {
    title: "Because You Bought",
    description: "Customers who bought similar items also loved these.",
  },
  because_you_viewed: {
    title: "Because You Viewed",
    description: "More products related to what you explored.",
  },
  ai_suggested: {
    title: "AI Suggested Products",
    description: "Smart suggestions tailored to your shopping style.",
  },
  customers_like_you_bought: {
    title: "Customers Like You Also Bought",
    description: "Popular with shoppers who share your interests.",
  },
  recommended_alternatives: {
    title: "Recommended Alternatives",
    description: "Similar options worth comparing.",
  },
  ai_suggested_accessories: {
    title: "AI Suggested Accessories",
    description: "Complementary products for your setup.",
  },
  frequently_bought_together: {
    title: "Frequently Bought Together",
    description: "Often purchased with this item.",
  },
  complete_your_setup: {
    title: "Complete Your Setup",
    description: "Everything you need to finish your purchase.",
  },
  customers_also_purchased: {
    title: "Customers Also Purchased",
    description: "Shoppers with similar carts also bought these.",
  },
  recommended_accessories: {
    title: "Recommended Accessories",
    description: "Add-ons that pair well with your cart.",
  },
  last_minute: {
    title: "Last Minute Recommendations",
    description: "Don't miss these before you check out.",
  },
  frequently_added: {
    title: "Frequently Added Items",
    description: "Popular add-ons at checkout.",
  },
  recommended_addons: {
    title: "Recommended Add-ons",
    description: "Small extras that make a big difference.",
  },
} as const;

export type RecommendationSectionType =
  keyof typeof RECOMMENDATION_SECTION_COPY;
