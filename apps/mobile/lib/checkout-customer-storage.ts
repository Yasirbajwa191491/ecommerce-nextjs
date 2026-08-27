import { getSecureItem, removeSecureItem, setSecureItem } from "@/lib/secure-storage";

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
    const raw = await getSecureItem(STORAGE_KEY);
    if (!raw) return null;
    return migrateLegacyCustomer(JSON.parse(raw) as LegacySavedCheckoutCustomer);
  } catch {
    return null;
  }
}

export async function saveCheckoutCustomer(customer: SavedCheckoutCustomer): Promise<void> {
  await setSecureItem(STORAGE_KEY, JSON.stringify(customer));
}

const LAST_ORDER_NUMBER_KEY = "lastOrderNumber";
const LAST_ORDER_EMAIL_KEY = "lastOrderEmail";
const LAST_ORDER_ACCESS_TOKEN_KEY = "lastOrderAccessToken";
const LAST_PENDING_STRIPE_KEY = "lastPendingStripeOrder";

export type LastOrderInfo = {
  orderNumber: string | null;
  email: string | null;
  accessToken: string | null;
};

export async function saveLastOrderInfo(
  orderNumber: string,
  email: string,
  accessToken?: string
): Promise<void> {
  await Promise.all([
    setSecureItem(LAST_ORDER_NUMBER_KEY, orderNumber),
    setSecureItem(LAST_ORDER_EMAIL_KEY, email),
    accessToken
      ? setSecureItem(LAST_ORDER_ACCESS_TOKEN_KEY, accessToken)
      : removeSecureItem(LAST_ORDER_ACCESS_TOKEN_KEY),
  ]);
}

export async function loadLastOrderInfo(): Promise<LastOrderInfo> {
  const [orderNumber, email, accessToken] = await Promise.all([
    getSecureItem(LAST_ORDER_NUMBER_KEY),
    getSecureItem(LAST_ORDER_EMAIL_KEY),
    getSecureItem(LAST_ORDER_ACCESS_TOKEN_KEY),
  ]);
  return { orderNumber, email, accessToken };
}

export async function clearLastOrderInfo(): Promise<void> {
  await Promise.all([
    removeSecureItem(LAST_ORDER_NUMBER_KEY),
    removeSecureItem(LAST_ORDER_EMAIL_KEY),
    removeSecureItem(LAST_ORDER_ACCESS_TOKEN_KEY),
    removeSecureItem(LAST_PENDING_STRIPE_KEY),
  ]);
}

export async function savePendingStripeOrder(info: {
  orderNumber: string;
  email: string;
  accessToken?: string;
}): Promise<void> {
  await setSecureItem(LAST_PENDING_STRIPE_KEY, JSON.stringify(info));
}

export async function loadPendingStripeOrder(): Promise<{
  orderNumber: string;
  email: string;
  accessToken?: string;
} | null> {
  try {
    const raw = await getSecureItem(LAST_PENDING_STRIPE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      orderNumber?: string;
      email?: string;
      accessToken?: string;
    };
    if (!parsed.orderNumber || !parsed.email) return null;
    return {
      orderNumber: parsed.orderNumber,
      email: parsed.email,
      accessToken: parsed.accessToken,
    };
  } catch {
    return null;
  }
}

export async function clearPendingStripeOrder(): Promise<void> {
  await removeSecureItem(LAST_PENDING_STRIPE_KEY);
}

export function createIdempotencyKey(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
