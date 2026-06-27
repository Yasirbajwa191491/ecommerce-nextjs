"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { getFriendlyAiErrorMessage } from "@/lib/ai-error-messages";
import {
  AlertTriangle,
  Clock,
  Loader2,
  RefreshCw,
  Sparkles,
  Wand2,
} from "lucide-react";

type ReviewAiPanelProps = {
  review: Doc<"productReviews">;
};

type RegenerationMode = "replace" | "version" | "history_only";

const sentimentStyles = {
  positive: "bg-emerald-600",
  neutral: "bg-slate-500",
  negative: "bg-rose-600",
} as const;

export function ReviewAiPanel({ review }: ReviewAiPanelProps) {
  const [replyDraft, setReplyDraft] = useState(review.adminReplyDraft ?? "");
  const [generating, setGenerating] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [mode, setMode] = useState<RegenerationMode>("version");

  const retryAi = useMutation(api.adminReviews.retryAiAnalysis);
  const publishReply = useMutation(api.adminReviews.publishReply);
  const clearDraft = useMutation(api.adminReviews.clearReplyDraft);

  const triggerSentiment = useMutation(api.adminReviewAi.triggerSentimentGeneration);
  const triggerTags = useMutation(api.adminReviewAi.triggerTagsGeneration);
  const triggerReply = useMutation(api.adminReviewAi.triggerReplyGeneration);
  const triggerSummary = useMutation(api.adminReviewAi.triggerSummaryGeneration);
  const reprocessReview = useMutation(api.adminReviewAi.reprocessReview);
  const regenerateAll = useMutation(api.adminReviewAi.regenerateAll);

  useEffect(() => {
    setReplyDraft(review.adminReplyDraft ?? "");
  }, [review.adminReplyDraft]);

  const isAnalyzing =
    review.aiAnalysisStatus === "pending" ||
    review.aiAnalysisStatus === "processing";

  const isRetryScheduled = review.aiAnalysisStatus === "retry_scheduled";

  const friendlyError = getFriendlyAiErrorMessage(
    review.aiError,
    review.aiAnalysisStatus
  );

  const runAction = async (
    key: string,
    fn: () => Promise<unknown>,
    successMessage: string
  ) => {
    setGenerating(key);
    try {
      await fn();
      toastSuccess(successMessage);
    } catch (error) {
      toastError(error, { title: "AI action failed" });
    } finally {
      setGenerating(null);
    }
  };

  const handleRetry = () =>
    void runAction("retry", () => retryAi({ id: review._id }), "AI analysis queued");

  const handleGenerateReply = () =>
    void runAction(
      "reply",
      () => triggerReply({ reviewId: review._id, mode }),
      "Generating reply via n8n…"
    );

  const handlePublishReply = async () => {
    setPublishing(true);
    try {
      await publishReply({ id: review._id, reply: replyDraft });
      toastSuccess("Reply published");
    } catch (error) {
      toastError(error, { title: "Couldn't publish reply" });
    } finally {
      setPublishing(false);
    }
  };

  const handleClearDraft = async () => {
    try {
      await clearDraft({ id: review._id });
      setReplyDraft("");
      toastSuccess("Draft cleared");
    } catch (error) {
      toastError(error, { title: "Couldn't clear draft" });
    }
  };

  const modeArgs = { reviewId: review._id, mode };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4" />
          AI Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <Label htmlFor="regeneration-mode">Regeneration mode</Label>
            <Select
              value={mode}
              onValueChange={(v) => setMode(v as RegenerationMode)}
            >
              <SelectTrigger id="regeneration-mode" className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="version">Create new version</SelectItem>
                <SelectItem value="replace">Replace existing</SelectItem>
                <SelectItem value="history_only">Keep history only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <AiActionButton
            label="Generate Sentiment"
            loading={generating === "sentiment"}
            onClick={() =>
              runAction(
                "sentiment",
                () => triggerSentiment(modeArgs),
                "Sentiment generation queued"
              )
            }
          />
          <AiActionButton
            label="Generate AI Tags"
            loading={generating === "tags"}
            onClick={() =>
              runAction(
                "tags",
                () => triggerTags(modeArgs),
                "Tags generation queued"
              )
            }
          />
          <AiActionButton
            label="Generate Summary"
            loading={generating === "summary"}
            onClick={() =>
              runAction(
                "summary",
                () => triggerSummary(modeArgs),
                "Summary generation queued"
              )
            }
          />
          <AiActionButton
            label="Reprocess Review"
            loading={generating === "reprocess"}
            onClick={() =>
              runAction(
                "reprocess",
                () => reprocessReview(modeArgs),
                "Reprocess queued"
              )
            }
          />
          <AiActionButton
            label="Regenerate All"
            loading={generating === "all"}
            onClick={() =>
              runAction(
                "all",
                () => regenerateAll(modeArgs),
                "Full regeneration queued"
              )
            }
          />
        </div>

        {isAnalyzing ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            AI analysis in progress…
          </div>
        ) : null}

        {review.aiAnalysisStatus === "pending" && !isAnalyzing ? (
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-muted-foreground dark:border-slate-800 dark:bg-slate-950/30">
            <Clock className="size-4 shrink-0" />
            AI analysis queued…
          </div>
        ) : null}

        {isRetryScheduled ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-900 dark:bg-blue-950/30">
            <Clock className="size-4 shrink-0 text-blue-700 dark:text-blue-300" />
            <span className="text-blue-900 dark:text-blue-100">
              {friendlyError}
            </span>
            <Button size="sm" variant="outline" onClick={() => void handleRetry()}>
              <RefreshCw className="size-3.5" />
              Retry now
            </Button>
          </div>
        ) : null}

        {review.aiAnalysisStatus === "failed" ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/30">
            <span className="text-amber-800 dark:text-amber-200">
              {friendlyError}
            </span>
            <Button size="sm" variant="outline" onClick={() => void handleRetry()}>
              <RefreshCw className="size-3.5" />
              Retry
            </Button>
          </div>
        ) : null}

        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Sentiment</p>
          {review.aiSentiment ? (
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={sentimentStyles[review.aiSentiment]}>
                {review.aiSentiment}
              </Badge>
              {review.aiSentimentConfidence != null ? (
                <span className="text-sm text-muted-foreground">
                  {(review.aiSentimentConfidence * 100).toFixed(0)}% confidence
                </span>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Not analyzed yet</p>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">AI Tags</p>
          {review.aiTags?.length ? (
            <div className="flex flex-wrap gap-2">
              {review.aiTags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No tags generated</p>
          )}
        </div>

        {review.aiModeration?.flagged ? (
          <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-semibold">AI moderation warning</p>
              <p>{review.aiModeration.reason ?? "Flagged for review"}</p>
              <p className="mt-1 text-xs opacity-80">
                Advisory only — admin approval is still required.
              </p>
            </div>
          </div>
        ) : null}

        <div className="space-y-3 border-t pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">Admin reply</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleGenerateReply()}
              disabled={generating !== null}
            >
              {generating === "reply" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Wand2 className="size-3.5" />
              )}
              Generate AI Reply
            </Button>
          </div>
          {review.adminReplyError ? (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {getFriendlyAiErrorMessage(review.adminReplyError)}
            </p>
          ) : null}
          <Textarea
            value={replyDraft}
            onChange={(e) => setReplyDraft(e.target.value)}
            placeholder="Generate or write a professional reply…"
            rows={5}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => void handlePublishReply()}
              disabled={publishing || !replyDraft.trim()}
            >
              Publish Reply
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleClearDraft()}
              disabled={!replyDraft}
            >
              Discard Draft
            </Button>
          </div>
          {review.adminReplyPublished ? (
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <p className="font-medium text-muted-foreground">Published reply</p>
              <p className="mt-1 whitespace-pre-wrap">{review.adminReplyPublished}</p>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function AiActionButton({
  label,
  loading,
  onClick,
}: {
  label: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <Button size="sm" variant="outline" onClick={onClick} disabled={loading}>
      {loading ? <Loader2 className="size-3.5 animate-spin" /> : null}
      {label}
    </Button>
  );
}
