"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, usePaginatedQuery } from "convex/react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, Eye, RefreshCw, Trash2 } from "lucide-react";
import { toastError, toastSuccess } from "@/lib/app-toast";

const PAGE_SIZE = 10;

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  scheduled: "outline",
  sending: "default",
  sent: "default",
  failed: "destructive",
};

export default function EmailCampaignsPage() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<Id<"emailCampaigns"> | null>(null);

  const { results, status, loadMore } = usePaginatedQuery(
    api.emailCampaigns.listPaginated,
    { search: search || undefined },
    { initialNumItems: PAGE_SIZE }
  );

  const duplicate = useMutation(api.emailCampaigns.duplicate);
  const resendFailed = useMutation(api.emailCampaigns.resendFailed);
  const remove = useMutation(api.emailCampaigns.remove);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleDuplicate = async (id: Id<"emailCampaigns">) => {
    try {
      const newId = await duplicate({ id });
      toastSuccess("Campaign duplicated");
      router.push(`/admin/email-marketing/campaigns/${newId}`);
    } catch (error) {
      toastError(error, { title: "Duplicate failed" });
    }
  };

  const handleResend = async (id: Id<"emailCampaigns">) => {
    try {
      const result = await resendFailed({ id });
      toastSuccess("Resending to failed recipients", {
        description: `${result.recipientCount} recipients queued.`,
      });
    } catch (error) {
      toastError(error, { title: "Resend failed" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await remove({ id: deleteId });
      toastSuccess("Campaign deleted");
      setDeleteId(null);
    } catch (error) {
      toastError(error, { title: "Delete failed" });
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Campaigns"
        description="View campaign history and manage promotional email sends."
      />

      <AdminListToolbar
        hideTabs
        search={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search campaigns..."
        actionLabel="Create campaign"
        onAction={() => router.push("/admin/email-marketing/campaigns/create")}
      />

      <AdminTableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Sent Date</TableHead>
              <TableHead>Recipients</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {status === "LoadingFirstPage"
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : results.map((campaign) => (
                  <TableRow key={campaign._id}>
                    <TableCell className="font-medium">{campaign.name}</TableCell>
                    <TableCell>{campaign.subject}</TableCell>
                    <TableCell>
                      {campaign.sentAt
                        ? format(campaign.sentAt, "MMM d, yyyy HH:mm")
                        : "—"}
                    </TableCell>
                    <TableCell>{campaign.recipientCount}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[campaign.status] ?? "secondary"}>
                        {campaign.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          render={<Link href={`/admin/email-marketing/campaigns/${campaign._id}`} />}
                        >
                          <Eye className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDuplicate(campaign._id)}
                        >
                          <Copy className="size-4" />
                        </Button>
                        {(campaign.status === "sent" || campaign.status === "failed") && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleResend(campaign._id)}
                          >
                            <RefreshCw className="size-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeleteId(campaign._id)}
                          disabled={campaign.status === "sending"}
                        >
                          <Trash2 className="size-4" />
                        </Button>
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

      <DeleteConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete campaign?"
        description="This campaign and its recipient records will be permanently deleted."
      />
    </div>
  );
}
