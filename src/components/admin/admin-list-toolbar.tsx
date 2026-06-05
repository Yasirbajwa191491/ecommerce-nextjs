"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, ListOrdered, Search } from "lucide-react";

type StatusTab = "active" | "inactive";

type AdminListToolbarProps = {
  activeTab: StatusTab;
  onActiveTabChange: (tab: StatusTab) => void;
  counts?: { active: number; inactive: number };
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  reorderMode?: boolean;
  onReorderModeChange?: (value: boolean) => void;
  canReorder?: boolean;
  filters?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
};

export function AdminListToolbar({
  activeTab,
  onActiveTabChange,
  counts,
  search,
  onSearchChange,
  searchPlaceholder = "Search",
  reorderMode = false,
  onReorderModeChange,
  canReorder = true,
  filters,
  actionLabel,
  onAction,
}: AdminListToolbarProps) {
  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          value={activeTab}
          onValueChange={(value) => onActiveTabChange(value as StatusTab)}
        >
          <TabsList variant="line" className="h-auto w-full justify-start sm:w-auto">
            <TabsTrigger value="active">
              Active{counts ? ` (${counts.active})` : ""}
            </TabsTrigger>
            <TabsTrigger value="inactive">
              Inactive{counts ? ` (${counts.inactive})` : ""}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap items-center gap-2">
          {filters}
          <div className="relative min-w-[200px] flex-1 sm:flex-none sm:w-56">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-8"
            />
          </div>
          {onReorderModeChange ? (
            reorderMode ? (
              <Button
                variant="outline"
                onClick={() => onReorderModeChange(false)}
                className="shrink-0"
              >
                <Check className="size-4" />
                Done reordering
              </Button>
            ) : (
              <Button
                variant="outline"
                size="icon"
                onClick={() => onReorderModeChange(true)}
                disabled={!canReorder}
                aria-label="Reorder list"
                title={canReorder ? "Reorder list" : "Reorder is only available for active items"}
                className="shrink-0"
              >
                <ListOrdered className="size-4" />
              </Button>
            )
          ) : null}
          {actionLabel && onAction ? (
            <Button onClick={onAction} className="shrink-0">
              {actionLabel}
            </Button>
          ) : null}
        </div>
      </div>

      {reorderMode ? (
        <p className="text-sm text-muted-foreground">
          Drag rows by the handle to reorder; each drop saves. When finished, click
          &ldquo;Done reordering&rdquo; to return to the paginated list.
        </p>
      ) : null}
    </div>
  );
}

export type { StatusTab };
