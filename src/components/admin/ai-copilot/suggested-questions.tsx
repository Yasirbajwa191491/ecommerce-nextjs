import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import { SUGGESTED_COPILOT_QUESTIONS } from "@/lib/ai-copilot-content";

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
  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <Sparkles className="size-4 shrink-0 text-primary" />
          <span className="truncate">Suggested Questions</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="min-w-0 px-4 pb-4">
        <ScrollArea
          className={cn(compact && "max-h-[min(360px,55vh)]")}
        >
          <div
            className={cn(
              "grid gap-2 pr-3",
              compact
                ? "grid-cols-1 sm:grid-cols-2"
                : "grid-cols-1"
            )}
          >
            {SUGGESTED_COPILOT_QUESTIONS.map((question) => (
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
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
