import AsyncStorage from "@react-native-async-storage/async-storage";

export type SavedCheckoutCustomer = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  notes?: string;
};

const STORAGE_KEY = "checkoutCustomer";

type LegacySavedCheckoutCustomer = SavedCheckoutCustomer & {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
};

function migrateLegacyCustomer(raw: LegacySavedCheckoutCustomer): SavedCheckoutCustomer {
  if (raw.address?.trim()) {
    return {
      fullName: raw.fullName,
      email: raw.email,
      phone: raw.phone,
      address: raw.address,
      notes: raw.notes,
    };
  }

  const parts = [
    raw.street?.trim(),
    raw.city?.trim(),
    raw.state?.trim(),
    raw.postalCode?.trim(),
    raw.country?.trim(),
  ].filter(Boolean);

  return {
    fullName: raw.fullName,
    email: raw.email,
    phone: raw.phone,
    address: parts.join(", "),
    notes: raw.notes,
  };
}

export async function loadCheckoutCustomer(): Promise<SavedCheckoutCustomer | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return migrateLegacyCustomer(JSON.parse(raw) as LegacySavedCheckoutCustomer);
  } catch {
    return null;
  }
}

export async function saveCheckoutCustomer(customer: SavedCheckoutCustomer): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(customer));
}

const LAST_ORDER_NUMBER_KEY = "lastOrderNumber";
const LAST_ORDER_EMAIL_KEY = "lastOrderEmail";

export async function saveLastOrderInfo(orderNumber: string, email: string): Promise<void> {
  await AsyncStorage.multiSet([
    [LAST_ORDER_NUMBER_KEY, orderNumber],
    [LAST_ORDER_EMAIL_KEY, email],
  ]);
}

export async function loadLastOrderInfo(): Promise<{
  orderNumber: string | null;
  email: string | null;
}> {
  const [[, orderNumber], [, email]] = await AsyncStorage.multiGet([
    LAST_ORDER_NUMBER_KEY,
    LAST_ORDER_EMAIL_KEY,
  ]);
  return { orderNumber, email };
}

export async function clearLastOrderInfo(): Promise<void> {
  await AsyncStorage.multiRemove([LAST_ORDER_NUMBER_KEY, LAST_ORDER_EMAIL_KEY]);
}

export function createIdempotencyKey(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
