"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import Link from "next/link";

export default function AdminRecommendationsPage() {
  const stats = useQuery(api.recommendationQueries.getRecommendationStats);
  const analytics = useQuery(api.recommendationQueries.listRecommendationAnalytics, {
    limit: 20,
  });
  const jobs = useQuery(api.recommendationQueries.listRecentRecommendationJobs, {
    limit: 10,
  });
  const settings = useQuery(api.settings.list);
  const scheduleCoOccurrence = useMutation(
    api.adminRecommendations.scheduleCoOccurrenceRebuild
  );
  const [now] = useState(() => Date.now());
  const contentStatus = useQuery(api.adminContentRecommendations.getStatus, { now });
  const setStrategy = useMutation(api.adminContentRecommendations.setRecommendationStrategy);

  const recommendationSettings =
    settings?.filter((row: Doc<"settings">) => row.key.startsWith("recommendation_")) ?? [];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Recommendations"
        description="Customer intelligence, hybrid scoring, cache health, and recommendation analytics."
        action={
          <Link
            href="/admin/settings"
            className="inline-flex h-8 items-center justify-center rounded-lg border border-input bg-background px-3 text-sm font-medium"
          >
            Recommendation Settings
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        {stats === undefined ? (
          Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Profiles</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {stats.profileCount}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Cached Sections</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {stats.cacheCount}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Pending Jobs</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {stats.pendingJobs}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Content recommendation strategy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {contentStatus === undefined ? (
            <Skeleton className="h-24 rounded-lg" />
          ) : (
            <>
              <div className="grid gap-3 text-sm md:grid-cols-2">
                <p>
                  Active strategy:{" "}
                  <span className="font-medium">{contentStatus.recommendationStrategy}</span>
                </p>
                <p>
                  Fallback: <span className="font-medium">{contentStatus.fallbackStrategy}</span>
                </p>
                <p>
                  Model version:{" "}
                  <span className="font-medium">{contentStatus.pythonModelVersion}</span>
                </p>
                <p>
                  Published snapshot:{" "}
                  <span className="font-medium">
                    {contentStatus.publishedSnapshot?.snapshotId ?? "None"}
                  </span>
                </p>
                <p>
                  Generated:{" "}
                  <span className="font-medium">
                    {contentStatus.publishedSnapshot
                      ? new Date(contentStatus.publishedSnapshot.generatedAt).toLocaleString()
                      : "Not generated"}
                  </span>
                </p>
                <p>
                  Status:{" "}
                  <span className="font-medium">
                    {contentStatus.publishedSnapshot
                      ? `${contentStatus.publishedSnapshot.status}${
                          contentStatus.publishedSnapshot.stale ? ", stale" : ""
                        }`
                      : "No published snapshot"}
                  </span>
                </p>
                <p>
                  Products covered:{" "}
                  <span className="font-medium">
                    {contentStatus.publishedSnapshot
                      ? `${contentStatus.publishedSnapshot.storedProductCount} / ${contentStatus.publishedSnapshot.expectedProductCount}`
                      : "0"}
                  </span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {contentStatus.availableStrategies.map((strategy) => (
                  <Button
                    key={strategy}
                    variant={
                      contentStatus.recommendationStrategy === strategy ? "default" : "outline"
                    }
                    disabled={strategy === "python_content" && !contentStatus.publishedSnapshot}
                    onClick={async () => {
                      try {
                        await setStrategy({ recommendationStrategy: strategy });
                        toastSuccess(
                          strategy === "convex"
                            ? "Store recommendations stay on Convex"
                            : "Similar products will use the published Python snapshot"
                        );
                      } catch (error) {
                        toastError(error);
                      }
                    }}
                  >
                    {strategy === "convex" ? "Use Convex" : "Use Python content"}
                  </Button>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Operations</CardTitle>
          <Button
            onClick={async () => {
              await scheduleCoOccurrence({});
              toastSuccess("Co-occurrence rebuild scheduled");
            }}
          >
            Rebuild Frequently Bought Together
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {recommendationSettings.map((setting) => (
            <div
              key={setting._id}
              className="rounded-lg border border-border/70 px-4 py-3 text-sm"
            >
              <p className="font-medium">{setting.name}</p>
              <p className="mt-1 text-muted-foreground break-all">{setting.value}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Impressions</TableHead>
                <TableHead>Clicks</TableHead>
                <TableHead>Conversions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(analytics ?? []).map((row, index) => (
                <TableRow key={`${row.date}-${row.sectionType}-${index}`}>
                  <TableCell>{row.date}</TableCell>
                  <TableCell>{row.sectionType}</TableCell>
                  <TableCell>{row.source}</TableCell>
                  <TableCell>{row.impressions}</TableCell>
                  <TableCell>{row.clicks}</TableCell>
                  <TableCell>{row.conversions}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Identity</TableHead>
                <TableHead>Processed By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(jobs ?? []).map((job) => (
                <TableRow key={job._id}>
                  <TableCell>{job.jobType}</TableCell>
                  <TableCell>{job.status}</TableCell>
                  <TableCell>{job.identityKey ?? "—"}</TableCell>
                  <TableCell>{job.processedBy ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
