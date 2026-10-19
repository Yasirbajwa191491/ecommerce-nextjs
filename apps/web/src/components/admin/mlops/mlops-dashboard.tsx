"use client";

import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DashboardSection } from "@/components/admin/dashboard/dashboard-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toastError, toastSuccess } from "@/lib/app-toast";

const FAMILIES = ["content", "collaborative", "hybrid", "neural", "demand_forecast", "rag_index"] as const;

type Family = (typeof FAMILIES)[number];

export function MlopsDashboard() {
  const dashboard = useQuery(api.mlops.dashboard, {});
  const register = useMutation(api.mlops.registerModel);
  const approve = useMutation(api.mlops.approveModel);
  const reject = useMutation(api.mlops.rejectModel);
  const activate = useMutation(api.mlops.requestActivation);
  const rollback = useMutation(api.mlops.requestRollback);
  const requestJob = useMutation(api.mlops.requestRetraining);
  const acknowledge = useMutation(api.mlops.acknowledgeAlert);
  const validate = useAction(api.mlopsActions.validateRegisteredModel);
  const [family, setFamily] = useState<Family>("content");
  const [modelVersion, setModelVersion] = useState("content-v1");
  const [checksum, setChecksum] = useState("");
  const [fingerprint, setFingerprint] = useState("local");
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);

  if (dashboard === undefined) {
    return (
      <DashboardSection title="MLOps" loading>
        <span />
      </DashboardSection>
    );
  }

  const selectedModel = dashboard.models.find((model) => model.modelId === selected) ?? dashboard.models[0];

  async function onRegister() {
    setBusy(true);
    try {
      const created = await register({
        modelFamily: family,
        modelVersion,
        artifactVersion: modelVersion,
        featureSchemaVersion: schemaFor(family),
        datasetFingerprint: fingerprint,
        datasetType: "synthetic",
        artifactChecksum: checksum.trim(),
        trainingTimestamp: new Date().toISOString(),
        metadataJson: JSON.stringify({ serialization: family === "hybrid" ? "json" : "joblib" }),
      });
      setSelected(created.modelId);
      toastSuccess("Model metadata registered. This does not deploy weights.");
    } catch (error) {
      toastError(error instanceof Error ? error.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="MLOps"
        description="Registry, evaluation, and retraining controls. Promotion updates metadata only. Customer-facing models stay on their existing gates."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <GateCard title="Monitoring" reason={dashboard.gates.monitoring.reason} enabled={dashboard.gates.monitoring.enabled} />
        <GateCard title="Drift detection" reason={dashboard.gates.drift.reason} enabled={dashboard.gates.drift.enabled} />
        <GateCard title="Retraining requests" reason={dashboard.gates.retraining.reason} enabled={dashboard.gates.retraining.enabled} />
      </div>
      <Tabs defaultValue="registry">
        <TabsList>
          <TabsTrigger value="registry">Registry</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="drift">Drift</TabsTrigger>
          <TabsTrigger value="retraining">Retraining</TabsTrigger>
        </TabsList>
        <TabsContent value="registry" className="space-y-4">
          <DashboardSection
            title="Register model metadata"
            description="Checksums identify a trusted artifact. A path cannot be submitted from this form."
          >
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mlops-family">Model family</Label>
                <Select value={family} onValueChange={(value) => setFamily(value as Family)}>
                  <SelectTrigger id="mlops-family">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FAMILIES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mlops-version">Model version</Label>
                <Input id="mlops-version" value={modelVersion} onChange={(event) => setModelVersion(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mlops-checksum">Artifact checksum</Label>
                <Input id="mlops-checksum" value={checksum} onChange={(event) => setChecksum(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mlops-fingerprint">Dataset fingerprint</Label>
                <Input id="mlops-fingerprint" value={fingerprint} onChange={(event) => setFingerprint(event.target.value)} />
              </div>
            </div>
            <Button className="mt-3" size="sm" onClick={onRegister} disabled={busy}>
              Register metadata
            </Button>
          </DashboardSection>
          <DashboardSection
            title="Registered versions"
            empty={dashboard.models.length === 0}
            emptyTitle="No models registered"
            emptyDescription="Register metadata after the Python CLI validates a trusted artifact."
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Family</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Lifecycle</TableHead>
                  <TableHead>Artifact</TableHead>
                  <TableHead>Runtime</TableHead>
                  <TableHead>Evaluation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.models.map((model) => (
                  <TableRow key={model.modelId} onClick={() => setSelected(model.modelId)} className="cursor-pointer">
                    <TableCell>{model.modelFamily}</TableCell>
                    <TableCell>{model.modelVersion}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{model.lifecycleStatus}</Badge>
                    </TableCell>
                    <TableCell>{model.artifactAvailability}</TableCell>
                    <TableCell>{model.runtimeStatus}</TableCell>
                    <TableCell>{model.evaluationStatus}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DashboardSection>
          {selectedModel ? (
            <DashboardSection
              title={selectedModel.modelId}
              description={`Trained ${selectedModel.trainingTimestamp}. Fingerprint ${selectedModel.datasetFingerprint}. Schema ${selectedModel.featureSchemaVersion}.`}
            >
              <p className="mb-3 text-sm text-muted-foreground">
                Activation requests stay pending until a deployment restart loads weights. Approving a row does not switch the live model.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || selectedModel.modelFamily === "rag_index"}
                  onClick={() =>
                    run(
                      () =>
                        validate({
                          modelId: selectedModel.modelId,
                          modelFamily: selectedModel.modelFamily,
                        }),
                      setBusy,
                      "Validation recorded"
                    )
                  }
                >
                  Validate artifact
                </Button>
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    run(
                      () =>
                        approve({
                          modelId: selectedModel.modelId,
                          reason: "admin review",
                          acceptSynthetic: selectedModel.datasetType === "synthetic",
                        }),
                      setBusy,
                      "Approved in the registry"
                    )
                  }
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    run(
                      () => reject({ modelId: selectedModel.modelId, reason: "admin rejected" }),
                      setBusy,
                      "Candidate rejected"
                    )
                  }
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    run(
                      () =>
                        activate({
                          modelId: selectedModel.modelId,
                          artifactAvailable: selectedModel.artifactAvailability === "available",
                          reason: "request activation",
                        }),
                      setBusy,
                      "Activation is pending deployment"
                    )
                  }
                >
                  Request activation
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    run(
                      () => rollback({ modelFamily: selectedModel.modelFamily, reason: "rollback" }),
                      setBusy,
                      "Rollback recorded. Serving weights were not swapped."
                    )
                  }
                >
                  Request rollback
                </Button>
              </div>
            </DashboardSection>
          ) : null}
        </TabsContent>
        <TabsContent value="monitoring">
          <DashboardSection
            title="Monitoring aggregates"
            description="Counts only. Customer prompts are not stored."
            empty={!dashboard.gates.monitoring.enabled && dashboard.monitoring.length === 0}
            emptyTitle="Monitoring is off"
            emptyDescription="Turn on Enable MLOps Monitoring and MLOPS_MONITORING_ENABLED before recording aggregates."
          >
            <Freshness rag={dashboard.rag} forecast={dashboard.forecast} shadow={dashboard.shadow} quality={dashboard.forecastQuality} snapshot={dashboard.stockSnapshot} />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bucket</TableHead>
                  <TableHead>Family</TableHead>
                  <TableHead>Requests</TableHead>
                  <TableHead>Failures</TableHead>
                  <TableHead>Fallbacks</TableHead>
                  <TableHead>Max latency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.monitoring.map((row) => (
                  <TableRow key={`${row.modelFamily}:${row.modelVersion}:${row.timeBucket}`}>
                    <TableCell>{row.timeBucket}</TableCell>
                    <TableCell>{row.modelFamily}</TableCell>
                    <TableCell>{row.requestCount}</TableCell>
                    <TableCell>{row.failureCount}</TableCell>
                    <TableCell>{row.fallbackCount}</TableCell>
                    <TableCell>{row.latencyMaxMs}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DashboardSection>
        </TabsContent>
        <TabsContent value="drift">
          <DashboardSection
            title="Drift alerts"
            empty={dashboard.alerts.length === 0}
            emptyTitle="No drift alerts"
            emptyDescription={
              dashboard.gates.drift.enabled
                ? "Alerts appear after two consecutive warning or critical windows."
                : "Drift detection is off until both the admin setting and deployment gate are enabled."
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Feature</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Samples</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.alerts.map((alert) => (
                  <TableRow key={alert.fingerprint}>
                    <TableCell>{alert.featureName}</TableCell>
                    <TableCell>{alert.severity}</TableCell>
                    <TableCell>{alert.driftScore ?? "insufficient"}</TableCell>
                    <TableCell>{alert.sampleSize}</TableCell>
                    <TableCell>{alert.status}</TableCell>
                    <TableCell>
                      {alert.status === "open" ? (
                        <Button size="sm" variant="outline" onClick={() => run(() => acknowledge({ fingerprint: alert.fingerprint }), setBusy, "Alert acknowledged")}>
                          Acknowledge
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DashboardSection>
        </TabsContent>
        <TabsContent value="retraining">
          <DashboardSection
            title="Retraining jobs"
            description="Requests are allowlisted. Nothing here runs a shell command or promotes a model."
            empty={dashboard.jobs.length === 0}
            emptyTitle="No retraining requests"
            emptyDescription={
              dashboard.gates.retraining.enabled
                ? "Request a job for content, collaborative, neural, forecast, or hybrid configuration."
                : "Retraining requests stay off until both gates are enabled."
            }
          >
            <Button
              size="sm"
              className="mb-3"
              disabled={!dashboard.gates.retraining.enabled || busy}
              onClick={() =>
                run(
                  () => requestJob({ jobType: "content_retrain", datasetLabel: "synthetic", reason: "local synthetic refresh" }),
                  setBusy,
                  "Retraining requested. It will not deploy."
                )
              }
            >
              Request synthetic content retrain
            </Button>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Dataset</TableHead>
                  <TableHead>Candidate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.jobs.map((job) => (
                  <TableRow key={job.jobId}>
                    <TableCell>{job.jobType}</TableCell>
                    <TableCell>{job.state}</TableCell>
                    <TableCell>{job.datasetReadiness}</TableCell>
                    <TableCell>{job.candidateModelId ?? "not registered"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DashboardSection>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function schemaFor(family: Family): string {
  if (family === "content") return "content-features-v1";
  if (family === "demand_forecast") return "forecast-features-v1";
  if (family === "hybrid") return "hybrid-config-v1";
  if (family === "rag_index") return "rag-index-v1";
  return "behavioral-implicit-v1";
}

function GateCard({ title, enabled, reason }: { title: string; enabled: boolean; reason: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{enabled ? "Ready" : reason.replaceAll("_", " ")}</p>
    </div>
  );
}

function Freshness({
  rag,
  forecast,
  shadow,
  quality,
  snapshot,
}: {
  rag: { embeddingVersion: string; reindexStatus: string } | null;
  forecast: { dataCutoff: string; modelVersion: string } | null;
  shadow: { note: string; fallbackCount: number } | null;
  quality: { note: string; status: string; observationCount: number } | null;
  snapshot: { snapshotDate: string; recordedCount: number; status: string } | null;
}) {
  return (
    <div className="mb-4 space-y-1 text-sm text-muted-foreground">
      <p>Forecast cutoff: {forecast ? `${forecast.modelVersion} through ${forecast.dataCutoff}` : "no published forecast"}</p>
      <p>RAG index: {rag ? `${rag.embeddingVersion} (${rag.reindexStatus})` : "no index state"}</p>
      <p>Shadow: {shadow ? `${shadow.fallbackCount} fallbacks. ${shadow.note}` : "no shadow run"}</p>
      <p>Sales coverage: {quality ? `${quality.status}, ${quality.observationCount} observed days. ${quality.note}` : "not built"}</p>
      <p>Stock snapshots: {snapshot ? `${snapshot.snapshotDate} (${snapshot.recordedCount}, ${snapshot.status})` : "not collecting"}</p>
    </div>
  );
}

async function run(task: () => Promise<unknown>, setBusy: (value: boolean) => void, success: string) {
  setBusy(true);
  try {
    await task();
    toastSuccess(success);
  } catch (error) {
    toastError(error instanceof Error ? error.message : "Request failed");
  } finally {
    setBusy(false);
  }
}
