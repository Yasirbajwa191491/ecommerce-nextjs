"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { format } from "date-fns";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  AdminListToolbar,
  type StatusTab,
} from "@/components/admin/admin-list-toolbar";
import { AdminTableCard } from "@/components/admin/admin-table-card";
import { DeleteConfirmDialog } from "@/components/admin/delete-confirm-dialog";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  PROMOTION_TYPE_FILTER_OPTIONS,
  promotionStatusLabel,
  promotionTypeFilterLabel,
  promotionTypeLabel,
  type PromotionType,
  type PromotionTypeFilter,
} from "@/lib/admin/promotion-labels";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { Pencil, RotateCcw, Trash2 } from "lucide-react";

const PAGE_SIZE = 15;

export default function AdminPromotionsPage() {
  const router = useRouter();
  const counts = useQuery(api.productPromotions.countByStatus);
  const [activeTab, setActiveTab] = useState<StatusTab>("active");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<PromotionTypeFilter>("all");
  const [deactivateId, setDeactivateId] = useState<Id<"productPromotions"> | null>(
    null
  );
  const [restoreId, setRestoreId] = useState<Id<"productPromotions"> | null>(
    null
  );
  const [saving, setSaving] = useState(false);

  const { results, status, loadMore } = usePaginatedQuery(
    api.productPromotions.listPaginated,
    {
      search: search || undefined,
      status: activeTab,
      type:
        typeFilter === "all"
          ? undefined
          : (typeFilter as PromotionType),
    },
    { initialNumItems: PAGE_SIZE }
  );

  const deactivate = useMutation(api.productPromotions.deactivate);
  const activate = useMutation(api.productPromotions.activate);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleDeactivate = async () => {
    if (!deactivateId) return;
    setSaving(true);
    try {
      await deactivate({ id: deactivateId });
      toastSuccess("Promotion moved to inactive");
      setDeactivateId(null);
    } catch (e) {
      toastError(e, { title: "Couldn't deactivate promotion" });
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreId) return;
    setSaving(true);
    try {
      await activate({ id: restoreId });
      toastSuccess("Promotion restored to active");
      setRestoreId(null);
    } catch (e) {
      toastError(e, { title: "Couldn't restore promotion" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AdminPageHeader
        title="Promotions"
        description="Manage BOGO, free gifts, and cross-product promotions."
      />

      <AdminListToolbar
        activeTab={activeTab}
        onActiveTabChange={(value) => setActiveTab(value as StatusTab)}
        counts={counts ?? undefined}
        search={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search promotions"
        filters={
          <Select
            value={typeFilter}
            onValueChange={(value) =>
              setTypeFilter((value ?? "all") as PromotionTypeFilter)
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Type">
                {promotionTypeFilterLabel(typeFilter)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              className="min-w-[12rem]"
              alignItemWithTrigger={false}
            >
              {PROMOTION_TYPE_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        actionLabel="Create promotion"
        onAction={() => router.push("/admin/promotions/new")}
      />

      <AdminTableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Buy product</TableHead>
              <TableHead>Free product</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Performance</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {status === "LoadingFirstPage" ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <Skeleton className="h-10 w-full" />
                </TableCell>
              </TableRow>
            ) : results.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  {search || typeFilter !== "all"
                    ? "No promotions match your search or filters"
                    : `No ${activeTab} promotions yet`}
                </TableCell>
              </TableRow>
            ) : (
              results.map((promo) => (
                <TableRow key={promo._id}>
                  <TableCell className="font-medium">{promo.name}</TableCell>
                  <TableCell>{promotionTypeLabel(promo.type)}</TableCell>
                  <TableCell>{promo.buyProductName}</TableCell>
                  <TableCell>{promo.getProductName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(promo.startAt, "MMM d")} –{" "}
                    {format(promo.endAt, "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={promo.status === "active" ? "default" : "secondary"}
                    >
                      {promotionStatusLabel(promo.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {promo.ordersCount} orders · {promo.viewCount} views
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <ButtonLink
                        variant="ghost"
                        size="icon"
                        href={`/admin/promotions/${promo._id}/edit`}
                        aria-label="Edit promotion"
                      >
                        <Pencil className="size-4" />
                      </ButtonLink>
                      {activeTab === "active" ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeactivateId(promo._id)}
                          aria-label="Move to inactive"
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setRestoreId(promo._id)}
                          aria-label="Restore to active"
                        >
                          <RotateCcw className="size-4 text-emerald-600" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </AdminTableCard>

      {status === "CanLoadMore" ? (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" size="sm" onClick={() => loadMore(PAGE_SIZE)}>
            Load more
          </Button>
        </div>
      ) : null}

      <DeleteConfirmDialog
        open={!!deactivateId}
        onOpenChange={(open) => !open && setDeactivateId(null)}
        onConfirm={handleDeactivate}
        loading={saving}
        title="Move promotion to inactive?"
        description="This promotion will be hidden from the store. You can restore it later from the Inactive tab."
        confirmLabel="Move to inactive"
        loadingLabel="Moving…"
      />

      <DeleteConfirmDialog
        open={!!restoreId}
        onOpenChange={(open) => !open && setRestoreId(null)}
        onConfirm={handleRestore}
        loading={saving}
        title="Restore promotion?"
        description="This promotion will be moved back to the Active tab and shown in the store again."
        confirmLabel="Restore"
        loadingLabel="Restoring…"
        confirmVariant="default"
      />
    </>
  );
}
