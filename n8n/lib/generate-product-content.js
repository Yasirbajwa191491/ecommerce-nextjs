function convexSiteUrl() {
  const raw = String($vars.CONVEX_SITE_URL || "").trim().replace(/\/$/, "");
  if (!raw) {
    throw new Error(
      "Set CONVEX_SITE_URL in n8n Settings → Variables (use https://YOUR-DEPLOYMENT.convex.site, not .convex.cloud)"
    );
  }
  return raw.replace(".convex.cloud", ".convex.site");
}

function providerMeta(provider, model) {
  const meta = {};
  if (provider) meta.provider = provider;
  if (model) meta.model = model;
  return meta;
}

function buildContextPrompt(ctx) {
  const discountLine =
    ctx.discountPercent && ctx.discountPercent > 0
      ? "Discount: " + ctx.discountPercent + "% off"
      : "";
  let shippingLine = "";
  if (ctx.shipping) shippingLine = "Shipping: Free shipping";
  else if (ctx.shippingCharges && ctx.shippingCharges > 0)
    shippingLine = "Shipping: " + ctx.shippingCharges + " " + ctx.currency;
  const lines = [
    "Product name: " + ctx.name,
    "Brand: " + ctx.company,
    "Category: " + ctx.categoryName,
    ctx.sku ? "SKU: " + ctx.sku : "",
    "Price: " + ctx.price + " " + ctx.currency,
    discountLine,
    shippingLine,
    ctx.colors && ctx.colors.length ? "Colors: " + ctx.colors.join(", ") : "",
    ctx.description && ctx.description.trim()
      ? "Existing description: " + ctx.description.trim()
      : "",
    ctx.imageUrls && ctx.imageUrls.length
      ? "Number of product images: " + ctx.imageUrls.length
      : "",
  ].filter(Boolean);
  return lines.join("\n").slice(0, 6000);
}

