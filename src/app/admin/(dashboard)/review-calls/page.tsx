"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminListToolbar } from "@/components/admin/admin-list-toolbar";
import { AdminTableCard } from "@/components/admin/admin-table-card";
import { AdminTableInfiniteScroll } from "@/components/admin/admin-table-infinite-scroll";
import { DeleteConfirmDialog } from "@/components/admin/delete-confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { ExternalLink, RotateCcw, ScrollText } from "lucide-react";

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "calling", label: "Calling" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "no_answer", label: "No answer" },
  { value: "busy", label: "Busy" },
  { value: "cancelled", label: "Cancelled" },
] as const;

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

function KpiCard({
  title,
  value,
  loading,
}: {
  title: string;
  value: string | number | undefined;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className="text-2xl font-semibold">{value ?? 0}</p>
        )}
      </CardContent>
    </Card>
  );
}

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

export default function AdminReviewCallsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [orderNumberFilter, setOrderNumberFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [transcriptCallId, setTranscriptCallId] = useState<Id<"review_calls"> | null>(
    null
  );
  const [retryOrderId, setRetryOrderId] = useState<Id<"orders"> | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const dateFromMs = dateFrom ? new Date(dateFrom).getTime() : undefined;
  const dateToMs = dateTo
    ? new Date(`${dateTo}T23:59:59.999`).getTime()
    : undefined;

  const listArgs = useMemo(
    () => ({
      status:
        statusFilter === "all"
          ? undefined
          : (statusFilter as Doc<"review_calls">["status"]),
      search: search.trim() || undefined,
      orderNumber: orderNumberFilter.trim() || undefined,
      dateFrom: dateFromMs,
      dateTo: dateToMs,
    }),
    [statusFilter, search, orderNumberFilter, dateFromMs, dateToMs]
  );

  const analytics = useQuery(api.reviewCalls.getAnalytics, {
    dateFrom: dateFromMs,
    dateTo: dateToMs,
  });

  const { results, status, loadMore } = usePaginatedQuery(
    api.reviewCalls.listPaginated,
    listArgs,
    { initialNumItems: PAGE_SIZE }
  );

  const transcriptDetail = useQuery(
    api.reviewCalls.getById,
    transcriptCallId ? { reviewCallId: transcriptCallId } : "skip"
  );

  const retryReviewCall = useMutation(api.reviewCalls.retryReviewCall);

  const canLoadMore = status === "CanLoadMore";
  const isLoadingMore = status === "LoadingMore";
  const isLoadingFirstPage = status === "LoadingFirstPage";

  const handleLoadMore = useCallback(() => {
    if (!canLoadMore) return;
    loadMore(PAGE_SIZE);
  }, [canLoadMore, loadMore]);

  const handleRetry = async () => {
    if (!retryOrderId) return;
    setIsRetrying(true);
    try {
      await retryReviewCall({ orderId: retryOrderId });
      toastSuccess("Review call retry started");
      setRetryOrderId(null);
    } catch (error) {
      toastError(
        error instanceof Error ? error.message : "Failed to retry review call"
      );
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Review Calls"
        description="AI-powered outbound review collection calls and analytics."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <KpiCard title="Total calls" value={analytics?.totalCalls} loading={!analytics} />
        <KpiCard
          title="Completed"
          value={analytics?.completedCalls}
          loading={!analytics}
        />
        <KpiCard title="Failed" value={analytics?.failedCalls} loading={!analytics} />
        <KpiCard
          title="No answer"
          value={analytics?.noAnswerCalls}
          loading={!analytics}
        />
        <KpiCard
          title="Reviews collected"
          value={analytics?.reviewsCollected}
          loading={!analytics}
        />
        <KpiCard
          title="Avg rating"
          value={analytics?.averageRating}
          loading={!analytics}
        />
        <KpiCard
          title="Avg duration"
          value={
            analytics
              ? formatDuration(analytics.averageDurationMs)
              : undefined
          }
          loading={!analytics}
        />
      </div>

      <AdminListToolbar
        hideTabs
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search customer, phone, order"
        filters={
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex min-w-[10rem] flex-col gap-1">
              <Label htmlFor="review-call-status">Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value ?? "all")}
              >
                <SelectTrigger id="review-call-status" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex min-w-[10rem] flex-col gap-1">
              <Label htmlFor="review-call-order">Order number</Label>
              <Input
                id="review-call-order"
                value={orderNumberFilter}
                onChange={(e) => setOrderNumberFilter(e.target.value)}
                placeholder="ORD-..."
                className="h-9"
              />
            </div>
            <div className="flex min-w-[10rem] flex-col gap-1">
              <Label htmlFor="review-call-from">From</Label>
              <Input
                id="review-call-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex min-w-[10rem] flex-col gap-1">
              <Label htmlFor="review-call-to">To</Label>
              <Input
                id="review-call-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        }
      />

      <AdminTableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Attempt</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Reviews</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingFirstPage ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  {Array.from({ length: 9 }).map((__, col) => (
                    <TableCell key={col}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : results.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  No review calls found.
                </TableCell>
              </TableRow>
            ) : (
              results.map((call) => (
                <TableRow key={call._id}>
                  <TableCell>{call.customerName}</TableCell>
                  <TableCell>{call.customerPhone}</TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/orders/${call.orderId}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {call.orderNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(call.status)}>{call.status}</Badge>
                  </TableCell>
                  <TableCell>{call.attemptNumber}</TableCell>
                  <TableCell>{formatDuration(call.duration)}</TableCell>
                  <TableCell>{call.reviewsCollectedCount}</TableCell>
                  <TableCell>{formatDateTime(call.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="View transcript"
                        onClick={() => setTranscriptCallId(call._id)}
                      >
                        <ScrollText className="size-4" />
                      </Button>
                      {call.reviewsCollectedCount > 0 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="View reviews"
                          render={
                            <Link
                              href={`/admin/reviews?orderNumber=${encodeURIComponent(call.orderNumber)}`}
                            />
                          }
                        >
                          <ExternalLink className="size-4" />
                        </Button>
                      ) : null}
                      {["failed", "no_answer", "busy", "cancelled"].includes(
                        call.status
                      ) ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Retry call"
                          onClick={() => setRetryOrderId(call.orderId)}
                        >
                          <RotateCcw className="size-4" />
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <AdminTableInfiniteScroll
          enabled={canLoadMore}
          isLoadingMore={isLoadingMore}
          onLoadMore={handleLoadMore}
        />
      </AdminTableCard>

      <Dialog
        open={transcriptCallId !== null}
        onOpenChange={(open) => !open && setTranscriptCallId(null)}
      >
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Transcript — {transcriptDetail?.orderNumber ?? "Call"}
            </DialogTitle>
          </DialogHeader>
          {transcriptDetail === undefined ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <pre className="whitespace-pre-wrap text-sm leading-relaxed">
              {transcriptDetail?.transcript ?? "No transcript available."}
            </pre>
          )}
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={retryOrderId !== null}
        onOpenChange={(open) => !open && setRetryOrderId(null)}
        title="Retry review call?"
        description="Place another outbound call to collect reviews for this order?"
        confirmLabel="Retry call"
        loading={isRetrying}
        loadingLabel="Starting..."
        confirmVariant="default"
        onConfirm={handleRetry}
      />
    </div>
  );
}
