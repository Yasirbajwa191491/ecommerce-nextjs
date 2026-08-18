import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function ExploreScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Monorepo mobile app</Text>
      <Text style={styles.body}>
        This Expo app lives in apps/mobile and shares the Convex backend at the repo root.
        Run npm run dev for the Next.js web app and npm run mobile for this app.
      </Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Next steps</Text>
        <Text style={styles.body}>• Add auth (Better Auth + Convex)</Text>
        <Text style={styles.body}>• Build product detail and cart screens</Text>
        <Text style={styles.body}>• Move shared logic into packages/shared</Text>
        <Text style={styles.body}>• Test on device with Expo Go</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: "#374151",
  },
  card: {
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
    gap: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
});
