"use client";

import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { buildFormStateFromAiCampaign } from "@/lib/email-marketing/build-tiptap-from-ai";
import { Loader2, Sparkles } from "lucide-react";
import type { PromoProduct } from "./product-promo-preview";
import type { SegmentSelectorValue } from "./segment-selector";

export type EmailAiApplyPayload = {
  name?: string;
  subject: string;
  headline: string;
  previewText: string;
  contentJson: string;
  contentHtml: string;
  ctaText: string;
  productPromoText: string;
  productIds: Id<"products">[];
  selectedProducts: PromoProduct[];
  suggestedSegmentKeys: string[];
  audience?: SegmentSelectorValue;
};

type EmailMarketingAiAssistantProps = {
  mode: "template" | "campaign";
  campaignName?: string;
  onApply: (payload: EmailAiApplyPayload) => void;
};

type QuickPreset =
  | { kind: "thematic"; preset: "summer_sale" | "new_arrivals" | "clearance_sale" | "holiday_promotion"; label: string }
  | { kind: "category"; slug: string; name: string; label: string }
  | { kind: "custom"; label: string };

const THEMATIC_PRESETS: QuickPreset[] = [
  { kind: "thematic", preset: "summer_sale", label: "Generate Summer Sale Campaign" },
  { kind: "thematic", preset: "new_arrivals", label: "Generate New Arrivals Campaign" },
  { kind: "thematic", preset: "clearance_sale", label: "Generate Clearance Sale" },
  { kind: "thematic", preset: "holiday_promotion", label: "Generate Holiday Promotion" },
  { kind: "custom", label: "Generate Custom Campaign" },
];

export function EmailMarketingAiAssistant({
  mode,
  campaignName,
  onApply,
}: EmailMarketingAiAssistantProps) {
  const categories = useQuery(api.productCategories.listActive);
  const generate = useAction(api.emailCampaignAi.generateCampaign);
  const [customPrompt, setCustomPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const categoryPresets: QuickPreset[] =
    categories?.map((cat) => ({
      kind: "category" as const,
      slug: cat.slug,
      name: cat.name,
      label: `Generate ${cat.name} Promotion`,
    })) ?? [];

  const allPresets = [...THEMATIC_PRESETS.slice(0, 4), ...categoryPresets, THEMATIC_PRESETS[4]!];

  const runGenerate = async (preset: QuickPreset) => {
    setLoading(true);
    setActivePreset(preset.label);
    try {
      let result;
      if (preset.kind === "thematic") {
        result = await generate({ preset: preset.preset });
      } else if (preset.kind === "category") {
        result = await generate({
          preset: "category_promotion",
          categorySlug: preset.slug,
          categoryName: preset.name,
        });
      } else {
        if (!customPrompt.trim()) {
          toastError("Enter a custom prompt or choose a quick action.");
          return;
        }
        const minDiscountMatch = customPrompt.match(/(\d+)\s*%/);
        const minDiscountPercent = minDiscountMatch
          ? Number(minDiscountMatch[1])
          : undefined;
        result = await generate({
          preset: "custom",
          customPrompt: customPrompt.trim(),
          minDiscountPercent,
        });
      }

      const formState = buildFormStateFromAiCampaign({
        campaignName: result.campaignName,
        subject: result.subject,
        headline: result.headline,
        previewText: result.previewText,
        bodyParagraphs: result.bodyParagraphs,
        ctaText: result.ctaText,
        productPromoText: result.productPromoText,
        suggestedProductIds: result.suggestedProductIds,
        suggestedSegmentKeys: result.suggestedSegmentKeys,
      });

      const productIds = result.suggestedProductIds as Id<"products">[];

      onApply({
        name: mode === "campaign" ? formState.name || campaignName : formState.name,
        subject: formState.subject,
        headline: formState.headline,
        previewText: formState.previewText,
        contentJson: formState.contentJson,
        contentHtml: formState.contentHtml,
        ctaText: formState.ctaText,
        productPromoText: formState.productPromoText,
        productIds,
        selectedProducts: [],
        suggestedSegmentKeys: result.suggestedSegmentKeys,
        audience:
          mode === "campaign" && result.suggestedSegmentKeys.length > 0
            ? {
                mode: "segments",
                segmentKeys: result.suggestedSegmentKeys,
                selectedSubscriberIds: [],
              }
            : undefined,
      });

      toastSuccess("AI campaign generated", {
        description: "Review and edit the content before saving.",
      });
    } catch (error) {
      toastError(error, { title: "AI generation failed" });
    } finally {
      setLoading(false);
      setActivePreset(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" />
          AI Assistant
        </CardTitle>
        <CardDescription>
          Generate complete email content, product suggestions, and audience segments in one click.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {allPresets.map((preset) => (
            <Button
              key={preset.label}
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => void runGenerate(preset)}
            >
              {loading && activePreset === preset.label ? (
                <Loader2 className="mr-1 size-3.5 animate-spin" />
              ) : (
                <Sparkles className="mr-1 size-3.5" />
              )}
              {preset.label}
            </Button>
          ))}
        </div>

        <div className="space-y-2">
          <Textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="e.g. Generate a furniture promotion for customers interested in office setups…"
            rows={3}
          />
          <Button
            type="button"
            disabled={loading || !customPrompt.trim()}
            onClick={() => void runGenerate({ kind: "custom", label: "Custom" })}
          >
            {loading && activePreset === "Custom" ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 size-4" />
            )}
            Generate from prompt
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
