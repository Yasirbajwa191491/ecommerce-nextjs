import AsyncStorage from "@react-native-async-storage/async-storage";

export type CatalogLayout = "grid" | "list";

const STORAGE_KEY = "mobileCatalogLayout";

export async function readCatalogLayout(): Promise<CatalogLayout> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY);
    return value === "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
}

export async function writeCatalogLayout(layout: CatalogLayout): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, layout);
  } catch {
    // ignore persistence errors
  }
}
