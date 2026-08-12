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
  const visualMetrics = useQuery(
    api.imageEmbeddingMutations.getVisualSearchMetrics,
    {}
  );
  const visualSearches = useQuery(
    api.imageEmbeddingMutations.listRecentVisualSearchEvents,
    { limit: 20 }
  );
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
      description: "Product catalog images will be indexed for visual search.",
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
            Product catalog indexing for visual search, plus customer search
            activity.
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
        <MetricCard title="Catalog products" value={metrics?.totalProducts ?? "—"} />
        <MetricCard title="SigLIP indexed" value={metrics?.withSiglip ?? "—"} />
        <MetricCard title="Indexing complete" value={metrics?.complete ?? "—"} />
        <MetricCard
          title="Visual searches (7d)"
          value={visualMetrics?.last7Days ?? "—"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer visual searches</CardTitle>
          <CardDescription>
            Uploads from the storefront visual search page (not order records).
            New searches include matched product names.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!visualSearches ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : visualSearches.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No visual searches logged yet. Run a search on{" "}
              <span className="font-medium">/products/visual-search</span>.
            </p>
          ) : (
            <ul className="divide-y">
              {visualSearches.map((event) => (
                <li
                  key={event._id}
                  className="flex flex-wrap items-start justify-between gap-3 py-3"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium">
                      {event.resultCount} result
                      {event.resultCount === 1 ? "" : "s"}
                      {event.textQuery ? (
                        <span className="font-normal text-muted-foreground">
                          {" "}
                          · &ldquo;{event.textQuery}&rdquo;
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.searchedAt).toLocaleString()}
                      {event.fallbackUsed ? ` · fallback: ${event.fallbackUsed}` : ""}
                    </p>
                    {event.topProductNames.length > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Top matches: {event.topProductNames.join(", ")}
                      </p>
                    ) : null}
                  </div>
                  <Badge variant="outline">{event.provider}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Indexing queue</CardTitle>
          <CardDescription>
            Background jobs that vectorize product photos for visual search
          </CardDescription>
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
          <CardTitle>Product catalog indexing</CardTitle>
          <CardDescription>
            Each product photo needs an embedding before visual search can match
            it. Status &ldquo;none&rdquo; means not indexed yet — use Backfill
            pending.
          </CardDescription>
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
