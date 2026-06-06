"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { AdminTableCard } from "@/components/admin/admin-table-card";
import { DashboardSection } from "@/components/admin/dashboard/dashboard-section";
import {
  OrderStatusBadge,
  PaymentMethodBadge,
  PaymentStatusBadge,
} from "@/components/admin/order-status-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrencyAmount } from "@/lib/currencies";
import { formatActivityTimestamp } from "@/lib/admin/dashboard-range";
import type { DashboardQueryArgs } from "@/lib/admin/dashboard-range";

type DashboardRecentOrdersProps = {
  queryArgs: DashboardQueryArgs;
};

export function DashboardRecentOrders({
  queryArgs,
}: DashboardRecentOrdersProps) {
  const orders = useQuery(api.adminDashboard.getRecentOrders, queryArgs);
  const loading = orders === undefined;
  const empty = !loading && orders.length === 0;

  return (
    <DashboardSection
      title="Recent Orders"
      description="Latest orders in the selected period"
      loading={loading}
      empty={empty}
      emptyTitle="No recent orders"
      emptyDescription="Recent orders will appear here once customers checkout."
      action={
        <Button
          variant="outline"
          size="sm"
          render={<Link href="/admin/orders" />}
        >
          View All Orders
        </Button>
      }
    >
      <AdminTableCard>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Payment Status</TableHead>
                <TableHead>Order Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-24 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders?.map((order) => (
                <TableRow key={order.orderId}>
                  <TableCell className="font-medium">
                    {order.orderNumber}
                  </TableCell>
                  <TableCell>{order.customerName}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrencyAmount(order.total, order.currency)}
                  </TableCell>
                  <TableCell>
                    <PaymentMethodBadge method={order.paymentMethod} />
                  </TableCell>
                  <TableCell>
                    <PaymentStatusBadge status={order.paymentStatus} />
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.orderStatus} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatActivityTimestamp(order.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      render={
                        <Link href={`/admin/orders/${order.orderId}`} />
                      }
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </AdminTableCard>
    </DashboardSection>
  );
}