function stripCodeFences(raw) {
  return String(raw || "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/g, "")
    .trim();
}

function parseJsonObjectLoose(raw) {
  const stripped = stripCodeFences(raw);
  if (!stripped) return {};
  try {
    return JSON.parse(stripped);
  } catch {
    // try brace slicing below
  }
  const start = stripped.indexOf("{");
  if (start < 0) return {};
  for (let end = stripped.length; end > start; end--) {
    if (stripped[end - 1] !== "}") continue;
    try {
      return JSON.parse(stripped.slice(start, end));
    } catch {
      continue;
    }
  }
  return {};
}

function parseTypeResult(type, raw) {
  const parsed = parseJsonObjectLoose(raw);
  if (type === "description") {
    const description =
      typeof parsed.description === "string" ? parsed.description.trim() : "";
    if (description) return { description };
    const plain = stripCodeFences(raw);
    if (plain && !plain.startsWith("{")) return { description: plain };
    return null;
  }
  if (type === "seo") {
    const seoTitle =
      typeof parsed.seoTitle === "string" ? parsed.seoTitle.trim() : "";
    const seoDescription =
      typeof parsed.seoDescription === "string"
        ? parsed.seoDescription.trim()
        : "";
    const seoKeywords = Array.isArray(parsed.seoKeywords)
      ? parsed.seoKeywords.map((k) => String(k).trim()).filter(Boolean)
      : [];
    if (seoTitle || seoDescription || seoKeywords.length) {
      return { seoTitle, seoDescription, seoKeywords };
    }
    return null;
  }
  if (type === "highlights") {
    const highlights = Array.isArray(parsed.highlights)
      ? parsed.highlights.map((h) => String(h).trim()).filter(Boolean)
      : [];
    if (highlights.length) return { highlights };
    return null;
  }
  return null;
}

const prompts = {
  description: {
    system:
      'You are an expert ecommerce copywriter. Reply with JSON only, no markdown fences: {"description":"..."}. Write persuasive, benefit-led product copy in multiple short paragraphs. Escape quotes inside the description string.',
  },
  seo: {
    system:
      'You are an ecommerce SEO specialist. Reply with JSON only, no markdown fences: {"seoTitle":"...","seoDescription":"...","seoKeywords":["keyword1"]}.',
  },
  highlights: {
    system:
      'You are an ecommerce merchandising expert. Reply with JSON only, no markdown fences: {"highlights":["Point one","Point two"]}. Generate 3-8 short selling points.',
  },
};

async function runProductContentGeneration(requestId, mode, context) {
  const isManualTest = String(requestId).startsWith("manual-test-");

  const typesToRun =
    mode === "all" ? ["description", "seo", "highlights"] : [mode];

  if (mode === "altText") {
    if (isManualTest) {
      return { ok: false, error: "Alt text is not supported in n8n mode" };
    }
    await this.helpers.httpRequest({
      method: "POST",
      url: convexSiteUrl() + "/n8n/product-ai/report-failure",
      headers: {
        "X-N8N-Secret": $vars.N8N_WEBHOOK_SECRET,
        "Content-Type": "application/json",
      },
      body: { requestId, error: "Alt text is not supported in n8n mode" },
      json: true,
    });
    return { ok: false, error: "altText not supported" };
  }

  const providerOrder = String(
    $vars.AI_FALLBACK_PROVIDER_ORDER || "groq,openrouter,openai"
  )
    .split(",")
    .map((s) => s.trim());
  const models = {
    groq: $vars.GROQ_MODEL || "llama-3.3-70b-versatile",
    openrouter: $vars.OPENROUTER_MODEL || "google/gemini-2.5-flash",
    openai: $vars.OPENAI_MODEL || "gpt-4o-mini",
  };
  const keys = {
    groq: $vars.GROQ_API_KEY,
    openrouter: $vars.OPENROUTER_API_KEY,
    openai: $vars.OPENAI_API_KEY,
  };

  async function httpRequestWithRetry(requestOptions, maxAttempts = 4) {
    let lastError = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.helpers.httpRequest(requestOptions);
      } catch (e) {
        lastError = e;
        const msg = String(e.message || e);
        const retryable = /\bstatus code (429|500|502|503|504)\b/i.test(msg);
        if (!retryable || attempt >= maxAttempts) throw e;
        const delayMs = Math.min(1000 * 2 ** (attempt - 1), 8000);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    throw lastError;
  }

  const configuredProviders = providerOrder.filter((p) => keys[p]);
  if (configuredProviders.length === 0) {
    throw new Error(
      "No AI provider API keys in n8n variables. Set at least one: GROQ_API_KEY, OPENROUTER_API_KEY, or OPENAI_API_KEY."
    );
  }

  async function chat(provider, system, user) {
    if (provider === "groq") {
      const res = await httpRequestWithRetry.call(this, {
        method: "POST",
        url: "https://api.groq.com/openai/v1/chat/completions",
        headers: {
          Authorization: "Bearer " + keys.groq,
          "Content-Type": "application/json",
        },
        body: {
          model: models.groq,
          temperature: 0.4,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        },
        json: true,
      });
      return res.choices?.[0]?.message?.content || "";
    }
    if (provider === "openrouter") {
      const res = await httpRequestWithRetry.call(this, {
        method: "POST",
        url: "https://openrouter.ai/api/v1/chat/completions",
        headers: {
          Authorization: "Bearer " + keys.openrouter,
          "Content-Type": "application/json",
        },
        body: {
          model: models.openrouter,
          temperature: 0.4,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        },
        json: true,
      });
      return res.choices?.[0]?.message?.content || "";
    }
    const res = await httpRequestWithRetry.call(this, {
      method: "POST",
      url: "https://api.openai.com/v1/chat/completions",
      headers: {
        Authorization: "Bearer " + keys.openai,
        "Content-Type": "application/json",
      },
      body: {
        model: models.openai,
        temperature: 0.4,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      },
      json: true,
    });
    return res.choices?.[0]?.message?.content || "";
  }

  function parseJsonObject(raw) {
    return parseJsonObjectLoose(raw);
  }

  const contextPrompt = buildContextPrompt(context);
  const mergedResult = {};
  let usedProvider = null;
  let usedModel = null;
  const startAll = Date.now();
  let lastError = null;

  for (const type of typesToRun) {
    const promptDef = prompts[type];
    if (!promptDef) continue;
    let saved = false;
    for (const provider of providerOrder) {
      if (!keys[provider]) continue;
      try {
        const raw = await chat.call(this, provider, promptDef.system, contextPrompt);
        const partial = parseTypeResult(type, raw);
        if (!partial) {
          lastError = "Could not parse " + type + " from AI response";
          continue;
        }
        Object.assign(mergedResult, partial);
        usedProvider = provider;
        usedModel = models[provider];
        saved = true;
        break;
      } catch (e) {
        lastError = e.message;
      }
    }
    if (!saved) {
      if (isManualTest) {
        return {
          ok: false,
          error: lastError || "Failed to generate " + type,
          type,
          manualTest: true,
        };
      }
      await this.helpers.httpRequest({
        method: "POST",
        url: convexSiteUrl() + "/n8n/product-ai/report-failure",
        headers: {
          "X-N8N-Secret": $vars.N8N_WEBHOOK_SECRET,
          "Content-Type": "application/json",
        },
        body: {
          requestId,
          error: lastError || "Failed to generate " + type,
          ...providerMeta(usedProvider, usedModel),
          durationMs: Date.now() - startAll,
        },
        json: true,
      });
      return { ok: false, error: lastError, type };
    }
  }

  if (isManualTest) {
    return {
      ok: true,
      requestId,
      result: mergedResult,
      provider: usedProvider,
      model: usedModel,
      durationMs: Date.now() - startAll,
      manualTest: true,
    };
  }

  await this.helpers.httpRequest({
    method: "POST",
    url: convexSiteUrl() + "/n8n/product-ai/complete",
    headers: {
      "X-N8N-Secret": $vars.N8N_WEBHOOK_SECRET,
      "Content-Type": "application/json",
    },
    body: {
      requestId,
      result: mergedResult,
      ...providerMeta(usedProvider, usedModel),
      durationMs: Date.now() - startAll,
    },
    json: true,
  });

  return {
    ok: true,
    requestId,
    provider: usedProvider,
    durationMs: Date.now() - startAll,
  };
}
