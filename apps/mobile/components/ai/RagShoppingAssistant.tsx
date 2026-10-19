import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { router, type Href } from "expo-router";

import { Button } from "@/components/ui/Button";
import { SearchBarInput } from "@/components/ui/SearchBar";
import { spacing, typography } from "@/constants/theme";
import { api } from "@/lib/convex-api";
import { useTheme } from "@/providers/theme-context";
import {
  ragAssistantState,
  ragAssistantVisible,
  safeCitationHref,
  visibleCitations,
  type RagAskView,
} from "@ecommerce/shared";

function sessionKey() {
  return `mob-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function RagShoppingAssistant() {
  const status = useQuery(api.rag.publicStatus, {});
  const ask = useAction(api.rag.ask);
  const { colors } = useTheme();
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [result, setResult] = useState<RagAskView | null>(null);
  const [session] = useState(sessionKey);

  if (!ragAssistantVisible(status?.enabled)) return null;
  const view = ragAssistantState({ enabled: true, loading, error, result });
  const citations = result ? visibleCitations(result.citations) : [];

  const submit = async () => {
    const trimmed = question.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(false);
    try {
      setResult(await ask({ question: trimmed, sessionKey: session }));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: colors.text }]}>Catalog assistant</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>
        Ask about products or store policies. This stays hidden until the store enables it.
      </Text>
      <SearchBarInput
        value={question}
        onChangeText={setQuestion}
        placeholder="Ask about a product or policy"
        showVisualSearch={false}
        returnKeyType="send"
        onSubmitEditing={() => void submit()}
      />
      <Button label={loading ? "Looking up…" : "Ask"} onPress={() => void submit()} disabled={loading || !question.trim()} />
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {view === "error" ? (
        <View>
          <Text style={{ color: colors.text }}>The catalog assistant could not answer just now.</Text>
          <Button label="Retry" variant="outline" onPress={() => void submit()} />
        </View>
      ) : null}
      {view === "empty" ? (
        <Text style={{ color: colors.text }}>{result?.answer || "No matching store records were found."}</Text>
      ) : null}
      {view === "answered" && result ? (
        <View style={styles.answer}>
          <Text style={{ color: colors.text }}>{result.answer}</Text>
          {result.products.map((product) => (
            <Pressable key={product.id} onPress={() => router.push(`/product/${product.id}` as Href)}>
              <Text style={[styles.link, { color: colors.primary }]}>{product.name}</Text>
            </Pressable>
          ))}
          {citations.map((citation) => {
            const href = safeCitationHref(citation.url);
            if (!href) return null;
            return (
              <Pressable
                key={`${citation.sourceType}-${citation.sourceId}`}
                onPress={() => router.push(href as Href)}
              >
                <Text style={[styles.link, { color: colors.primary }]}>
                  {citation.title}
                  {citation.section ? ` · ${citation.section}` : ""}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md, marginTop: spacing.xl },
  title: { fontSize: typography.lg, fontWeight: "600" },
  body: { fontSize: typography.base },
  answer: { gap: spacing.sm },
  link: { textDecorationLine: "underline" },
});
