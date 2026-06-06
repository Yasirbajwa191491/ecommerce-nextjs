"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, ListOrdered, Search } from "lucide-react";

type StatusTab = "active" | "inactive";

type ToolbarTab = {
  value: string;
  label: string;
  count?: number;
};

type AdminListToolbarProps = {
  activeTab?: string;
  onActiveTabChange?: (tab: string) => void;
  hideTabs?: boolean;
  counts?: { active: number; inactive: number };
  tabs?: ToolbarTab[];
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  reorderMode?: boolean;
  onReorderModeChange?: (value: boolean) => void;
  canReorder?: boolean;
  filters?: ReactNode;
  sortControl?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
};

export function AdminListToolbar({
  activeTab = "active",
  onActiveTabChange,
  hideTabs = false,
  counts,
  tabs,
  search,
  onSearchChange,
  searchPlaceholder = "Search",
  reorderMode = false,
  onReorderModeChange,
  canReorder = true,
  filters,
  sortControl,
  actionLabel,
  onAction,
}: AdminListToolbarProps) {
  const resolvedTabs: ToolbarTab[] =
    tabs ??
    [
      { value: "active", label: "Active", count: counts?.active },
      { value: "inactive", label: "Inactive", count: counts?.inactive },
    ];

  const controls = (
    <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center md:gap-2 lg:min-w-0 lg:flex-1 lg:justify-end">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 md:min-w-0 md:flex-1 lg:max-w-2xl">
        {filters}
        {sortControl}
        <div className="relative min-w-0 w-full sm:min-w-[10rem] sm:flex-1 md:max-w-xs lg:max-w-none lg:w-52">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 pl-8"
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2">
        {onReorderModeChange ? (
          reorderMode ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReorderModeChange(false)}
            >
              <Check className="size-4" />
              <span className="hidden sm:inline">Done reordering</span>
              <span className="sm:hidden">Done</span>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => onReorderModeChange(true)}
              disabled={!canReorder}
              aria-label="Reorder list"
              title={
                canReorder
                  ? "Reorder list"
                  : "Reorder is only available for active items"
              }
            >
              <ListOrdered className="size-4" />
            </Button>
          )
        ) : null}
        {actionLabel && onAction ? (
          <Button size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="mb-4 space-y-3">
      {hideTabs ? (
        controls
      ) : (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs
            value={activeTab}
            onValueChange={(value) => onActiveTabChange?.(value)}
          >
            <TabsList
              variant="line"
              className="h-auto w-full flex-wrap justify-start md:w-auto"
            >
              {resolvedTabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                  {tab.count !== undefined ? ` (${tab.count})` : ""}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {controls}
        </div>
      )}

      {reorderMode ? (
        <p className="text-sm text-muted-foreground">
          Drag rows by the handle to reorder; each drop saves. When finished,
          click &ldquo;Done reordering&rdquo; to return to the paginated list.
        </p>
      ) : null}
    </div>
  );
}

export type { StatusTab, ToolbarTab };
