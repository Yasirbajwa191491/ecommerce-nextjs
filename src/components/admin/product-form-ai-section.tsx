"use client";

import { useEffect, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { getFriendlyProductAiErrorMessage } from "@/lib/ai-error-messages";
import type { ProductAiContentProvider } from "@/lib/product-ai-provider";
import { Loader2, Sparkles } from "lucide-react";

export type ProductAiFormContext = {
  name: string;
  company: string;
  categoryName: string;
  description: string;
  colors: string[];
  sku: string;
  price: number;
  currency: string;
  discountPercent: number;
  shipping: boolean;
  shippingCharges: number;
  imageUrls: string[];
};

export type ProductAiFormFields = {
  description: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  highlights: string[];
  imageAlts: string[];
};

export type ProductAiApplyPayload = Partial<{
  description: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  highlights: string[];
  imageAlts: string[];
}>;

type ContentMode = "description" | "seo" | "highlights" | "altText" | "all";

type PendingGeneration = {
  mode: ContentMode;
  label: string;
};

type ProductFormAiSectionProps = {
  context: ProductAiFormContext;
  fields: ProductAiFormFields;
  provider: ProductAiContentProvider;
  onProviderChange: (provider: ProductAiContentProvider) => void;
  onApply: (payload: ProductAiApplyPayload) => void;
};

const MODE_LABELS: Record<ContentMode, string> = {
  description: "Generate Description",
  seo: "Generate SEO Content",
  highlights: "Generate Highlights",
  altText: "Generate Alt Text",
  all: "Generate All Content",
};

function hasContent(fields: ProductAiFormFields, mode: ContentMode): boolean {
  switch (mode) {
    case "description":
      return fields.description.trim().length > 0;
    case "seo":
      return (
        fields.seoTitle.trim().length > 0 ||
        fields.seoDescription.trim().length > 0 ||
        fields.seoKeywords.trim().length > 0
      );
    case "highlights":
      return fields.highlights.some((h) => h.trim().length > 0);
    case "altText":
      return fields.imageAlts.some((a) => a.trim().length > 0);
    case "all":
      return (
        hasContent(fields, "description") ||
        hasContent(fields, "seo") ||
        hasContent(fields, "highlights") ||
        hasContent(fields, "altText")
      );
  }
}

function buildActionContext(context: ProductAiFormContext) {
  return {
    name: context.name.trim(),
    company: context.company.trim(),
    categoryName: context.categoryName.trim(),
    description: context.description.trim() || undefined,
    colors: context.colors.map((c) => c.trim()).filter(Boolean),
    sku: context.sku.trim() || undefined,
    price: Number(context.price),
    currency: context.currency.trim(),
    discountPercent: context.discountPercent || undefined,
    shipping: context.shipping,
    shippingCharges: context.shipping ? undefined : context.shippingCharges,
    imageUrls: context.imageUrls.map((u) => u.trim()).filter(Boolean),
  };
}

function resultToPayload(
  mode: ContentMode,
  result: ProductAiApplyPayload
): ProductAiApplyPayload {
  if (mode === "all") return result;

  const payload: ProductAiApplyPayload = {};
  if (mode === "description" && result.description !== undefined) {
    payload.description = result.description;
  }
  if (mode === "seo") {
    if (result.seoTitle !== undefined) payload.seoTitle = result.seoTitle;
    if (result.seoDescription !== undefined) {
      payload.seoDescription = result.seoDescription;
    }
    if (result.seoKeywords !== undefined) payload.seoKeywords = result.seoKeywords;
  }
  if (mode === "highlights" && result.highlights !== undefined) {
    payload.highlights = result.highlights;
  }
  if (mode === "altText" && result.imageAlts !== undefined) {
    payload.imageAlts = result.imageAlts;
  }
  return payload;
}

export function ProductFormAiSection({
  context,
  fields,
  provider,
  onProviderChange,
  onApply,
}: ProductFormAiSectionProps) {
  const generateContentGemini = useAction(
    api.adminProductContent.generateProductContentAction
  );
  const generateContentN8n = useAction(
    api.adminProductContentN8n.generateProductContentN8nAction
  );
  const n8nConfig = useQuery(api.productContentJobs.getN8nAvailability, {});

  const [loadingMode, setLoadingMode] = useState<ContentMode | null>(null);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingGeneration | null>(null);

  const n8nAvailable = n8nConfig?.n8nAvailable ?? false;

  useEffect(() => {
    if (n8nConfig === undefined) return;
    if (!n8nAvailable && provider === "n8n") {
      onProviderChange("gemini");
    }
  }, [n8nConfig, n8nAvailable, provider, onProviderChange]);

  const canGenerate =
    context.name.trim().length > 0 && context.categoryName.trim().length > 0;

  const isModeDisabled = (mode: ContentMode): boolean => {
    if (provider === "n8n" && mode === "altText") return true;
    return !canGenerate || loadingMode !== null;
  };

  const runGeneration = async (mode: ContentMode) => {
    if (!canGenerate) {
      toastError("Enter a product name and select a category first", {
        title: "Missing product details",
      });
      return;
    }

    if (provider === "n8n" && mode === "altText") {
      toastError(
        "Alt text requires image analysis. Switch to Gemini to generate alt text.",
        { title: "Not available in n8n mode" }
      );
      return;
    }

    setLoadingMode(mode);
    setProgressLabel(
      provider === "n8n"
        ? mode === "all"
          ? "Generating product content via n8n…"
          : `${MODE_LABELS[mode]} via n8n…`
        : mode === "all"
          ? "Generating product content…"
          : `${MODE_LABELS[mode]}…`
    );

    try {
      const actionContext = buildActionContext(context);
      const result =
        provider === "n8n"
          ? await generateContentN8n({ mode, context: actionContext })
          : await generateContentGemini({ mode, context: actionContext });

      const payload = resultToPayload(mode, {
        description: result.description,
        seoTitle: result.seoTitle,
        seoDescription: result.seoDescription,
        seoKeywords: result.seoKeywords?.join(", "),
        highlights: result.highlights,
        imageAlts: result.imageAlts,
      });

      onApply(payload);
      toastSuccess(
        mode === "all"
          ? provider === "n8n"
            ? "Description, SEO, and highlights generated via n8n"
            : "All product content generated"
          : `${MODE_LABELS[mode]} complete`
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? getFriendlyProductAiErrorMessage(error.message)
          : getFriendlyProductAiErrorMessage(String(error));
      toastError(message, { title: "Content generation failed" });
    } finally {
      setLoadingMode(null);
      setProgressLabel(null);
    }
  };

  const handleModeClick = (mode: ContentMode) => {
    if (isModeDisabled(mode)) return;
    if (hasContent(fields, mode)) {
      setPending({ mode, label: MODE_LABELS[mode] });
      return;
    }
    void runGeneration(mode);
  };

  const confirmOverwrite = () => {
    if (!pending) return;
    const mode = pending.mode;
    setPending(null);
    void runGeneration(mode);
  };

  const buttons: ContentMode[] = [
    "description",
    "seo",
    "highlights",
    "altText",
    "all",
  ];

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4" />
            AI Content
          </CardTitle>
          <CardDescription>
            {provider === "gemini"
              ? "Generate professional ecommerce copy with Gemini. Review and edit before saving."
              : "Generate description, SEO, and highlights via n8n (Groq, OpenRouter, or OpenAI). Review and edit before saving."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>AI provider</Label>
            <RadioGroup
              value={provider}
              onValueChange={(value) =>
                onProviderChange(value === "n8n" ? "n8n" : "gemini")
              }
              disabled={loadingMode !== null}
              className="grid gap-2 sm:grid-cols-2"
            >
              <label
                htmlFor="ai-provider-gemini"
                className="flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm"
              >
                <RadioGroupItem value="gemini" id="ai-provider-gemini" />
                <span>Gemini (direct)</span>
              </label>
              <label
                htmlFor="ai-provider-n8n"
                className="flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm data-[disabled]:opacity-50"
                data-disabled={!n8nAvailable ? "" : undefined}
              >
                <RadioGroupItem
                  value="n8n"
                  id="ai-provider-n8n"
                  disabled={!n8nAvailable}
                />
                <span>n8n automation</span>
              </label>
            </RadioGroup>
            {!n8nAvailable && n8nConfig !== undefined ? (
              <p className="text-xs text-muted-foreground">
                n8n mode uses the same{" "}
                <code className="text-xs">N8N_REVIEW_WEBHOOK_URL</code> via
                workflow 01 (no separate webhook needed).
              </p>
            ) : null}
            {provider === "n8n" ? (
              <p className="text-xs text-muted-foreground">
                Alt text needs image analysis and is only available with Gemini.
                &quot;Generate All&quot; in n8n mode creates description, SEO,
                and highlights only.
              </p>
            ) : null}
          </div>

          {!canGenerate ? (
            <p className="text-sm text-muted-foreground">
              Enter a product name and category to enable AI generation.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {buttons.map((mode) => {
              const isLoading = loadingMode === mode;
              const disabled = isModeDisabled(mode);
              const hasExisting = hasContent(fields, mode);
              const label = hasExisting
                ? MODE_LABELS[mode].replace("Generate", "Regenerate")
                : MODE_LABELS[mode];

              return (
                <Button
                  key={mode}
                  type="button"
                  variant={mode === "all" ? "default" : "outline"}
                  size="sm"
                  disabled={disabled}
                  onClick={() => handleModeClick(mode)}
                  title={
                    provider === "n8n" && mode === "altText"
                      ? "Alt text requires Gemini vision"
                      : undefined
                  }
                >
                  {isLoading ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="size-3.5" />
                  )}
                  {label}
                </Button>
              );
            })}
          </div>

          {progressLabel ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {progressLabel}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace existing content?</AlertDialogTitle>
            <AlertDialogDescription>
              {pending
                ? `${pending.label} will overwrite fields that already have content. You can still edit the results before saving.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmOverwrite}>
              Replace content
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
