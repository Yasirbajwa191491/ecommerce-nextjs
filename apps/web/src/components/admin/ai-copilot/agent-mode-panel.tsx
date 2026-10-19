"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { agentStatusLabel } from "@convex/lib/agents/panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toastError, toastSuccess } from "@/lib/app-toast";

type AgentModePanelProps = {
  prefill?: string | null;
  prefillKey?: number;
};

export function AgentModePanel({ prefill, prefillKey = 0 }: AgentModePanelProps) {
  const [draft, setDraft] = useState("");
  const [runId, setRunId] = useState<Id<"agentRuns"> | null>(null);
  const [busy, setBusy] = useState(false);
  const startRun = useMutation(api.agents.startRun);
  const approve = useMutation(api.agents.approve);
  const reject = useMutation(api.agents.reject);
  const cancel = useMutation(api.agents.cancel);
  const run = useQuery(api.agents.getRun, runId ? { runId } : "skip");
  const history = usePaginatedQuery(api.agents.listRuns, {}, { initialNumItems: 8 });

  useEffect(() => {
    if (prefill) setDraft(prefill);
  }, [prefill, prefillKey]);

  async function submit() {
    const request = draft.trim();
    if (!request || busy) return;
    setBusy(true);
    try {
      const id = await startRun({ request });
      setRunId(id);
      setDraft("");
      toastSuccess("Agent run started");
    } catch (error) {
      toastError(error instanceof Error ? error.message : "Could not start the agent");
    } finally {
      setBusy(false);
    }
  }

  async function decide(kind: "approve" | "reject" | "cancel") {
    if (!runId || !run) return;
    setBusy(true);
    try {
      if (kind === "cancel") {
        await cancel({ runId });
      } else {
        const pending = run.approvals.find((approval) => approval.status === "pending");
        if (!pending) return;
        if (kind === "approve") await approve({ runId, approvalId: pending.id });
        if (kind === "reject") await reject({ runId, approvalId: pending.id });
      }
      toastSuccess(kind === "approve" ? "Approval recorded" : kind === "reject" ? "Draft rejected" : "Run cancelled");
    } catch (error) {
      toastError(error instanceof Error ? error.message : "Could not update the run");
    } finally {
      setBusy(false);
    }
  }

  const working = run && ["created", "planning", "running", "resuming"].includes(run.status);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Agent mode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label htmlFor="agent-request">Business request</Label>
          <Textarea
            id="agent-request"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Analyze declining headphone sales and prepare a promotional campaign."
            rows={4}
          />
          <Button type="button" onClick={submit} disabled={busy || draft.trim().length === 0}>
            {busy ? "Working…" : "Run agent"}
          </Button>
        </CardContent>
      </Card>

      {run ? (
        <Card>
          <CardHeader className="gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>Run</CardTitle>
              <Badge variant="outline">{agentStatusLabel(run.status)}</Badge>
              <Badge variant="secondary">{run.toolCallCount} tools</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{run.requestSummary}</p>
            {run.planSummary ? (
              <p className="text-sm">
                <span className="font-medium">Plan: </span>
                {run.planSummary}
              </p>
            ) : null}
            {working ? <p className="text-sm">The agent is working through the next bounded step.</p> : null}
            <ol className="space-y-2">
              {run.steps.map((step) => (
                <li key={`${step.stepIndex}-${step.toolName ?? step.kind}`} className="rounded-lg border p-3 text-sm">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="font-medium">{step.toolName ?? step.kind}</span>
                    <Badge variant="outline">{step.status}</Badge>
                    {step.factType ? <Badge variant="secondary">{step.factType}</Badge> : null}
                  </div>
                  <p>{step.summary}</p>
                </li>
              ))}
            </ol>
            {run.approvals
              .filter((approval) => approval.status === "pending")
              .map((approval) => (
                <Alert key={approval.id}>
                  <AlertTitle>Approval required</AlertTitle>
                  <AlertDescription className="space-y-3">
                    <p>{approval.summary}</p>
                    <p>Risk: {approval.risk}. Expires {new Date(approval.expiresAt).toLocaleString()}.</p>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" onClick={() => decide("approve")} disabled={busy}>
                        Approve draft
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => decide("reject")} disabled={busy}>
                        Reject
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            {run.report ? (
              <div className="space-y-2 text-sm">
                {run.report.businessInsights.length > 0 ? (
                  <div>
                    <p className="font-medium">Verified evidence</p>
                    <ul className="list-disc pl-5">
                      {run.report.businessInsights.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {run.report.recommendations.length > 0 ? (
                  <div>
                    <p className="font-medium">Recommendations</p>
                    <ul className="list-disc pl-5">
                      {run.report.recommendations.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {run.report.draftLinks.map((link) => (
                  <Link key={link.href} href={link.href} className="text-primary underline">
                    Open draft: {link.label}
                  </Link>
                ))}
                {run.report.limitations.length > 0 ? (
                  <p className="text-muted-foreground">Limitations: {run.report.limitations.join(" ")}</p>
                ) : null}
              </div>
            ) : null}
            {run.status === "failed" || run.status === "expired" ? (
              <Alert variant="destructive">
                <AlertTitle>{agentStatusLabel(run.status)}</AlertTitle>
                <AlertDescription>
                  {run.failureReason ?? "The run stopped."}
                  {run.errorCategory ? ` (${run.errorCategory})` : ""}
                </AlertDescription>
              </Alert>
            ) : null}
            {working || run.status === "waiting_for_approval" ? (
              <Button type="button" variant="outline" onClick={() => decide("cancel")} disabled={busy}>
                Cancel run
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Recent agent runs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {history.results.length === 0 ? (
            <p className="text-sm text-muted-foreground">No agent runs yet.</p>
          ) : (
            history.results.map((item) => (
              <button
                key={item._id}
                type="button"
                className="flex w-full flex-col gap-1 rounded-lg border p-3 text-left text-sm hover:bg-muted"
                onClick={() => setRunId(item._id)}
              >
                <span className="font-medium">{item.requestSummary}</span>
                <span className="text-muted-foreground">
                  {agentStatusLabel(item.status)} · {item.toolCallCount} tools · {item.approvalStatus} ·{" "}
                  {new Date(item.createdAt).toLocaleString()} · {Math.max(0, Math.round(item.durationMs / 1000))}s
                </span>
                {item.failureReason ? <span>{item.failureReason}</span> : null}
              </button>
            ))
          )}
          {history.status === "CanLoadMore" ? (
            <Button type="button" variant="outline" onClick={() => history.loadMore(8)}>
              Load more
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
