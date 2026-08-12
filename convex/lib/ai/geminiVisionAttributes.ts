"use node";

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

export async function extractVisualSearchAttributes(args: {
  imageBase64: string;
  mimeType: string;
}): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: "Describe this product for ecommerce search. Return a concise comma-separated list of: product type, color, material, style, brand hints, and key visual features. No markdown.",
            },
            {
              inlineData: {
                mimeType: args.mimeType,
                data: args.imageBase64,
              },
            },
          ],
        },
      ],
      generationConfig: { temperature: 0.2, maxOutputTokens: 256 },
    }),
  });

  if (!response.ok) return null;

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  return text || null;
}
