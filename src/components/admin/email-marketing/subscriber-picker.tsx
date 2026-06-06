"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

type SubscriberPickerProps = {
  selectedIds: Id<"subscribers">[];
  onChange: (ids: Id<"subscribers">[]) => void;
  disabled?: boolean;
};

export function SubscriberPicker({
  selectedIds,
  onChange,
  disabled,
}: SubscriberPickerProps) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const subscribers = useQuery(api.subscribers.listActive, {
    search: search || undefined,
  });

  const toggle = (id: Id<"subscribers">) => {
    const exists = selectedIds.includes(id);
    onChange(exists ? selectedIds.filter((s) => s !== id) : [...selectedIds, id]);
  };

  if (disabled) {
    return (
      <p className="text-sm text-muted-foreground">
        Sending to all active subscribers.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <Input
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        placeholder="Search subscribers by email..."
      />
      <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border p-2">
        {subscribers === undefined ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))
        ) : subscribers.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            No active subscribers found.
          </p>
        ) : (
          subscribers.map((subscriber) => (
            <label
              key={subscriber._id}
              className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-muted/50"
            >
              <Checkbox
                checked={selectedIds.includes(subscriber._id)}
                onCheckedChange={() => toggle(subscriber._id)}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{subscriber.email}</p>
                <p className="text-xs text-muted-foreground">
                  Subscribed {format(subscriber.subscribedAt, "MMM d, yyyy")}
                </p>
              </div>
            </label>
          ))
        )}
      </div>
    </div>
  );
}
