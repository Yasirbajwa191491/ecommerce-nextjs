import { getZeroShotPipeline } from "./transformers.js";

const URL_PATTERN =
  /https?:\/\/|www\.|[a-z0-9-]+\.(com|net|org|io|co|shop|store|biz)\b/i;
const REPEAT_PATTERN = /(.)\1{6,}/;
const ALL_CAPS_RATIO = 0.7;

const SPAM_LABELS = [
  "spam",
  "promotional content",
  "abusive language",
  "offensive language",
];

function heuristicModeration(text) {
  if (URL_PATTERN.test(text)) {
    return { flagged: true, reason: "Promotional links detected" };
  }

  if (REPEAT_PATTERN.test(text)) {
    return { flagged: true, reason: "Repetitive content detected" };
  }

  const letters = text.replace(/[^a-zA-Z]/g, "");
  if (letters.length > 20) {
    const upper = letters.replace(/[^A-Z]/g, "").length;
    if (upper / letters.length >= ALL_CAPS_RATIO) {
      return { flagged: true, reason: "Excessive caps detected" };
    }
  }

  return null;
}

export async function moderateText(text) {
  const heuristic = heuristicModeration(text);
  if (heuristic) return heuristic;

  try {
    const classifier = await getZeroShotPipeline();
    const result = await classifier(text.slice(0, 512), SPAM_LABELS, {
      multi_label: true,
    });

    const scores = result.labels.map((label, index) => ({
      label,
      score: result.scores[index],
    }));

    const top = scores.sort((a, b) => b.score - a.score)[0];
    if (top && top.score >= 0.55) {
      const reasonMap = {
        spam: "Spam detected",
        "promotional content": "Promotional content detected",
        "abusive language": "Abusive language detected",
        "offensive language": "Offensive language detected",
      };
      return {
        flagged: true,
        reason: reasonMap[top.label] ?? "Content flagged by AI moderation",
      };
    }
  } catch (error) {
    console.warn("Zero-shot moderation failed:", error);
  }

  return { flagged: false };
}
