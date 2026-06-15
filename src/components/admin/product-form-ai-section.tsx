"use client";

import { useState } from "react";
import { useAction } from "convex/react";
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
import { toastError, toastSuccess } from "@/lib/app-toast";
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
  if (mode === "description" && result.description) {
    payload.description = result.description;
  }
  if (mode === "seo") {
    if (result.seoTitle) payload.seoTitle = result.seoTitle;
    if (result.seoDescription) payload.seoDescription = result.seoDescription;
    if (result.seoKeywords) payload.seoKeywords = result.seoKeywords;
  }
  if (mode === "highlights" && result.highlights) {
    payload.highlights = result.highlights;
  }
  if (mode === "altText" && result.imageAlts) {
    payload.imageAlts = result.imageAlts;
  }
  return payload;
}

export function ProductFormAiSection({
  context,
  fields,
  onApply,
}: ProductFormAiSectionProps) {
  const generateContent = useAction(
    api.adminProductContent.generateProductContentAction
  );
  const [loadingMode, setLoadingMode] = useState<ContentMode | null>(null);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingGeneration | null>(null);

  const canGenerate =
    context.name.trim().length > 0 && context.categoryName.trim().length > 0;

  const runGeneration = async (mode: ContentMode) => {
    if (!canGenerate) {
      toastError("Enter a product name and select a category first", {
        title: "Missing product details",
      });
      return;
    }

    setLoadingMode(mode);
    setProgressLabel(
      mode === "all" ? "Generating product content…" : `${MODE_LABELS[mode]}…`
    );

    try {
      const result = await generateContent({
        mode,
        context: buildActionContext(context),
      });

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
          ? "All product content generated"
          : `${MODE_LABELS[mode]} complete`
      );
    } catch (error) {
      toastError(error, { title: "Content generation failed" });
    } finally {
      setLoadingMode(null);
      setProgressLabel(null);
    }
  };

  const handleModeClick = (mode: ContentMode) => {
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
            Generate professional ecommerce copy with Gemini. Review and edit
            before saving.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!canGenerate ? (
            <p className="text-sm text-muted-foreground">
              Enter a product name and category to enable AI generation.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {buttons.map((mode) => {
              const isLoading = loadingMode === mode;
              const isDisabled = !canGenerate || loadingMode !== null;
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
                  disabled={isDisabled}
                  onClick={() => handleModeClick(mode)}
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
