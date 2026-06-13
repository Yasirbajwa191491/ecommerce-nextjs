"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { DeleteConfirmDialog } from "@/components/admin/delete-confirm-dialog";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { ExternalLink, Phone, RotateCcw, ScrollText } from "lucide-react";

function formatDateTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function formatDuration(ms: number | undefined) {
  if (ms === undefined || ms < 0) return "—";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  calling: "Calling",
  completed: "Completed",
  failed: "Failed",
  no_answer: "No answer",
  busy: "Busy",
  cancelled: "Cancelled",
};

function statusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "completed") return "default";
  if (status === "calling" || status === "pending") return "secondary";
  if (status === "failed" || status === "no_answer" || status === "busy") {
    return "destructive";
  }
  return "outline";
}

type ReviewCollectionPanelProps = {
  orderId: Id<"orders">;
  orderNumber: string;
  orderStatus: string;
  compact?: boolean;
};

export function ReviewCollectionPanel({
  orderId,
  orderNumber,
  orderStatus,
  compact = false,
}: ReviewCollectionPanelProps) {
  const callData = useQuery(api.reviewCalls.getByOrderId, { orderId });
  const eligibility = useQuery(api.reviewCalls.getCallEligibility, { orderId });
  const startReviewCall = useMutation(api.reviewCalls.startReviewCall);
  const retryReviewCall = useMutation(api.reviewCalls.retryReviewCall);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [retryMode, setRetryMode] = useState(false);

  if (orderStatus !== "delivered") {
    return null;
  }

  const loading = callData === undefined || eligibility === undefined;
  const latest = callData?.latest ?? null;

  const handleConfirm = async () => {
    setIsStarting(true);
    try {
      if (retryMode) {
        await retryReviewCall({ orderId });
        toastSuccess("Review call retry started");
      } else {
        await startReviewCall({ orderId });
        toastSuccess("Review collection call started");
      }
      setConfirmOpen(false);
    } catch (error) {
      toastError(
        error instanceof Error ? error.message : "Failed to start review call"
      );
    } finally {
      setIsStarting(false);
    }
  };

  const openCallDialog = (retry: boolean) => {
    setRetryMode(retry);
    setConfirmOpen(true);
  };

  if (compact) {
    if (loading) return null;
    if (!eligibility?.canCall) return null;

    return (
      <>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Collect review via call"
          title="Collect review"
          onClick={() => openCallDialog(eligibility.canRetry)}
        >
          <Phone className="size-4" />
        </Button>
        <DeleteConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={retryMode ? "Retry review call?" : "Start review collection call?"}
          description={
            retryMode
              ? `Place another outbound call to collect reviews for order ${orderNumber}?`
              : `Start an AI outbound call to collect product reviews for order ${orderNumber}?`
          }
          confirmLabel={retryMode ? "Retry call" : "Start call"}
          loading={isStarting}
          loadingLabel="Starting..."
          confirmVariant="default"
          onConfirm={handleConfirm}
        />
      </>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review Collection</CardTitle>
        <CardDescription>
          AI-powered outbound calls to collect verified product reviews.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        ) : (
          <>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="flex justify-between gap-4 sm:flex-col sm:justify-start">
                <span className="text-muted-foreground">Call status</span>
                {latest ? (
                  <Badge variant={statusVariant(latest.status)}>
                    {STATUS_LABELS[latest.status] ?? latest.status}
                  </Badge>
                ) : (
                  <span>Not started</span>
                )}
              </div>
              <div className="flex justify-between gap-4 sm:flex-col sm:justify-start">
                <span className="text-muted-foreground">Last call</span>
                <span>
                  {latest?.startedAt
                    ? formatDateTime(latest.startedAt)
                    : latest
                      ? formatDateTime(latest.createdAt)
                      : "—"}
                </span>
              </div>
              <div className="flex justify-between gap-4 sm:flex-col sm:justify-start">
                <span className="text-muted-foreground">Duration</span>
                <span>{formatDuration(latest?.duration)}</span>
              </div>
              <div className="flex justify-between gap-4 sm:flex-col sm:justify-start">
                <span className="text-muted-foreground">Reviews collected</span>
                <span>{latest?.reviewsCollectedCount ?? 0}</span>
              </div>
            </div>

            {latest?.endedReason &&
            (latest.status === "failed" ||
              latest.status === "no_answer" ||
              latest.status === "busy") ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <p className="mb-1 text-xs font-medium text-destructive">
                  {latest.status === "failed" ? "Call failed" : "Call issue"}
                </p>
                <p className="text-sm text-muted-foreground">{latest.endedReason}</p>
              </div>
            ) : null}

            {latest?.transcript ? (
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Transcript preview
                </p>
                <p className="line-clamp-3 whitespace-pre-wrap text-sm">
                  {latest.transcript}
                </p>
              </div>
            ) : null}

            {!eligibility?.canCall && eligibility?.reason ? (
              <p className="text-sm text-muted-foreground">{eligibility.reason}</p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {eligibility?.canCall ? (
                <Button
                  type="button"
                  variant="default"
                  className="gap-2"
                  onClick={() =>
                    openCallDialog(Boolean(eligibility.canRetry))
                  }
                >
                  {eligibility.canRetry ? (
                    <>
                      <RotateCcw className="size-4" />
                      Retry call
                    </>
                  ) : (
                    <>
                      <Phone className="size-4" />
                      Collect review
                    </>
                  )}
                </Button>
              ) : null}

              {latest?.transcript ? (
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => setTranscriptOpen(true)}
                >
                  <ScrollText className="size-4" />
                  View transcript
                </Button>
              ) : null}

              {(latest?.reviewsCollectedCount ?? 0) > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  render={
                    <Link
                      href={`/admin/reviews?orderNumber=${encodeURIComponent(orderNumber)}`}
                    />
                  }
                >
                  <ExternalLink className="size-4" />
                  View reviews
                </Button>
              ) : null}
            </div>
          </>
        )}
      </CardContent>

      <DeleteConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={retryMode ? "Retry review call?" : "Start review collection call?"}
        description={
          retryMode
            ? `Place another outbound call to collect reviews for order ${orderNumber}? Attempt ${(eligibility?.attemptCount ?? 0) + 1} of 3.`
            : `Start an AI outbound call to collect product reviews for order ${orderNumber}? The customer will be asked for permission before any questions.`
        }
        confirmLabel={retryMode ? "Retry call" : "Start call"}
        loading={isStarting}
        loadingLabel="Starting..."
        confirmVariant="default"
        onConfirm={handleConfirm}
      />

      <Dialog open={transcriptOpen} onOpenChange={setTranscriptOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Call transcript — {orderNumber}</DialogTitle>
          </DialogHeader>
          <pre className="whitespace-pre-wrap text-sm leading-relaxed">
            {latest?.transcript ?? "No transcript available."}
          </pre>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
