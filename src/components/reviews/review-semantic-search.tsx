"use client";

import { useEffect, useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type ReviewSemanticSearchProps = {
  productId: Id<"products">;
  onResults: (reviewIds: string[] | null) => void;
  className?: string;
};

export function ReviewSemanticSearch({
  productId,
  onResults,
  className,
}: ReviewSemanticSearchProps) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [loading, setLoading] = useState(false);
  const search = useAction(api.productReviewSearch.searchReviewsSemantic);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 400);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!debounced) {
      onResults(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void search({ productId, queryText: debounced })
      .then((results: { _id: string }[]) => {
        if (!cancelled) {
          onResults(results.map((r) => r._id));
        }
      })
      .catch(() => {
        if (!cancelled) onResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debounced, onResults, productId, search]);

  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search reviews (e.g. battery life, fast delivery)…"
        className="rounded-full pl-9"
      />
      {loading ? (
        <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      ) : null}
    </div>
  );
}
