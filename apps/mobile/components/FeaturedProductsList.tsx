import { useQuery } from "convex/react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { api } from "@convex/_generated/api";

type FeaturedProduct = {
  _id: string;
  name: string;
  price: number;
  brand?: string;
};

export function FeaturedProductsList() {
  const products = useQuery(api.products.featured);

  if (products === undefined) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.muted}>Loading products from Convex…</Text>
      </View>
    );
  }

  if (products.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>No featured products yet</Text>
        <Text style={styles.muted}>Seed the web app database or mark products as featured.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={products as FeaturedProduct[]}
      keyExtractor={(item) => item._id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.name}>{item.name}</Text>
          {item.brand ? <Text style={styles.brand}>{item.brand}</Text> : null}
          <Text style={styles.price}>${item.price.toFixed(2)}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    gap: 12,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  brand: {
    marginTop: 4,
    fontSize: 14,
    color: "#6b7280",
  },
  price: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "700",
    color: "#059669",
  },
  muted: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
});
