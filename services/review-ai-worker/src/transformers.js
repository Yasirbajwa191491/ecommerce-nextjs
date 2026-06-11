import { pipeline } from "@xenova/transformers";

let sentimentPipeline;
let embeddingPipeline;
let zeroShotPipeline;

export async function getSentimentPipeline() {
  if (!sentimentPipeline) {
    sentimentPipeline = await pipeline(
      "sentiment-analysis",
      "Xenova/distilbert-base-uncased-finetuned-sst-2-english"
    );
  }
  return sentimentPipeline;
}

export async function getEmbeddingPipeline() {
  if (!embeddingPipeline) {
    embeddingPipeline = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    );
  }
  return embeddingPipeline;
}

export async function getZeroShotPipeline() {
  if (!zeroShotPipeline) {
    zeroShotPipeline = await pipeline(
      "zero-shot-classification",
      "Xenova/mobilebert-uncased-mnli"
    );
  }
  return zeroShotPipeline;
}

export async function analyzeSentiment(text) {
  const classifier = await getSentimentPipeline();
  const result = await classifier(text.slice(0, 512), { topk: 1 });
  const top = Array.isArray(result) ? result[0] : result;
  const label = String(top.label).toLowerCase();
  const score = Number(top.score);

  let sentiment = "neutral";
  if (label.includes("positive")) sentiment = "positive";
  else if (label.includes("negative")) sentiment = "negative";

  return { sentiment, confidence: Math.round(score * 1000) / 1000 };
}

export async function embedText(text) {
  const extractor = await getEmbeddingPipeline();
  const output = await extractor(text.slice(0, 512), {
    pooling: "mean",
    normalize: true,
  });
  return Array.from(output.data);
}
