import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bookmark, Check, MessageCircleQuestion } from "lucide-react";
import type { CopilotResponseView } from "@/lib/ai-copilot-content";
import { CopilotInsightCards } from "./copilot-insight-cards";

type CopilotResponseCardProps = {
  response: CopilotResponseView;
  onSave?: () => void;
  onFollowUp?: (question: string) => void;
  saving?: boolean;
  showSave?: boolean;
};

export function CopilotResponseCard({
  response,
  onSave,
  onFollowUp,
  saving,
  showSave = true,
}: CopilotResponseCardProps) {
  return (
    <Card className="min-w-0 overflow-hidden border-primary/10 bg-card/80">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <CardTitle className="text-base font-semibold">Summary</CardTitle>
          {showSave && onSave ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSave}
              disabled={saving}
              className="w-full shrink-0 sm:w-auto"
            >
              <Bookmark className="mr-1.5 size-3.5" />
              {saving ? "Saving..." : "Save insight"}
            </Button>
          ) : null}
        </div>
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
          {response.summary}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {response.insightCards && response.insightCards.length > 0 ? (
          <CopilotInsightCards cards={response.insightCards} />
        ) : null}

        {response.keyFindings.length > 0 ? (
          <section>
            <h4 className="mb-2 text-sm font-semibold text-foreground">
              Key Findings
            </h4>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {response.keyFindings.map((finding) => (
                <li key={finding} className="flex gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{finding}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {response.recommendations.length > 0 ? (
          <section>
            <h4 className="mb-2 text-sm font-semibold text-foreground">
              Recommendations
            </h4>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {response.recommendations.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-primary">→</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {response.dataSourcesUsed.length > 0 ? (
          <section>
            <h4 className="mb-2 text-sm font-semibold text-foreground">
              Data Sources Used
            </h4>
            <div className="flex flex-wrap gap-2">
              {response.dataSourcesUsed.map((source) => (
                <Badge key={source} variant="secondary" className="gap-1.5">
                  <Check className="size-3" />
                  {source}
                </Badge>
              ))}
            </div>
          </section>
        ) : null}

        {response.followUpQuestions.length > 0 ? (
          <section>
            <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <MessageCircleQuestion className="size-4" />
              Suggested Follow-ups
            </h4>
            <div className="flex flex-col gap-2">
              {response.followUpQuestions.map((question) => (
                <Button
                  key={question}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto justify-start whitespace-normal px-3 py-2 text-left text-muted-foreground"
                  onClick={() => onFollowUp?.(question)}
                >
                  {question}
                </Button>
              ))}
            </div>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}
