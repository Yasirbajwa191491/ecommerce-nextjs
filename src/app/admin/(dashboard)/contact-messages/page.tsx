"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminTableCard } from "@/components/admin/admin-table-card";
import { AdminTableInfiniteScroll } from "@/components/admin/admin-table-infinite-scroll";
import { DeleteConfirmDialog } from "@/components/admin/delete-confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { Eye, Mail, Trash2 } from "lucide-react";

type ContactMessage = Doc<"contactMessages">;

const ADMIN_LIST_PAGE_SIZE = 10;

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export default function AdminContactMessagesPage() {
  const counts = useQuery(api.contactMessages.count);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [deleteId, setDeleteId] = useState<Id<"contactMessages"> | null>(null);
  const [saving, setSaving] = useState(false);

  const { results, status, loadMore } = usePaginatedQuery(
    api.contactMessages.listPaginated,
    { search: search || undefined },
    { initialNumItems: ADMIN_LIST_PAGE_SIZE }
  );

  const markRead = useMutation(api.contactMessages.markRead);
  const remove = useMutation(api.contactMessages.remove);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const messages = results as ContactMessage[];
  const canLoadMore = status === "CanLoadMore";
  const isLoadingMore = status === "LoadingMore";

  const handleLoadMore = useCallback(() => {
    if (!canLoadMore) return;
    loadMore(ADMIN_LIST_PAGE_SIZE);
  }, [canLoadMore, loadMore]);

  const openMessage = async (message: ContactMessage) => {
    setSelected(message);
    if (!message.read) {
      try {
        await markRead({ id: message._id });
      } catch {
        // Non-blocking if mark-read fails
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      await remove({ id: deleteId });
      toastSuccess("Message deleted");
      if (selected?._id === deleteId) setSelected(null);
      setDeleteId(null);
    } catch (error) {
      toastError(error, {
        title: "Couldn't delete message",
        fallback: "Failed to delete message. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AdminPageHeader
        title="Contact messages"
        description="Messages submitted from the store contact form."
      />

      <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">{counts?.total ?? 0} total</Badge>
          <Badge variant="outline">{counts?.unread ?? 0} unread</Badge>
        </div>
        <Input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search name, email, or message"
          className="h-10 w-full sm:max-w-xs"
        />
      </div>

      <AdminTableCard>
        <div className="overflow-x-auto">
          <Table className="min-w-[48rem]">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="hidden md:table-cell">Message</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {status === "LoadingFirstPage" ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : messages.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-muted-foreground"
                  >
                    {search
                      ? "No messages match your search"
                      : "No contact messages yet"}
                  </TableCell>
                </TableRow>
              ) : (
                messages.map((message) => (
                  <TableRow key={message._id}>
                    <TableCell className="font-medium">{message.name}</TableCell>
                    <TableCell>
                      <a
                        href={`mailto:${message.email}`}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {message.email}
                      </a>
                    </TableCell>
                    <TableCell className="hidden max-w-[16rem] truncate text-muted-foreground md:table-cell">
                      {message.message}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(message.submittedAt)}
                    </TableCell>
                    <TableCell>
                      {message.read ? (
                        <Badge variant="outline">Read</Badge>
                      ) : (
                        <Badge className="bg-[#6254f3]/10 text-[#6254f3] hover:bg-[#6254f3]/10">
                          New
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="View message"
                          onClick={() => void openMessage(message)}
                        >
                          <Eye className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Delete message"
                          onClick={() => setDeleteId(message._id)}
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
        </div>
      </AdminTableCard>

      <AdminTableInfiniteScroll
        enabled={canLoadMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={handleLoadMore}
      />

      <Dialog
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="size-4 text-[#6254f3]" />
              Message from {selected?.name}
            </DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4 py-1">
              <div className="grid gap-1 text-sm">
                <p className="text-muted-foreground">Email</p>
                <a
                  href={`mailto:${selected.email}`}
                  className="font-medium text-foreground hover:text-[#6254f3]"
                >
                  {selected.email}
                </a>
              </div>
              <div className="grid gap-1 text-sm">
                <p className="text-muted-foreground">Submitted</p>
                <p className="font-medium">{formatDate(selected.submittedAt)}</p>
              </div>
              <div className="grid gap-2 text-sm">
                <p className="text-muted-foreground">Message</p>
                <p className="rounded-lg border bg-muted/30 p-4 leading-relaxed whitespace-pre-wrap">
                  {selected.message}
                </p>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Close
            </Button>
            {selected ? (
              <Button
                render={<a href={`mailto:${selected.email}`} />}
                className="bg-[#6254f3] hover:bg-[#5548e0]"
              >
                Reply by email
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        loading={saving}
        title="Delete message?"
        description="This contact message will be permanently removed."
      />
    </>
  );
}
