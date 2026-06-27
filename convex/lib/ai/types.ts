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

export type AiProviderName =
  | "gemini"
  | "groq"
  | "openrouter"
  | "openai"
  | "anthropic"
  | "remote";

export type ReviewAiGenerationType =
  | "sentiment"
  | "tags"
  | "moderation"
  | "reply"
  | "summary"
  | "topics"
  | "full_analysis";

export type ReviewAiGenerationSource = "automatic" | "manual" | "fallback";

export type ReviewAiGenerationMode = "replace" | "version" | "history_only";

export type NormalizedAiGeneration = {
  provider: string;
  model: string;
  type: ReviewAiGenerationType;
  content: string;
  durationMs?: number;
  error?: string;
};

export interface ReviewAIProvider {
  readonly name: AiProviderName;
  readonly model: string;
  analyzeSentiment(text: string): Promise<SentimentResult>;
  generateTags(text: string): Promise<string[]>;
  detectSpam(text: string): Promise<ModerationResult>;
  embed(text: string): Promise<number[]>;
  summarizeReviews(reviews: string[]): Promise<string>;
  extractTopics(reviews: string[]): Promise<ReviewTopic[]>;
  generateReply(review: ReviewForReply): Promise<string>;
  /** Alias for analyzeSentiment — normalized provider interface */
  generateSentiment?(text: string): Promise<SentimentResult>;
  /** Alias for detectSpam */
  generateSummary?(reviews: string[]): Promise<string>;
}
