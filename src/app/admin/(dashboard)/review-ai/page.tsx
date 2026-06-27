"use client";

import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../../../convex/_generated/api";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ReviewAiMetrics } from "@/components/admin/reviews/review-ai-metrics";
import { AdminTableCard } from "@/components/admin/admin-table-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

type RecentJob = FunctionReturnType<
  typeof api.adminReviewAi.listRecentJobs
>[number];

export default function AdminReviewAiPage() {
  const queueStats = useQuery(api.adminReviewAi.getQueueStats);
  const recentJobs = useQuery(api.adminReviewAi.listRecentJobs, { limit: 30 });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Review AI Operations"
        description="Queue health, generation metrics, and recent AI jobs."
      />

      <ReviewAiMetrics />

      {queueStats ? (
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{queueStats.pending} pending</Badge>
          <Badge variant="secondary">{queueStats.processing} processing</Badge>
          <Badge variant="outline">{queueStats.retryScheduled} retry scheduled</Badge>
          <Badge variant="destructive">{queueStats.failed} failed</Badge>
          <Badge variant="secondary">
            {queueStats.completedLast24h} completed (24h)
          </Badge>
        </div>
      ) : null}

      <AdminTableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Retries</TableHead>
              <TableHead>Review</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentJobs === undefined ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Loading jobs…
                </TableCell>
              </TableRow>
            ) : recentJobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No recent jobs.
                </TableCell>
              </TableRow>
            ) : (
              recentJobs.map((job: RecentJob) => (
                <TableRow key={job._id}>
                  <TableCell className="font-mono text-xs">{job.jobType}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{job.status}</Badge>
                  </TableCell>
                  <TableCell>{job.retryCount}</TableCell>
                  <TableCell>
                    {job.reviewId ? (
                      <Link
                        href={`/admin/reviews/${job.reviewId}`}
                        className="text-sm underline"
                      >
                        View review
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(job.updatedAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </AdminTableCard>
    </div>
  );
}
