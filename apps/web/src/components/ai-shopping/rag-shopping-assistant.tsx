"use client";

import { useState } from "react";
import Link from "next/link";
import { useAction, useQuery } from "convex/react";
import { Loader2, RotateCcw } from "lucide-react";
import { api } from "@convex/_generated/api";
import {
  ragAssistantState,
  ragAssistantVisible,
  visibleCitations,
  type RagAskView,
} from "@ecommerce/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function sessionKey(): string {
  const storageKey = "rag-shopping-session";
  const existing = window.sessionStorage.getItem(storageKey);
  if (existing && /^[A-Za-z0-9-]{8,64}$/.test(existing)) return existing;
  const created = `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  window.sessionStorage.setItem(storageKey, created);
  return created;
}

export function RagShoppingAssistant() {
  const status = useQuery(api.rag.publicStatus, {});
  const ask = useAction(api.rag.ask);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [result, setResult] = useState<RagAskView | null>(null);

  if (!ragAssistantVisible(status?.enabled)) return null;

  const view = ragAssistantState({
    enabled: status?.enabled,
    loading,
    error,
    result,
  });
  const citations = result ? visibleCitations(result.citations) : [];

  const submit = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(false);
    try {
      const response = await ask({ question: trimmed, sessionKey: sessionKey() });
      setResult(response);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Catalog assistant</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Ask about products, warranty, shipping, or returns. Answers use retrieved store records.
        </p>
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            void submit(question);
          }}
        >
          <Input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask about a product or policy"
            aria-label="Catalog question"
            maxLength={500}
            disabled={loading}
          />
          <Button type="submit" disabled={loading || !question.trim()}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : "Ask"}
          </Button>
        </form>
        {view === "loading" ? <p className="text-sm">Looking up store records…</p> : null}
        {view === "error" ? (
          <div className="space-y-2">
            <p className="text-sm">The catalog assistant could not answer just now.</p>
            <Button type="button" variant="outline" onClick={() => void submit(question)}>
              <RotateCcw className="mr-2 size-4" />
              Retry
            </Button>
          </div>
        ) : null}
        {view === "empty" ? (
          <p className="text-sm">{result?.answer || "No matching store records were found."}</p>
        ) : null}
        {view === "answered" && result ? (
          <div className="space-y-3">
            <p className="text-sm whitespace-pre-wrap">{result.answer}</p>
            {result.products.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {result.products.map((product) => (
                  <li key={product.id}>
                    <Link className="underline" href={product.url}>
                      {product.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
            {citations.length > 0 ? (
              <ul className="space-y-1 text-sm text-muted-foreground">
                {citations.map((citation) => (
                  <li key={`${citation.sourceType}-${citation.sourceId}-${citation.section}`}>
                    <Link className="underline" href={citation.url}>
                      {citation.title}
                      {citation.section ? ` · ${citation.section}` : ""}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
