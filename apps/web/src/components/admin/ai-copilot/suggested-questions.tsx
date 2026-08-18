"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import {
  SUGGESTED_COPILOT_QUESTION_GROUPS,
  SUGGESTED_COPILOT_QUESTIONS,
} from "@/lib/ai-copilot-content";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { AdminSearchInput } from "@/components/admin/admin-search-input";

type SuggestedQuestionsProps = {
  onSelect: (question: string) => void;
  disabled?: boolean;
  compact?: boolean;
};

export function SuggestedQuestions({
  onSelect,
  disabled,
  compact = false,
}: SuggestedQuestionsProps) {
  const [searchInput, setSearchInput] = useState("");
  const debouncedQuery = useDebouncedValue(searchInput, 300);

  const filteredGroups = useMemo(() => {
    const query = debouncedQuery.trim().toLowerCase();
    if (!query) return SUGGESTED_COPILOT_QUESTION_GROUPS;

    return SUGGESTED_COPILOT_QUESTION_GROUPS.map((group) => ({
      ...group,
      questions: group.questions.filter((q) => q.toLowerCase().includes(query)),
    })).filter((group) => group.questions.length > 0);
  }, [debouncedQuery]);

  const filteredCount = filteredGroups.reduce(
    (sum, group) => sum + group.questions.length,
    0
  );
  const totalCount = SUGGESTED_COPILOT_QUESTIONS.length;
  const isFiltering = debouncedQuery.trim().length > 0;

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <Sparkles className="size-4 shrink-0 text-primary" />
          <span className="truncate">Suggested Questions</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="min-w-0 space-y-2 px-4 pb-4">
        <AdminSearchInput
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Search questions…"
          disabled={disabled}
          aria-label="Search suggested questions"
        />
        {isFiltering ? (
          <p className="text-xs text-muted-foreground">
            {filteredCount} of {totalCount} questions
          </p>
        ) : null}
        <ScrollArea className={cn(compact && "max-h-[min(360px,55vh)]")}>
          <div className="space-y-4 pr-3">
            {filteredGroups.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No questions match your search.
              </p>
            ) : (
              filteredGroups.map((group) => (
                <div key={group.label} className="space-y-2">
                  {!isFiltering ? (
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {group.label}
                    </p>
                  ) : null}
                  <div
                    className={cn(
                      "grid gap-2",
                      compact ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
                    )}
                  >
                    {group.questions.map((question) => (
                      <Button
                        key={question}
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={disabled}
                        className="h-auto min-h-10 w-full justify-start whitespace-normal px-3 py-2.5 text-left text-sm font-normal leading-snug"
                        onClick={() => onSelect(question)}
                      >
                        {question}
                      </Button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
