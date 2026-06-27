"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminTableCard } from "@/components/admin/admin-table-card";
import { AdminTableInfiniteScroll } from "@/components/admin/admin-table-infinite-scroll";
import { DeleteConfirmDialog } from "@/components/admin/delete-confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductStars } from "@/components/products/product-stars";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertTriangle,
  Check,
  Eye,
  Smile,
  Frown,
  Meh,
  Trash2,
  X,
} from "lucide-react";

type ReviewRow = Doc<"productReviews"> & {
  productName: string;
  orderNumber: string;
};

const PAGE_SIZE = 10;

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export default function AdminReviewsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "pending" | "approved">("all");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [deleteId, setDeleteId] = useState<Id<"productReviews"> | null>(null);
  const [selected, setSelected] = useState<Set<Id<"productReviews">>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [saving, setSaving] = useState(false);

  const { results, status: loadStatus, loadMore } = usePaginatedQuery(
    api.adminReviews.listPaginated,
    {
      status: status === "all" ? undefined : status,
      search: search || undefined,
      flaggedOnly: flaggedOnly || undefined,
    },
    { initialNumItems: PAGE_SIZE }
  );

  const approve = useMutation(api.adminReviews.approve);
  const reject = useMutation(api.adminReviews.reject);
  const remove = useMutation(api.adminReviews.remove);
  const bulkReprocess = useMutation(api.adminReviewAi.bulkReprocessReviews);
  const queueStats = useQuery(api.adminReviewAi.getQueueStats);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const reviews = results as ReviewRow[];
  const canLoadMore = loadStatus === "CanLoadMore";

  const handleLoadMore = useCallback(() => {
    if (!canLoadMore) return;
    loadMore(PAGE_SIZE);
  }, [canLoadMore, loadMore]);

  const handleApprove = async (id: Id<"productReviews">) => {
    try {
      await approve({ id });
      toastSuccess("Review approved");
    } catch (error) {
      toastError(error, { title: "Couldn't approve review" });
    }
  };

  const handleReject = async (id: Id<"productReviews">) => {
    try {
      await reject({ id });
      toastSuccess("Review rejected");
    } catch (error) {
      toastError(error, { title: "Couldn't reject review" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      await remove({ id: deleteId });
      toastSuccess("Review deleted");
      setDeleteId(null);
    } catch (error) {
      toastError(error, { title: "Couldn't delete review" });
    } finally {
      setSaving(false);
    }
  };

  const toggleSelect = (id: Id<"productReviews">) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkReprocess = async () => {
    if (selected.size === 0) return;
    setBulkProcessing(true);
    try {
      const result = await bulkReprocess({
        reviewIds: [...selected],
      });
      toastSuccess(`Queued ${result.enqueued} reviews for reprocessing`);
      setSelected(new Set());
    } catch (error) {
      toastError(error, { title: "Bulk reprocess failed" });
    } finally {
      setBulkProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Reviews"
        description="Moderate customer product reviews before they appear on the storefront."
      />

      {queueStats &&
      (queueStats.pending > 0 ||
        queueStats.retryScheduled > 0 ||
        queueStats.processing > 0) ? (
        <div className="flex flex-wrap gap-2 text-sm">
          {queueStats.processing > 0 ? (
            <Badge variant="secondary">{queueStats.processing} AI processing</Badge>
          ) : null}
          {queueStats.pending > 0 ? (
            <Badge variant="outline">{queueStats.pending} AI queued</Badge>
          ) : null}
          {queueStats.retryScheduled > 0 ? (
            <Badge variant="outline">{queueStats.retryScheduled} AI retry scheduled</Badge>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Search reviews…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="max-w-sm"
        />
        <Select
          value={status}
          onValueChange={(v) =>
            setStatus(v as "all" | "pending" | "approved")
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All reviews</SelectItem>
            <SelectItem value="pending">Pending approval</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Switch
            id="flagged-only"
            checked={flaggedOnly}
            onCheckedChange={setFlaggedOnly}
          />
          <Label htmlFor="flagged-only">Flagged by AI</Label>
        </div>
        {selected.size > 0 ? (
          <Button
            variant="outline"
            disabled={bulkProcessing}
            onClick={() => void handleBulkReprocess()}
          >
            Reprocess Selected ({selected.size})
          </Button>
        ) : null}
      </div>

      <AdminTableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Product</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>AI</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Verified</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reviews.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                  No reviews found.
                </TableCell>
              </TableRow>
            ) : (
              reviews.map((review) => (
                <TableRow key={review._id}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(review._id)}
                      onCheckedChange={() => toggleSelect(review._id)}
                      aria-label={`Select review ${review.title}`}
                    />
                  </TableCell>
                  <TableCell className="max-w-[160px] truncate font-medium">
                    {review.productName}
                  </TableCell>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{review.customerName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {review.customerEmail}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <ProductStars rating={review.rating} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {review.aiSentiment === "positive" ? (
                        <Smile className="size-4 text-emerald-600" aria-label="Positive" />
                      ) : review.aiSentiment === "negative" ? (
                        <Frown className="size-4 text-rose-600" aria-label="Negative" />
                      ) : review.aiSentiment === "neutral" ? (
                        <Meh className="size-4 text-slate-500" aria-label="Neutral" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                      {review.aiModeration?.flagged ? (
                        <AlertTriangle
                          className="size-4 text-amber-600"
                          aria-label="Flagged"
                        />
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {review.title}
                  </TableCell>
                  <TableCell>
                    {review.isVerifiedPurchase ? (
                      <Badge variant="secondary">Verified</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {review.isApproved ? (
                      <Badge className="bg-emerald-600">Approved</Badge>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDate(review.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        render={<Link href={`/admin/reviews/${review._id}`} />}
                        aria-label="View review"
                      >
                        <Eye className="size-4" />
                      </Button>
                      {!review.isApproved ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => void handleApprove(review._id)}
                          aria-label="Approve review"
                        >
                          <Check className="size-4 text-emerald-600" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => void handleReject(review._id)}
                          aria-label="Reject review"
                        >
                          <X className="size-4 text-amber-600" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleteId(review._id)}
                        aria-label="Delete review"
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <AdminTableInfiniteScroll
          enabled={canLoadMore}
          isLoadingMore={loadStatus === "LoadingMore"}
          onLoadMore={handleLoadMore}
        />
      </AdminTableCard>

      <DeleteConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete review"
        description="This permanently removes the review. Product ratings will be recalculated."
        onConfirm={() => void handleDelete()}
        loading={saving}
      />
    </div>
  );
}
