"use client";

import { useCallback, useState } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminTableCard } from "@/components/admin/admin-table-card";
import { AdminTableInfiniteScroll } from "@/components/admin/admin-table-infinite-scroll";
import { VapiConversationsPanel } from "@/components/admin/vapi-conversations-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PAGE_SIZE = 10;

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function KpiCard({
  title,
  value,
  loading,
}: {
  title: string;
  value: number | undefined;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className="text-2xl font-semibold">{value ?? 0}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminAiAssistantPage() {
  const analytics = useQuery(api.vapi.admin.getAnalytics);
  const dailyAnalytics = useQuery(api.vapi.admin.getDailyAnalytics, { days: 14 });
  const setupInfo = useQuery(api.vapi.admin.getSetupInfo);

  const [leadSearch, setLeadSearch] = useState("");
  const [ticketSearch, setTicketSearch] = useState("");
  const [selectedTicket, setSelectedTicket] =
    useState<Doc<"vapiSupportTickets"> | null>(null);

  const leads = usePaginatedQuery(
    api.vapi.admin.listLeadsPaginated,
    { search: leadSearch || undefined },
    { initialNumItems: PAGE_SIZE }
  );

  const tickets = usePaginatedQuery(
    api.vapi.admin.listTicketsPaginated,
    { search: ticketSearch || undefined },
    { initialNumItems: PAGE_SIZE }
  );

  const leadsCanLoadMore = leads.status === "CanLoadMore";
  const leadsLoadingMore = leads.status === "LoadingMore";
  const handleLoadMoreLeads = useCallback(() => {
    if (leadsCanLoadMore) leads.loadMore(PAGE_SIZE);
  }, [leadsCanLoadMore, leads.loadMore]);

  const ticketsCanLoadMore = tickets.status === "CanLoadMore";
  const ticketsLoadingMore = tickets.status === "LoadingMore";
  const handleLoadMoreTickets = useCallback(() => {
    if (ticketsCanLoadMore) tickets.loadMore(PAGE_SIZE);
  }, [ticketsCanLoadMore, tickets.loadMore]);

  const updateLeadStatus = useMutation(api.vapi.admin.updateLeadStatus);
  const updateTicketStatus = useMutation(api.vapi.admin.updateTicketStatus);

  const handleLeadStatus = async (
    leadId: Id<"vapiLeads">,
    status: "new" | "contacted" | "converted"
  ) => {
    try {
      await updateLeadStatus({ leadId, status });
      toastSuccess("Lead status updated");
    } catch (error) {
      toastError(error, { fallback: "Failed to update lead" });
    }
  };

  const handleTicketStatus = async (
    ticketId: Id<"vapiSupportTickets">,
    status: "open" | "in_progress" | "resolved"
  ) => {
    try {
      await updateTicketStatus({ ticketId, status });
      toastSuccess("Ticket status updated");
    } catch (error) {
      toastError(error, { fallback: "Failed to update ticket" });
    }
  };

  const chartData =
    dailyAnalytics?.map((row) => ({
      date: row.dateKey.slice(5),
      conversations: row.conversations,
      searches: row.productSearches,
    })) ?? [];

  return (
    <>
      <AdminPageHeader
        title="AI Assistant"
        description="Monitor voice and chat sessions, full transcripts, tool calls, leads, and support escalations."
      />

      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList className="flex h-auto flex-wrap gap-1">
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
          <TabsTrigger value="setup">Setup</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="Total conversations"
              value={analytics?.totalConversations}
              loading={analytics === undefined}
            />
            <KpiCard
              title="Conversations today"
              value={analytics?.conversationsToday}
              loading={analytics === undefined}
            />
            <KpiCard
              title="Product searches"
              value={analytics?.productSearches}
              loading={analytics === undefined}
            />
            <KpiCard
              title="Order tracking requests"
              value={analytics?.orderTrackingRequests}
              loading={analytics === undefined}
            />
            <KpiCard
              title="Leads captured"
              value={analytics?.leadsCaptured}
              loading={analytics === undefined}
            />
            <KpiCard
              title="Human escalations"
              value={analytics?.humanEscalations}
              loading={analytics === undefined}
            />
            <KpiCard
              title="New leads"
              value={analytics?.newLeads}
              loading={analytics === undefined}
            />
            <KpiCard
              title="Open tickets"
              value={analytics?.openTickets}
              loading={analytics === undefined}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Daily activity (14 days)</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {dailyAnalytics === undefined ? (
                <Skeleton className="h-full w-full" />
              ) : chartData.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No analytics data yet. Conversations will appear here after customers
                  use the assistant.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis allowDecimals={false} fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="conversations" fill="#6254f3" name="Conversations" />
                    <Bar dataKey="searches" fill="#94a3b8" name="Product searches" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversations">
          <VapiConversationsPanel />
        </TabsContent>

        <TabsContent value="leads">
          <div className="mb-4 max-w-md">
            <Input
              placeholder="Search leads…"
              value={leadSearch}
              onChange={(event) => setLeadSearch(event.target.value)}
            />
          </div>
          <AdminTableCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.results.map((lead) => (
                  <TableRow key={lead._id}>
                    <TableCell>{lead.name}</TableCell>
                    <TableCell>{lead.email}</TableCell>
                    <TableCell className="max-w-xs truncate">{lead.message}</TableCell>
                    <TableCell>
                      <Select
                        value={lead.status}
                        onValueChange={(value) =>
                          void handleLeadStatus(
                            lead._id,
                            value as "new" | "contacted" | "converted"
                          )
                        }
                      >
                        <SelectTrigger className="h-8 w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="converted">Converted</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs">{formatDate(lead.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </AdminTableCard>
          <AdminTableInfiniteScroll
            enabled={leadsCanLoadMore}
            isLoadingMore={leadsLoadingMore}
            onLoadMore={handleLoadMoreLeads}
          />
        </TabsContent>

        <TabsContent value="support">
          <div className="mb-4 max-w-md">
            <Input
              placeholder="Search tickets…"
              value={ticketSearch}
              onChange={(event) => setTicketSearch(event.target.value)}
            />
          </div>
          <AdminTableCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.results.map((ticket) => (
                  <TableRow key={ticket._id}>
                    <TableCell>{ticket.subject}</TableCell>
                    <TableCell>
                      <div className="text-sm">{ticket.name}</div>
                      <div className="text-xs text-muted-foreground">{ticket.email}</div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={ticket.status}
                        onValueChange={(value) =>
                          void handleTicketStatus(
                            ticket._id,
                            value as "open" | "in_progress" | "resolved"
                          )
                        }
                      >
                        <SelectTrigger className="h-8 w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_progress">In progress</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs">{formatDate(ticket.createdAt)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedTicket(ticket)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </AdminTableCard>
          <AdminTableInfiniteScroll
            enabled={ticketsCanLoadMore}
            isLoadingMore={ticketsLoadingMore}
            onLoadMore={handleLoadMoreTickets}
          />
        </TabsContent>

        <TabsContent value="setup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Webhook URL</CardTitle>
            </CardHeader>
            <CardContent>
              {setupInfo === undefined ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <>
                  <code className="block rounded-md bg-muted px-3 py-2 text-sm break-all">
                    {setupInfo.webhookUrl}
                  </code>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Register this URL in your Vapi assistant server configuration.
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Environment checklist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {setupInfo?.envChecklist.map((item) => (
                <div key={item.key} className="rounded-lg border p-3">
                  <p className="font-medium text-sm">{item.key}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Location: {item.location}
                  </p>
                </div>
              ))}
              <p className="text-sm text-muted-foreground">
                Run{" "}
                <code className="rounded bg-muted px-1">
                  node scripts/setup-vapi-assistant.mjs
                </code>{" "}
                after setting VAPI_API_KEY and CONVEX_SITE_URL to provision the assistant.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTicket?.subject}</DialogTitle>
          </DialogHeader>
          <pre className="whitespace-pre-wrap text-sm text-muted-foreground">
            {selectedTicket?.conversationTranscript}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  );
}
