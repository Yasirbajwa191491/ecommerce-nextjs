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
import { Copy, Eye, Pencil, Trash2 } from "lucide-react";
import { toastError, toastSuccess } from "@/lib/app-toast";

const PAGE_SIZE = 10;

export default function EmailTemplatesPage() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<Id<"emailTemplates"> | null>(null);

  const { results, status, loadMore } = usePaginatedQuery(
    api.emailTemplates.listPaginated,
    { search: search || undefined },
    { initialNumItems: PAGE_SIZE }
  );

  const duplicate = useMutation(api.emailTemplates.duplicate);
  const remove = useMutation(api.emailTemplates.remove);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleDuplicate = async (id: Id<"emailTemplates">) => {
    try {
      const newId = await duplicate({ id });
      toastSuccess("Template duplicated");
      router.push(`/admin/email-marketing/templates/${newId}`);
    } catch (error) {
      toastError(error, { title: "Duplicate failed" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await remove({ id: deleteId });
      toastSuccess("Template deleted");
      setDeleteId(null);
    } catch (error) {
      toastError(error, { title: "Delete failed" });
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Email Templates"
        description="Reusable email layouts for newsletters and promotional campaigns."
      />

      <AdminListToolbar
        hideTabs
        search={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search templates..."
        actionLabel="Create template"
        onAction={() => router.push("/admin/email-marketing/templates/create")}
      />

      <AdminTableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Updated</TableHead>
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
              : results.map((template) => (
                  <TableRow key={template._id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell>{template.subject}</TableCell>
                    <TableCell>{format(template.createdAt, "MMM d, yyyy")}</TableCell>
                    <TableCell>{format(template.updatedAt, "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant={template.status === "active" ? "default" : "secondary"}>
                        {template.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          render={<Link href={`/admin/email-marketing/templates/${template._id}`} />}
                        >
                          <Eye className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          render={
                            <Link href={`/admin/email-marketing/templates/${template._id}?edit=1`} />
                          }
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDuplicate(template._id)}
                        >
                          <Copy className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeleteId(template._id)}
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
        title="Delete template?"
        description="This template will be permanently deleted."
      />
    </div>
  );
}
