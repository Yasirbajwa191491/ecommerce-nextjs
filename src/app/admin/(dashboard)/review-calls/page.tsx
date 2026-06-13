"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  AdminReviewCallFilters,
  emptyReviewCallFilters,
  toReviewCallFilterArgs,
  type ReviewCallListFilters,
} from "@/components/admin/admin-review-call-filters";
import { AdminListToolbar } from "@/components/admin/admin-list-toolbar";
import { AdminTableCard } from "@/components/admin/admin-table-card";
import { AdminTableInfiniteScroll } from "@/components/admin/admin-table-infinite-scroll";
import { DeleteConfirmDialog } from "@/components/admin/delete-confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  calling: "Calling",
  completed: "Completed",
  failed: "Failed",
  no_answer: "No answer",
  busy: "Busy",
  cancelled: "Cancelled",
};

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
    <Card className="min-w-0 py-0 shadow-none">
      <CardContent className="p-3">
        <p className="truncate text-xs text-muted-foreground">{title}</p>
        {loading ? (
          <Skeleton className="mt-1 h-5 w-10" />
        ) : (
          <p className="mt-0.5 text-base font-semibold tabular-nums tracking-tight">
            {value ?? 0}
          </p>
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
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [filters, setFilters] = useState<ReviewCallListFilters>(
    emptyReviewCallFilters
  );
  const [transcriptCallId, setTranscriptCallId] = useState<Id<"review_calls"> | null>(
    null
  );
  const [retryOrderId, setRetryOrderId] = useState<Id<"orders"> | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const filterArgs = useMemo(() => toReviewCallFilterArgs(filters), [filters]);

  const listArgs = useMemo(
    () => ({
      status:
        statusFilter === "all"
          ? undefined
          : (statusFilter as Doc<"review_calls">["status"]),
      search: search.trim() || undefined,
      orderNumber: filterArgs.orderNumber,
      dateFrom: filterArgs.dateFrom,
      dateTo: filterArgs.dateTo,
    }),
    [statusFilter, search, filterArgs]
  );

  const analytics = useQuery(api.reviewCalls.getAnalytics, {
    dateFrom: filterArgs.dateFrom,
    dateTo: filterArgs.dateTo,
  });

  const { results, status, loadMore } = usePaginatedQuery(
    api.reviewCalls.listPaginated,
    listArgs,
    { initialNumItems: PAGE_SIZE }
  );

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

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

  const statusControl = (
    <div className="flex w-full min-w-0 flex-col gap-1 sm:w-auto">
      <Label htmlFor="review-calls-status-filter" className="sr-only">
        Call status
      </Label>
      <Select
        value={statusFilter}
        items={STATUS_OPTIONS}
        onValueChange={(value) => setStatusFilter(value ?? "all")}
      >
        <SelectTrigger
          id="review-calls-status-filter"
          className="h-9 w-full sm:w-[11rem]"
        >
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              label={option.label}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="min-w-0 space-y-6">
      <AdminPageHeader
        title="Review Calls"
        description="AI-powered outbound review collection calls and analytics."
      />

      <section
        aria-label="Review call metrics"
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7"
      >
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
            analytics ? formatDuration(analytics.averageDurationMs) : undefined
          }
          loading={!analytics}
        />
      </section>

      <AdminListToolbar
        hideTabs
        search={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search customer, phone, order"
        filters={
          <>
            {statusControl}
            <AdminReviewCallFilters
              filters={filters}
              onChange={setFilters}
              onClear={() => setFilters(emptyReviewCallFilters())}
            />
          </>
        }
      />

      <AdminTableCard>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[8rem]">Customer</TableHead>
                <TableHead className="min-w-[9rem]">Phone</TableHead>
                <TableHead className="min-w-[10rem]">Order</TableHead>
                <TableHead className="min-w-[6rem]">Status</TableHead>
                <TableHead className="min-w-[4.5rem]">Attempt</TableHead>
                <TableHead className="min-w-[5rem]">Duration</TableHead>
                <TableHead className="min-w-[4.5rem]">Reviews</TableHead>
                <TableHead className="min-w-[9rem]">Date</TableHead>
                <TableHead className="min-w-[6rem] text-right">Actions</TableHead>
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
                  <TableCell
                    colSpan={9}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No review calls found.
                  </TableCell>
                </TableRow>
              ) : (
                results.map((call) => (
                  <TableRow key={call._id}>
                    <TableCell className="font-medium">{call.customerName}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {call.customerPhone}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/orders/${call.orderId}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {call.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(call.status)}>
                        {STATUS_LABELS[call.status] ?? call.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{call.attemptNumber}</TableCell>
                    <TableCell>{formatDuration(call.duration)}</TableCell>
                    <TableCell>{call.reviewsCollectedCount}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDateTime(call.createdAt)}
                    </TableCell>
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
        </div>

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
        <DialogContent className="max-h-[85vh] w-[calc(100vw-1.5rem)] max-w-2xl overflow-y-auto">
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
