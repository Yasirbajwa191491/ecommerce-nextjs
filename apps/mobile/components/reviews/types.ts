export type PublicReview = {
  _id: string;
  productId?: string;
  orderId?: string;
  customerName: string;
  rating: number;
  title: string;
  content: string;
  imageUrls: string[];
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: number;
  aiTags?: string[];
  adminReplyPublished?: string;
};

export type ReviewOrderItem = {
  productId: string;
  productName: string;
};

export type OrderReviewStatus =
  | "not_eligible"
  | "eligible"
  | "pending"
  | "approved";
