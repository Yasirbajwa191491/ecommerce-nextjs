"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { AdminTableCard } from "@/components/admin/admin-table-card";
import { DashboardSection } from "@/components/admin/dashboard/dashboard-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function DashboardLowStock() {
  const data = useQuery(api.adminDashboard.getLowStock);
  const loading = data === undefined;
  const products = data?.products ?? [];
  const threshold = data?.threshold ?? 2;
  const empty = !loading && products.length === 0;

  return (
    <DashboardSection
      title="Low Stock Products"
      description={`Products at or below ${threshold} units`}
      loading={loading}
      empty={empty}
      emptyTitle="Inventory looks healthy"
      emptyDescription="No active products are below the configured stock threshold."
      action={
        <Button
          variant="outline"
          size="sm"
          render={
            <Link href={`/admin/products?maxStock=${threshold}`} />
          }
        >
          Manage Inventory
        </Button>
      }
    >
      <AdminTableCard>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow
                  key={product.productId}
                  className={cn(
                    product.status === "out_of_stock" && "bg-destructive/5",
                    product.status === "low_stock" && "bg-amber-500/5"
                  )}
                >
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {product.sku ?? "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {product.stock}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        product.status === "out_of_stock"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {product.status === "out_of_stock"
                        ? "Out of Stock"
                        : "Low Stock"}
                    </Badge>
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
