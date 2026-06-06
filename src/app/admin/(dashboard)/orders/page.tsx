"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Doc } from "../../../../../convex/_generated/dataModel";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminListToolbar } from "@/components/admin/admin-list-toolbar";
import {
  AdminOrderFilters,
  emptyOrderFilters,
  toOrderFilterArgs,
} from "@/components/admin/admin-order-filters";
import { AdminTableCard } from "@/components/admin/admin-table-card";
import { AdminTableInfiniteScroll } from "@/components/admin/admin-table-infinite-scroll";
import { ColumnVisibilityPanel } from "@/components/admin/column-visibility-panel";
import {
  OrderStatusBadge,
  PaymentMethodBadge,
  PaymentStatusBadge,
} from "@/components/admin/order-status-badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { useColumnVisibility } from "@/hooks/use-column-visibility";
import { formatCurrencyAmount } from "@/lib/currencies";
import { ORDER_STATUS_FILTER_OPTIONS } from "@/lib/admin/order-status-filter-options";
import {
  ORDER_COLUMNS_STORAGE_KEY,
  ORDER_SORT_OPTIONS,
  ORDER_TABLE_COLUMNS,
  type OrderSort,
} from "@/lib/admin/order-table-columns";
import type { OrderStatus } from "@/types/order";

import { Eye } from "lucide-react";

const ADMIN_LIST_PAGE_SIZE = 10;

function formatDateTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function LoadingFirstPage({ columnCount }: { columnCount: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: columnCount }).map((__, colIndex) => (
            <TableCell key={colIndex}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export default function AdminOrdersPage() {
  const counts = useQuery(api.adminOrders.countByStatus);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<OrderSort>("newest");
  const [filters, setFilters] = useState(emptyOrderFilters());

  const filterArgs = useMemo(() => toOrderFilterArgs(filters), [filters]);

  const {
    columns: tableColumns,
    visibility: columnVisibility,
    toggleColumn,
    isVisible: isColumnVisible,
  } = useColumnVisibility(ORDER_COLUMNS_STORAGE_KEY, ORDER_TABLE_COLUMNS);

  const visibleColumns = useMemo(
    () => tableColumns.filter((col) => isColumnVisible(col.id)),
    [tableColumns, isColumnVisible]
  );

  const listArgs = useMemo(
    () => ({
      status: filterArgs.filterOrderStatus,
      search: search || undefined,
      orderNumber: filterArgs.orderNumber,
      customerName: filterArgs.customerName,
      customerEmail: filterArgs.customerEmail,
      customerPhone: filterArgs.customerPhone,
      paymentStatus: filterArgs.paymentStatus,
      paymentMethod: filterArgs.paymentMethod,
      dateFrom: filterArgs.dateFrom,
      dateTo: filterArgs.dateTo,
      sort,
    }),
    [filterArgs, search, sort]
  );

  const { results, status, loadMore } = usePaginatedQuery(
    api.adminOrders.listPaginated,
    listArgs,
    { initialNumItems: ADMIN_LIST_PAGE_SIZE }
  );

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const canLoadMore = status === "CanLoadMore";
  const isLoadingMore = status === "LoadingMore";
  const isLoadingFirstPage = status === "LoadingFirstPage";

  const handleLoadMore = useCallback(() => {
    if (!canLoadMore) return;
    loadMore(ADMIN_LIST_PAGE_SIZE);
  }, [canLoadMore, loadMore]);

  const statusFilterItems = useMemo(
    () =>
      ORDER_STATUS_FILTER_OPTIONS.map((option) => ({
        value: option.value,
        label:
          option.value !== "all" && counts?.[option.value] !== undefined
            ? `${option.label} (${counts[option.value]})`
            : option.label,
      })),
    [counts]
  );

  const orderStatusValue = filters.orderStatus || "all";

  const orderStatusControl = (
    <div className="flex w-full min-w-0 flex-col gap-1 sm:w-auto">
      <Label htmlFor="orders-status-filter" className="sr-only">
        Order status
      </Label>
      <Select
        value={orderStatusValue}
        items={statusFilterItems}
        onValueChange={(value) =>
          setFilters({
            ...filters,
            orderStatus: value === "all" ? "" : (value as OrderStatus),
          })
        }
      >
        <SelectTrigger id="orders-status-filter" className="h-9 w-full sm:w-[11rem]">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          {statusFilterItems.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              label={String(option.label)}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const renderCell = (columnId: string, order: Doc<"orders">) => {
    switch (columnId) {
      case "orderNumber":
        return (
          <span className="font-medium">{order.orderNumber}</span>
        );
      case "customerName":
        return order.customerName;
      case "customerEmail":
        return order.customerEmail;
      case "customerPhone":
        return order.customerPhone;
      case "total":
        return formatCurrencyAmount(order.total, order.currency);
      case "paymentMethod":
        return <PaymentMethodBadge method={order.paymentMethod} />;
      case "paymentStatus":
        return <PaymentStatusBadge status={order.paymentStatus} />;
      case "status":
        return <OrderStatusBadge status={order.status} />;
      case "createdAt":
        return formatDateTime(order.createdAt);
      case "actions":
        return (
          <Button
            variant="ghost"
            size="icon-sm"
            render={<Link href={`/admin/orders/${order._id}`} />}
            aria-label="View order"
          >
            <Eye className="size-4" />
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Orders"
        description={
          counts
            ? `Manage and track customer orders. ${counts.all} total.`
            : "Manage and track customer orders."
        }
      />

      <AdminListToolbar
        hideTabs
        search={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search orders"
        filters={
          <>
            {orderStatusControl}
            <AdminOrderFilters
              filters={filters}
              onChange={setFilters}
              onClear={() => setFilters(emptyOrderFilters())}
            />
          </>
        }
        sortControl={
          <Select
            value={sort}
            items={ORDER_SORT_OPTIONS}
            onValueChange={(value) => setSort(value as OrderSort)}
          >
            <SelectTrigger className="h-9 w-full sm:w-[10.5rem]">
              <SelectValue placeholder="Newest first" />
            </SelectTrigger>
            <SelectContent>
              {ORDER_SORT_OPTIONS.map((option) => (
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
        }
      />

      <div className="mb-3 flex justify-end">
        <ColumnVisibilityPanel
          columns={tableColumns}
          visibility={columnVisibility}
          onToggle={toggleColumn}
        />
      </div>

      <AdminTableCard>
        <Table>
          <TableHeader>
            <TableRow>
              {visibleColumns.map((column) => (
                <TableHead key={column.id}>{column.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingFirstPage ? (
              <LoadingFirstPage columnCount={visibleColumns.length} />
            ) : results.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={visibleColumns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No orders found for the selected filters.
                </TableCell>
              </TableRow>
            ) : (
              results.map((order) => (
                <TableRow key={order._id}>
                  {visibleColumns.map((column) => (
                    <TableCell key={column.id}>
                      {renderCell(column.id, order)}
                    </TableCell>
                  ))}
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
    </div>
  );
}
