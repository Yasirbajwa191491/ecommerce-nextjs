"use client";

import { useEffect, useState } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { format } from "date-fns";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminListToolbar } from "@/components/admin/admin-list-toolbar";
import { AdminTableCard } from "@/components/admin/admin-table-card";
import { AdminTableInfiniteScroll } from "@/components/admin/admin-table-infinite-scroll";
import { DeleteConfirmDialog } from "@/components/admin/delete-confirm-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Eye, RefreshCw, Trash2 } from "lucide-react";
import { toastError, toastSuccess } from "@/lib/app-toast";

const PAGE_SIZE = 10;

export default function EmailSubscribersPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "subscribed" | "unsubscribed">("all");
  const [viewId, setViewId] = useState<Id<"subscribers"> | null>(null);
  const [removeId, setRemoveId] = useState<Id<"subscribers"> | null>(null);
  const [exporting, setExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const segments = useQuery(api.subscriberInterests.listSegmentsWithCounts);
  const scheduleRecompute = useMutation(api.subscriberInterests.scheduleRecomputeAll);
  const subscriberDetail = useQuery(
    api.subscribers.getById,
    viewId ? { id: viewId } : "skip"
  );

  const { results, status, loadMore } = usePaginatedQuery(
    api.subscribers.listPaginated,
    {
      search: search || undefined,
      status: statusFilter,
    },
    { initialNumItems: PAGE_SIZE }
  );

  const removeSubscriber = useMutation(api.subscribers.removeSubscriber);
  const exportCsv = useMutation(api.subscribers.exportSubscribersCsv);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const viewedSubscriber = subscriberDetail ?? results.find((s) => s._id === viewId);

  const handleRefreshInterests = async () => {
    setRefreshing(true);
    try {
      await scheduleRecompute({});
      toastSuccess("Interest refresh started", {
        description: "Segments will update as profiles are recomputed.",
      });
    } catch (error) {
      toastError(error, { title: "Refresh failed" });
    } finally {
      setRefreshing(false);
    }
  };

  const handleRemove = async () => {
    if (!removeId) return;
    try {
      await removeSubscriber({ id: removeId });
      toastSuccess("Subscriber removed");
      setRemoveId(null);
    } catch (error) {
      toastError(error, { title: "Remove failed" });
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const csv = await exportCsv({
        status: statusFilter === "all" ? "all" : statusFilter,
      });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `subscribers-${format(new Date(), "yyyy-MM-dd")}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toastSuccess("CSV exported");
    } catch (error) {
      toastError(error, { title: "Export failed" });
    } finally {
      setExporting(false);
    }
  };

  const statusFilterLabel =
    statusFilter === "all"
      ? "All statuses"
      : statusFilter === "subscribed"
        ? "Subscribed"
        : "Unsubscribed";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Subscribers"
        description="Manage newsletter subscribers, search, and export your list."
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Audience Segments</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Auto-generated from order history linked by subscriber email.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshInterests}
            disabled={refreshing}
          >
            <RefreshCw className={`mr-1 size-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh Interests
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {segments === undefined
              ? Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))
              : segments.map((segment) => (
                  <div
                    key={segment.key}
                    className="rounded-lg border p-3"
                  >
                    <p className="font-medium">{segment.label}</p>
                    <p className="text-2xl font-semibold">{segment.count}</p>
                    <p className="text-xs text-muted-foreground">{segment.description}</p>
                  </div>
                ))}
          </div>
        </CardContent>
      </Card>

      <AdminListToolbar
        hideTabs
        search={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search by email..."
        filters={
          <div className="flex w-full min-w-0 flex-col gap-1 sm:w-auto">
            <Label htmlFor="subscriber-status-filter" className="sr-only">
              Subscriber status
            </Label>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
            >
              <SelectTrigger
                id="subscriber-status-filter"
                className="h-9 w-full sm:w-[11rem]"
              >
                <SelectValue>{statusFilterLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="subscribed">Subscribed</SelectItem>
                <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exporting}
          >
            <Download className="size-4" />
            {exporting ? "Exporting..." : "Export CSV"}
          </Button>
        }
      />

      <AdminTableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Subscription Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {status === "LoadingFirstPage"
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 4 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : results.map((subscriber) => (
                  <TableRow key={subscriber._id}>
                    <TableCell className="font-medium">{subscriber.email}</TableCell>
                    <TableCell>
                      {format(subscriber.subscribedAt, "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={subscriber.active ? "default" : "secondary"}
                      >
                        {subscriber.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setViewId(subscriber._id)}
                        >
                          <Eye className="size-4" />
                        </Button>
                        {subscriber.active ? (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setRemoveId(subscriber._id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
        <AdminTableInfiniteScroll
          enabled={status === "CanLoadMore"}
          isLoadingMore={status === "LoadingMore"}
          onLoadMore={() => loadMore(PAGE_SIZE)}
        />
      </AdminTableCard>

      <Dialog open={viewId !== null} onOpenChange={(open) => !open && setViewId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subscriber Details</DialogTitle>
          </DialogHeader>
          {viewedSubscriber ? (
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="font-medium">{viewedSubscriber.email}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd>{viewedSubscriber.status}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Subscribed</dt>
                <dd>{format(viewedSubscriber.subscribedAt, "PPpp")}</dd>
              </div>
              {viewedSubscriber.unsubscribedAt ? (
                <div>
                  <dt className="text-muted-foreground">Unsubscribed</dt>
                  <dd>{format(viewedSubscriber.unsubscribedAt, "PPpp")}</dd>
                </div>
              ) : null}
              {viewedSubscriber.source ? (
                <div>
                  <dt className="text-muted-foreground">Source</dt>
                  <dd>{viewedSubscriber.source}</dd>
                </div>
              ) : null}
              {subscriberDetail?.interestProfile ? (
                <>
                  <div>
                    <dt className="text-muted-foreground">Orders</dt>
                    <dd>{subscriberDetail.interestProfile.orderCount}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Total spent</dt>
                    <dd>${subscriberDetail.interestProfile.totalSpent.toFixed(2)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Interest tags</dt>
                    <dd className="flex flex-wrap gap-1 pt-1">
                      {subscriberDetail.interestProfile.interestTags.length > 0 ? (
                        subscriberDetail.interestProfile.interestTags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag.replace(/_/g, " ")}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground">None detected yet</span>
                      )}
                    </dd>
                  </div>
                </>
              ) : null}
            </dl>
          ) : (
            <Skeleton className="h-24 w-full" />
          )}
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={removeId !== null}
        onOpenChange={(open) => !open && setRemoveId(null)}
        onConfirm={handleRemove}
        title="Remove subscriber?"
        description="The subscriber will be marked as unsubscribed. Their record is kept for compliance."
      />
    </div>
  );
}
