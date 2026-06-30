"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toastSuccess } from "@/lib/app-toast";
import Image from "next/image";

export default function ImageEmbeddingsAdminPage() {
  const metrics = useQuery(api.imageEmbeddingMutations.getEmbeddingMetrics, {});
  const queueStats = useQuery(api.imageEmbeddingMutations.getQueueStats, {});
  const products = useQuery(api.imageEmbeddingMutations.listEmbeddingStatus, {
    limit: 30,
  });
  const scheduleBackfill = useMutation(api.adminImageEmbeddings.scheduleBackfill);
  const rebuildAll = useMutation(api.adminImageEmbeddings.rebuildAll);
  const retryFailed = useMutation(api.adminImageEmbeddings.retryFailed);

  const handleBackfill = async () => {
    await scheduleBackfill({ limit: 20 });
    toastSuccess("Backfill scheduled", {
      description: "Image embeddings will be generated in the background.",
    });
  };

  const handleRebuildAll = async () => {
    await rebuildAll({});
    toastSuccess("Rebuild started", {
      description: "All product image embeddings will be regenerated.",
    });
  };

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Image embeddings</h1>
          <p className="text-sm text-muted-foreground">
            Visual search vectors, queue health, and regeneration tools.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void handleBackfill()}>
            Backfill pending
          </Button>
          <Button onClick={() => void handleRebuildAll()}>Rebuild all</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Total products" value={metrics?.totalProducts ?? "—"} />
        <MetricCard title="SigLIP indexed" value={metrics?.withSiglip ?? "—"} />
        <MetricCard title="Complete" value={metrics?.complete ?? "—"} />
        <MetricCard title="Failed" value={metrics?.failed ?? "—"} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Processing queue</CardTitle>
          <CardDescription>n8n optional — Convex processes automatically</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <QueueBadge label="Pending" count={queueStats?.pending} />
          <QueueBadge label="Processing" count={queueStats?.processing} />
          <QueueBadge label="Retry" count={queueStats?.retryScheduled} />
          <QueueBadge label="Failed" count={queueStats?.failed} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent products</CardTitle>
          <CardDescription>Embedding status and provider</CardDescription>
        </CardHeader>
        <CardContent>
          {!products ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : products.length === 0 ? (
            <p className="text-sm text-muted-foreground">No products found.</p>
          ) : (
            <ul className="divide-y">
              {products.map((product) => (
                <li
                  key={product._id}
                  className="flex flex-wrap items-center gap-4 py-3"
                >
                  <div className="relative size-12 overflow-hidden rounded-md bg-muted">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt=""
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {product.imageEmbeddingProvider ?? "—"}
                      {product.imageEmbeddingUpdatedAt
                        ? ` · ${new Date(product.imageEmbeddingUpdatedAt).toLocaleString()}`
                        : ""}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {product.imageEmbeddingStatus ?? "none"}
                  </Badge>
                  {product.imageEmbeddingStatus === "failed" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void retryFailed({ productId: product._id }).then(() =>
                          toastSuccess("Retry scheduled")
                        )
                      }
                    >
                      Retry
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  title,
  value,
}: {
  title: string;
  value: number | string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function QueueBadge({
  label,
  count,
}: {
  label: string;
  count: number | undefined;
}) {
  return (
    <Badge variant="secondary" className="px-3 py-1">
      {label}: {count ?? 0}
    </Badge>
  );
}
