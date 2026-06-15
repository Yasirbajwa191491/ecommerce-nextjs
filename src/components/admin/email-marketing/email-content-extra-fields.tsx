"use client";

import { useState } from "react";
import { AdminFormField } from "@/components/admin/admin-form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles } from "lucide-react";
import {
  CtaGeneratorDialog,
  SubjectLineOptimizerDialog,
} from "./subject-line-optimizer-dialog";

type EmailContentExtraFieldsProps = {
  subject: string;
  onSubjectChange: (value: string) => void;
  headline: string;
  onHeadlineChange: (value: string) => void;
  previewText: string;
  onPreviewTextChange: (value: string) => void;
  ctaText: string;
  onCtaTextChange: (value: string) => void;
  productPromoText: string;
  onProductPromoTextChange: (value: string) => void;
  campaignName?: string;
  disabled?: boolean;
};

export function EmailContentExtraFields({
  subject,
  onSubjectChange,
  headline,
  onHeadlineChange,
  previewText,
  onPreviewTextChange,
  ctaText,
  onCtaTextChange,
  productPromoText,
  onProductPromoTextChange,
  campaignName,
  disabled,
}: EmailContentExtraFieldsProps) {
  const [subjectDialogOpen, setSubjectDialogOpen] = useState(false);
  const [ctaDialogOpen, setCtaDialogOpen] = useState(false);

  return (
    <>
      <AdminFormField label="Email Subject" required>
        <div className="flex gap-2">
          <Input
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
            disabled={disabled}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => setSubjectDialogOpen(true)}
          >
            <Sparkles className="mr-1 size-3.5" />
            Improve Subject Line
          </Button>
        </div>
      </AdminFormField>

      <AdminFormField label="Headline">
        <Input
          value={headline}
          onChange={(e) => onHeadlineChange(e.target.value)}
          disabled={disabled}
          placeholder="Main email headline"
        />
      </AdminFormField>

      <AdminFormField label="Preview Text" description="Shown in inbox preview (not the subject).">
        <Input
          value={previewText}
          onChange={(e) => onPreviewTextChange(e.target.value)}
          disabled={disabled}
          placeholder="Inbox preview snippet"
        />
      </AdminFormField>

      <AdminFormField label="Call To Action">
        <div className="flex gap-2">
          <Input
            value={ctaText}
            onChange={(e) => onCtaTextChange(e.target.value)}
            disabled={disabled}
            placeholder="Shop Now"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => setCtaDialogOpen(true)}
          >
            <Sparkles className="mr-1 size-3.5" />
            Generate CTA
          </Button>
        </div>
      </AdminFormField>

      <AdminFormField label="Product Promo Text" description="Short blurb above attached products.">
        <Textarea
          value={productPromoText}
          onChange={(e) => onProductPromoTextChange(e.target.value)}
          disabled={disabled}
          rows={2}
          placeholder="Upgrade your workspace with our most popular pieces…"
        />
      </AdminFormField>

      <SubjectLineOptimizerDialog
        open={subjectDialogOpen}
        onOpenChange={setSubjectDialogOpen}
        subject={subject}
        campaignName={campaignName}
        onSelect={onSubjectChange}
      />

      <CtaGeneratorDialog
        open={ctaDialogOpen}
        onOpenChange={setCtaDialogOpen}
        campaignName={campaignName}
        subject={subject}
        onSelect={onCtaTextChange}
      />
    </>
  );
}
