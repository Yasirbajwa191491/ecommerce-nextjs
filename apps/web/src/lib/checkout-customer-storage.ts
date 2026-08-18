export type SavedCheckoutCustomer = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  notes?: string;
};

const STORAGE_KEY = "checkoutCustomer";

export function loadCheckoutCustomer(): SavedCheckoutCustomer | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedCheckoutCustomer;
  } catch {
    return null;
  }
}

export function saveCheckoutCustomer(customer: SavedCheckoutCustomer): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customer));
}

export function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `checkout-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
