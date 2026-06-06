"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  buildDashboardSearchParams,
  DASHBOARD_RANGE_OPTIONS,
  parseDashboardRange,
  parseDateParam,
  type DashboardRange,
} from "@/lib/admin/dashboard-range";

export function DashboardFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const range = parseDashboardRange(searchParams.get("range"));
  const fromParam = parseDateParam(searchParams.get("from"));
  const toParam = parseDateParam(searchParams.get("to"));

  const [customFrom, setCustomFrom] = useState(fromParam);
  const [customTo, setCustomTo] = useState(toParam);

  useEffect(() => {
    setCustomFrom(fromParam);
    setCustomTo(toParam);
  }, [fromParam, toParam]);

  const updateUrl = useCallback(
    (nextRange: DashboardRange, from = customFrom, to = customTo) => {
      const query = buildDashboardSearchParams(nextRange, from, to);
      router.replace(`${pathname}?${query}`);
    },
    [router, pathname, customFrom, customTo]
  );

  const handleRangeChange = (nextRange: DashboardRange) => {
    updateUrl(nextRange);
  };

  const applyCustomRange = () => {
    updateUrl("custom", customFrom, customTo);
  };

  return (
    <div className="mb-6 space-y-3">
      <div className="flex flex-wrap gap-2">
        {DASHBOARD_RANGE_OPTIONS.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={range === option.value ? "default" : "outline"}
            className={cn(
              "h-8",
              range === option.value && "bg-[#6254f3] hover:bg-[#6254f3]/90"
            )}
            onClick={() => handleRangeChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {range === "custom" ? (
        <div className="flex flex-col gap-3 rounded-lg border bg-background p-4 sm:flex-row sm:items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              From
            </label>
            <Input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              To
            </label>
            <Input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="h-9"
            />
          </div>
          <Button
            type="button"
            size="sm"
            className="bg-[#6254f3] hover:bg-[#6254f3]/90"
            onClick={applyCustomRange}
            disabled={!customFrom || !customTo}
          >
            Apply Range
          </Button>
        </div>
      ) : null}
    </div>
  );
}
