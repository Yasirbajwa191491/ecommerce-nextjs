const OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.2";

async function ollamaChat(prompt, system) {
  const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ollama request failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  return String(data.message?.content ?? "").trim();
}

function parseJsonArray(text) {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function generateTags(text) {
  try {
    const content = await ollamaChat(
      `Review:\n${text}\n\nReturn a JSON array of 2-5 short tags (2-3 words each) describing themes in this review. Example: ["Good Quality", "Fast Delivery"]`,
      "You extract concise product review tags. Respond with JSON array only."
    );
    const tags = parseJsonArray(content)
      .map((tag) => String(tag).trim())
      .filter(Boolean);
    if (tags.length) return tags;
  } catch (error) {
    console.warn("Ollama tag generation failed:", error.message);
  }

  return fallbackTags(text);
}

function fallbackTags(text) {
  const lower = text.toLowerCase();
  const tags = [];
  if (/quality|excellent|durable|sturdy/.test(lower)) tags.push("Good Quality");
  if (/fast|quick|speedy/.test(lower) && /deliver|ship/.test(lower)) {
    tags.push("Fast Delivery");
  }
  if (/comfort|comfortable|fit/.test(lower)) tags.push("Comfort");
  if (/value|price|worth/.test(lower)) tags.push("Good Value");
  return tags.slice(0, 5);
}

export async function summarizeReviews(reviews) {
  const joined = reviews
    .slice(0, 40)
    .map((r, i) => `${i + 1}. ${r}`)
    .join("\n");

  try {
    return await ollamaChat(
      `Summarize these product reviews in 2-3 sentences for shoppers. Mention common praise and common complaints.\n\n${joined}`,
      "You write concise, balanced ecommerce review summaries."
    );
  } catch (error) {
    console.warn("Ollama summarize failed:", error.message);
    return fallbackSummary(reviews);
  }
}

function fallbackSummary(reviews) {
  return `Based on ${reviews.length} customer reviews, shoppers share mixed feedback about this product. Read individual reviews for more detail.`;
}

export async function extractTopics(reviews) {
  const joined = reviews.slice(0, 40).join("\n");

  try {
    const content = await ollamaChat(
      `From these reviews, return JSON array of objects with "name" and "mentionCount" for the top themes.\n\n${joined}`,
      'Respond with JSON only, e.g. [{"name":"Quality","mentionCount":12}]'
    );
    const match = content.match(/\[[\s\S]*\]/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed) && parsed.length) {
        return parsed
          .map((item) => ({
            name: String(item.name ?? "").trim(),
            mentionCount: Number(item.mentionCount ?? 1),
          }))
          .filter((item) => item.name)
          .slice(0, 8);
      }
    }
  } catch (error) {
    console.warn("Ollama topics failed:", error.message);
  }

  return fallbackTopics(joined);
}

function fallbackTopics(text) {
  const topics = [
    { name: "Quality", pattern: /quality|durable|material|build/i },
    { name: "Comfort", pattern: /comfort|fit|soft/i },
    { name: "Delivery", pattern: /deliver|shipping|arrived/i },
    { name: "Value", pattern: /price|value|worth|expensive|cheap/i },
  ];

  return topics
    .map(({ name, pattern }) => ({
      name,
      mentionCount: (text.match(pattern) ?? []).length,
    }))
    .filter((topic) => topic.mentionCount > 0)
    .sort((a, b) => b.mentionCount - a.mentionCount);
}

export async function generateReply(review) {
  const prompt = `Customer review (${review.rating}/5 stars):
Title: ${review.title}
Content: ${review.content}
Customer: ${review.customerName ?? "Customer"}

Write a professional, empathetic store reply (80-120 words). Do not offer refunds unless the review explicitly requests one.`;

  try {
    return await ollamaChat(
      prompt,
      "You are a professional ecommerce customer support manager."
    );
  } catch (error) {
    console.warn("Ollama reply failed:", error.message);
    return `Thank you for your ${review.rating}-star review, ${review.customerName ?? "valued customer"}. We appreciate you sharing your experience about "${review.title}". Your feedback helps us improve our products and service.`;
  }
}
