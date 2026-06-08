"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { DashboardKpiCard } from "@/components/admin/dashboard/dashboard-kpi-card";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductStars } from "@/components/products/product-stars";

export function DashboardReviewAnalytics() {
  const data = useQuery(api.adminDashboard.getReviewAnalytics);
  const loading = data === undefined;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Review analytics</h2>
        <p className="text-sm text-muted-foreground">
          Store-wide ratings and moderation overview
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        <DashboardKpiCard
          title="Total Reviews"
          value={String(data.totalReviews)}
          changePercent={null}
          trend="flat"
          loading={false}
        />
        <DashboardKpiCard
          title="Average Store Rating"
          value={data.averageStoreRating.toFixed(1)}
          changePercent={null}
          trend="flat"
          loading={false}
        />
        <DashboardKpiCard
          title="Pending Approval"
          value={String(data.pendingApproval)}
          changePercent={null}
          trend="flat"
          loading={false}
          positiveIsGood={false}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Most reviewed products</CardTitle>
          </CardHeader>
          <CardContent>
            {data.mostReviewedProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reviews yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Reviews</TableHead>
                    <TableHead>Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.mostReviewedProducts.map((row) => (
                    <TableRow key={row.productId}>
                      <TableCell>
                        <Link
                          href={`/admin/products?edit=${row.productId}`}
                          className="font-medium hover:underline"
                        >
                          {row.productName}
                        </Link>
                      </TableCell>
                      <TableCell>{row.reviewCount}</TableCell>
                      <TableCell>
                        <ProductStars rating={row.averageRating} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Highest rated products</CardTitle>
          </CardHeader>
          <CardContent>
            {data.highestRatedProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Needs at least 3 reviews per product.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Reviews</TableHead>
                    <TableHead>Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.highestRatedProducts.map((row) => (
                    <TableRow key={row.productId}>
                      <TableCell>
                        <Link
                          href={`/admin/products?edit=${row.productId}`}
                          className="font-medium hover:underline"
                        >
                          {row.productName}
                        </Link>
                      </TableCell>
                      <TableCell>{row.reviewCount}</TableCell>
                      <TableCell>
                        <ProductStars rating={row.averageRating} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
