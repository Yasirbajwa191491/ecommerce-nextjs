"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { AdminTableCard } from "@/components/admin/admin-table-card";
import { DashboardSection } from "@/components/admin/dashboard/dashboard-section";
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
import type { DashboardQueryArgs } from "@/lib/admin/dashboard-range";

type DashboardTopProductsTableProps = {
  queryArgs: DashboardQueryArgs;
};

export function DashboardTopProductsTable({
  queryArgs,
}: DashboardTopProductsTableProps) {
  const data = useQuery(api.adminDashboard.getTopProducts, queryArgs);
  const loading = data === undefined;
  const products = data?.products ?? [];
  const currency = data?.currency ?? "USD";
  const empty = !loading && products.length === 0;

  return (
    <DashboardSection
      title="Top Selling Products"
      description="Top 10 products by revenue"
      loading={loading}
      empty={empty}
      emptyTitle="No products sold"
      emptyDescription="Best sellers will appear once paid orders include products."
    >
      <AdminTableCard>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Image</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Units</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="w-24 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.productId}>
                  <TableCell>
                    <div className="relative size-10 overflow-hidden rounded-md border bg-muted">
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt={product.productName}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {product.productName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {product.sku ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">{product.orderCount}</TableCell>
                  <TableCell className="text-right">{product.unitsSold}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrencyAmount(product.revenue, currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      render={
                        <Link
                          href={`/admin/products?edit=${product.productId}`}
                        />
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
