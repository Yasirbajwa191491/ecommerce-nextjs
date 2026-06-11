export type ReviewSentiment = "positive" | "neutral" | "negative";

export type SentimentResult = {
  sentiment: ReviewSentiment;
  confidence: number;
};

export type ModerationResult = {
  flagged: boolean;
  reason?: string;
};

export type ReviewTopic = {
  name: string;
  mentionCount: number;
};

export type ReviewForReply = {
  rating: number;
  title: string;
  content: string;
  customerName?: string;
};

export interface ReviewAIProvider {
  analyzeSentiment(text: string): Promise<SentimentResult>;
  generateTags(text: string): Promise<string[]>;
  detectSpam(text: string): Promise<ModerationResult>;
  embed(text: string): Promise<number[]>;
  summarizeReviews(reviews: string[]): Promise<string>;
  extractTopics(reviews: string[]): Promise<ReviewTopic[]>;
  generateReply(review: ReviewForReply): Promise<string>;
}
