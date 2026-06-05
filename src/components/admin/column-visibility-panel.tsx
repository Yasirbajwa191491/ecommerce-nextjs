"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { AdminColumnDef } from "@/lib/admin/column-visibility";
import { isColumnVisible } from "@/lib/admin/column-visibility";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, Lock } from "lucide-react";

type ColumnVisibilityPanelProps = {
  columns: AdminColumnDef[];
  visibility: Record<string, boolean>;
  onToggle: (columnId: string) => void;
  className?: string;
};

export function ColumnVisibilityPanel({
  columns,
  visibility,
  onToggle,
  className,
}: ColumnVisibilityPanelProps) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn("gap-1.5", className)}
            aria-label="Manage visible columns"
          >
            <Eye className="size-4" />
            <span className="text-sm tabular-nums">{columns.length}</span>
          </Button>
        }
      />
      <PopoverContent align="end" side="bottom" className="w-72 p-0">
        <PopoverHeader className="border-b px-3 py-2.5">
          <PopoverTitle className="text-sm font-medium">
            Table columns
          </PopoverTitle>
        </PopoverHeader>
        <ul className="max-h-80 overflow-y-auto py-1">
          {columns.map((column) => {
            const visible = isColumnVisible(column, visibility);
            return (
              <li
                key={column.id}
                className="flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-muted/50"
              >
                <span className="truncate">{column.label}</span>
                {column.locked ? (
                  <span
                    className="inline-flex size-8 shrink-0 items-center justify-center text-muted-foreground"
                    title="Always visible"
                  >
                    <Lock className="size-4" />
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    onClick={() => onToggle(column.id)}
                    aria-label={
                      visible
                        ? `Hide ${column.label} column`
                        : `Show ${column.label} column`
                    }
                    title={visible ? "Hide column" : "Show column"}
                  >
                    {visible ? (
                      <Eye className="size-4" />
                    ) : (
                      <EyeOff className="size-4 text-muted-foreground" />
                    )}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
