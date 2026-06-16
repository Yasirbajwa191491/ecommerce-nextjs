"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { SubscriberPicker } from "./subscriber-picker";
import { serializeSegmentCriteria } from "@/lib/email-marketing/segment-utils";

export type AudienceMode = "all" | "segments" | "selected";

export type SegmentSelectorValue = {
  mode: AudienceMode;
  segmentKeys: string[];
  selectedSubscriberIds: Id<"subscribers">[];
};

type SegmentSelectorProps = {
  value: SegmentSelectorValue;
  onChange: (value: SegmentSelectorValue) => void;
};

export function SegmentSelector({ value, onChange }: SegmentSelectorProps) {
  const segments = useQuery(api.subscriberInterests.listSegmentsWithCounts);
  const recipientCount = useQuery(
    api.subscriberInterests.countRecipientsForSegments,
    value.mode === "segments" && value.segmentKeys.length > 0
      ? { segmentKeys: value.segmentKeys }
      : "skip"
  );

  const selectableSegments =
    segments?.filter((s) => s.key !== "all_subscribers") ?? [];

  const toggleSegment = (key: string, checked: boolean) => {
    const next = checked
      ? [...value.segmentKeys, key]
      : value.segmentKeys.filter((k) => k !== key);
    onChange({ ...value, segmentKeys: next });
  };

  const estimatedCount =
    value.mode === "all"
      ? (segments?.find((s) => s.key === "all_subscribers")?.count ?? 0)
      : value.mode === "segments"
        ? (recipientCount ?? 0)
        : value.selectedSubscriberIds.length;

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Send To</Label>
        <RadioGroup
          value={value.mode}
          onValueChange={(mode) =>
            onChange({
              ...value,
              mode: mode as AudienceMode,
            })
          }
          className="mt-2 space-y-2"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="all" id="audience-all" />
            <Label htmlFor="audience-all" className="font-normal">
              All Subscribers
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="segments" id="audience-segments" />
            <Label htmlFor="audience-segments" className="font-normal">
              Specific Segment(s)
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="selected" id="audience-selected" />
            <Label htmlFor="audience-selected" className="font-normal">
              Manual selection
            </Label>
          </div>
        </RadioGroup>
      </div>

      {value.mode === "segments" ? (
        <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border p-3">
          {selectableSegments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Loading segments… Refresh interests on the Subscribers page if empty.
            </p>
          ) : (
            selectableSegments.map((segment) => (
              <label
                key={segment.key}
                className="flex cursor-pointer items-start gap-2 rounded-md p-1 hover:bg-muted/50"
              >
                <Checkbox
                  checked={value.segmentKeys.includes(segment.key)}
                  onCheckedChange={(checked) =>
                    toggleSegment(segment.key, checked === true)
                  }
                />
                <span className="min-w-0 flex-1">
                  <span className="text-sm font-medium">{segment.label}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({segment.count})
                  </span>
                  <p className="text-xs text-muted-foreground">{segment.description}</p>
                </span>
              </label>
            ))
          )}
        </div>
      ) : null}

      {value.mode === "selected" ? (
        <SubscriberPicker
          selectedIds={value.selectedSubscriberIds}
          onChange={(ids) =>
            onChange({ ...value, selectedSubscriberIds: ids })
          }
        />
      ) : null}

      <p className="text-sm text-muted-foreground">
        Estimated recipients: <strong>{estimatedCount}</strong>
      </p>
    </div>
  );
}

export function audienceToCampaignSegment(value: SegmentSelectorValue): {
  segmentType: "all" | "selected" | "segments";
  segmentCriteria?: string;
  selectedSubscriberIds?: Id<"subscribers">[];
} {
  if (value.mode === "all") {
    return { segmentType: "all" };
  }
  if (value.mode === "segments") {
    return {
      segmentType: "segments",
      segmentCriteria: serializeSegmentCriteria(value.segmentKeys),
    };
  }
  return {
    segmentType: "selected",
    selectedSubscriberIds: value.selectedSubscriberIds,
  };
}

export function campaignSegmentToAudience(
  segmentType:
    | "all"
    | "selected"
    | "segments"
    | "new_subscribers"
    | "active_customers"
    | "custom",
  segmentCriteria?: string,
  selectedSubscriberIds?: Id<"subscribers">[]
): SegmentSelectorValue {
  if (segmentType === "segments") {
    try {
      const parsed = JSON.parse(segmentCriteria ?? "{}") as {
        segmentKeys?: string[];
      };
      return {
        mode: "segments",
        segmentKeys: parsed.segmentKeys ?? [],
        selectedSubscriberIds: [],
      };
    } catch {
      return { mode: "segments", segmentKeys: [], selectedSubscriberIds: [] };
    }
  }
  if (segmentType === "selected") {
    return {
      mode: "selected",
      segmentKeys: [],
      selectedSubscriberIds: selectedSubscriberIds ?? [],
    };
  }
  return { mode: "all", segmentKeys: [], selectedSubscriberIds: [] };
}
