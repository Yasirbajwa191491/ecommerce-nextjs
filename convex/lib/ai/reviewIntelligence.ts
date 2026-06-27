import type { ReviewAIProvider } from "./types";
import { buildReviewText, normalizeTags } from "./tagUtils";
import type {
  ModerationResult,
  ReviewForReply,
  ReviewTopic,
  SentimentResult,
} from "./types";

export type ReviewAnalysisInput = {
  title: string;
  content: string;
};

export type ReviewAnalysisResult = {
  sentiment: SentimentResult["sentiment"];
  sentimentConfidence: number;
  tags: string[];
  moderation: ModerationResult;
  embedding: number[];
};

export async function analyzeReviewSentiment(
  provider: ReviewAIProvider,
  text: string
): Promise<SentimentResult> {
  return await provider.analyzeSentiment(text);
}

export async function generateReviewTags(
  provider: ReviewAIProvider,
  text: string
): Promise<string[]> {
  const tags = await provider.generateTags(text);
  return normalizeTags(tags);
}

export async function detectSpamReview(
  provider: ReviewAIProvider,
  text: string
): Promise<ModerationResult> {
  return await provider.detectSpam(text);
}

export async function embedReviewText(
  provider: ReviewAIProvider,
  text: string
): Promise<number[]> {
  return await provider.embed(text);
}

function shouldSerializeCalls(): boolean {
  const provider = process.env.AI_PROVIDER?.toLowerCase();
  if (provider && provider !== "gemini") return false;
  return process.env.GEMINI_SERIALIZE_CALLS !== "false";
}

export async function analyzeReview(
  provider: ReviewAIProvider,
  input: ReviewAnalysisInput
): Promise<ReviewAnalysisResult> {
  const text = buildReviewText(input.title, input.content);

  if (shouldSerializeCalls()) {
    const sentiment = await analyzeReviewSentiment(provider, text);
    const tags = await generateReviewTags(provider, text);
    const moderation = await detectSpamReview(provider, text);
    const embedding = await embedReviewText(provider, text);
    return {
      sentiment: sentiment.sentiment,
      sentimentConfidence: sentiment.confidence,
      tags,
      moderation,
      embedding,
    };
  }

  const [sentiment, tags, moderation, embedding] = await Promise.all([
    analyzeReviewSentiment(provider, text),
    generateReviewTags(provider, text),
    detectSpamReview(provider, text),
    embedReviewText(provider, text),
  ]);

  return {
    sentiment: sentiment.sentiment,
    sentimentConfidence: sentiment.confidence,
    tags,
    moderation,
    embedding,
  };
}

export async function summarizeReviews(
  provider: ReviewAIProvider,
  reviews: string[]
): Promise<string> {
  return await provider.summarizeReviews(reviews);
}

export async function extractReviewTopics(
  provider: ReviewAIProvider,
  reviews: string[]
): Promise<ReviewTopic[]> {
  return await provider.extractTopics(reviews);
}

export async function generateReviewReply(
  provider: ReviewAIProvider,
  review: ReviewForReply
): Promise<string> {
  return await provider.generateReply(review);
}
