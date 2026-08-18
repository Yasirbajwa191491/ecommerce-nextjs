"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SlidersHorizontal } from "lucide-react";
import type { OrderStatus, PaymentMethod, PaymentStatus } from "@/types/order";

export type OrderListFilters = {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  paymentStatus: PaymentStatus | "";
  orderStatus: OrderStatus | "";
  paymentMethod: PaymentMethod | "";
  dateFrom: string;
  dateTo: string;
};

export const emptyOrderFilters = (): OrderListFilters => ({
  orderNumber: "",
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  paymentStatus: "",
  orderStatus: "",
  paymentMethod: "",
  dateFrom: "",
  dateTo: "",
});

export function hasActiveOrderFilters(filters: OrderListFilters) {
  return Object.values(filters).some((value) => value.trim() !== "");
}

type AdminOrderFiltersProps = {
  filters: OrderListFilters;
  onChange: (filters: OrderListFilters) => void;
  onClear: () => void;
};

export function AdminOrderFilters({
  filters,
  onChange,
  onClear,
}: AdminOrderFiltersProps) {
  const active = hasActiveOrderFilters(filters);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" className="w-full shrink-0 sm:w-auto">
            <SlidersHorizontal className="size-4" />
            Filters
            {active ? (
              <span className="ml-1 rounded-full bg-foreground px-1.5 py-0.5 text-[10px] text-background">
                On
              </span>
            ) : null}
          </Button>
        }
      />
      <PopoverContent
        align="end"
        className="w-[min(20rem,calc(100vw-2rem))]"
      >
        <PopoverHeader>
          <PopoverTitle>Filter orders</PopoverTitle>
        </PopoverHeader>
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="filter-order-number">Order number</Label>
            <Input
              id="filter-order-number"
              value={filters.orderNumber}
              onChange={(e) =>
                onChange({ ...filters, orderNumber: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filter-customer-name">Customer name</Label>
            <Input
              id="filter-customer-name"
              value={filters.customerName}
              onChange={(e) =>
                onChange({ ...filters, customerName: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filter-customer-email">Email</Label>
            <Input
              id="filter-customer-email"
              type="email"
              value={filters.customerEmail}
              onChange={(e) =>
                onChange({ ...filters, customerEmail: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filter-customer-phone">Phone</Label>
            <Input
              id="filter-customer-phone"
              value={filters.customerPhone}
              onChange={(e) =>
                onChange({ ...filters, customerPhone: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Payment status</Label>
            <Select
              value={filters.paymentStatus || "all"}
              onValueChange={(value) =>
                onChange({
                  ...filters,
                  paymentStatus:
                    value === "all" ? "" : (value as PaymentStatus),
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Payment method</Label>
            <Select
              value={filters.paymentMethod || "all"}
              onValueChange={(value) =>
                onChange({
                  ...filters,
                  paymentMethod:
                    value === "all" ? "" : (value as PaymentMethod),
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any</SelectItem>
                <SelectItem value="cod">Cash On Delivery</SelectItem>
                <SelectItem value="stripe">Stripe</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="filter-date-from">From date</Label>
              <Input
                id="filter-date-from"
                type="date"
                value={filters.dateFrom}
                onChange={(e) =>
                  onChange({ ...filters, dateFrom: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filter-date-to">To date</Label>
              <Input
                id="filter-date-to"
                type="date"
                value={filters.dateTo}
                onChange={(e) =>
                  onChange({ ...filters, dateTo: e.target.value })
                }
              />
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClear} disabled={!active}>
            Clear filters
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function toOrderFilterArgs(filters: OrderListFilters) {
  const parseDate = (value: string, endOfDay = false) => {
    if (!value.trim()) return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
    if (endOfDay) {
      date.setHours(23, 59, 59, 999);
    } else {
      date.setHours(0, 0, 0, 0);
    }
    return date.getTime();
  };

  return {
    orderNumber: filters.orderNumber.trim() || undefined,
    customerName: filters.customerName.trim() || undefined,
    customerEmail: filters.customerEmail.trim() || undefined,
    customerPhone: filters.customerPhone.trim() || undefined,
    paymentStatus: filters.paymentStatus || undefined,
    paymentMethod: filters.paymentMethod || undefined,
    filterOrderStatus: filters.orderStatus || undefined,
    dateFrom: parseDate(filters.dateFrom),
    dateTo: parseDate(filters.dateTo, true),
  };
}
