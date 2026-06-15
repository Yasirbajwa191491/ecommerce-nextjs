"use client";

import { useState } from "react";
import { useAction } from "convex/react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toastError } from "@/lib/app-toast";
import { Loader2 } from "lucide-react";

type SubjectLineOptimizerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: string;
  campaignName?: string;
  onSelect: (subject: string) => void;
};

export function SubjectLineOptimizerDialog({
  open,
  onOpenChange,
  subject,
  campaignName,
  onSelect,
}: SubjectLineOptimizerDialogProps) {
  const optimize = useAction(api.emailCampaignAi.optimizeSubjectLine);
  const [loading, setLoading] = useState(false);
  const [variants, setVariants] = useState<{
    highOpen: string;
    short: string;
    promotional: string;
  } | null>(null);

  const handleOpen = async (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) return;
    if (!subject.trim()) {
      toastError("Enter a subject line first.");
      onOpenChange(false);
      return;
    }
    setLoading(true);
    setVariants(null);
    try {
      const result = await optimize({ subject, campaignName });
      setVariants(result);
    } catch (error) {
      toastError(error, { title: "Subject optimization failed" });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Improve Subject Line</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : variants ? (
          <div className="space-y-3">
            {(
              [
                ["High open rate", variants.highOpen],
                ["Short version", variants.short],
                ["Promotional", variants.promotional],
              ] as const
            ).map(([label, text]) => (
              <button
                key={label}
                type="button"
                className="w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
                onClick={() => {
                  onSelect(text);
                  onOpenChange(false);
                }}
              >
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <p className="mt-1 text-sm font-medium">{text}</p>
              </button>
            ))}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

type CtaGeneratorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignName?: string;
  subject?: string;
  onSelect: (cta: string) => void;
};

export function CtaGeneratorDialog({
  open,
  onOpenChange,
  campaignName,
  subject,
  onSelect,
}: CtaGeneratorDialogProps) {
  const generateCta = useAction(api.emailCampaignAi.generateCta);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<string[]>([]);

  const handleOpen = async (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) return;
    setLoading(true);
    setOptions([]);
    try {
      const result = await generateCta({ campaignName, subject });
      setOptions(result.options);
    } catch (error) {
      toastError(error, { title: "CTA generation failed" });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate CTA</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            {options.map((option) => (
              <Button
                key={option}
                type="button"
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  onSelect(option);
                  onOpenChange(false);
                }}
              >
                {option}
              </Button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
