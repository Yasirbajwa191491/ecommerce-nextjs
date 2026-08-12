export function normalizeCustomerEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeCustomerPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function customerKeyFromEmail(email: string): string {
  return normalizeCustomerEmail(email);
}

export function customerKeyFromPhone(phone: string): string {
  const digits = normalizeCustomerPhone(phone);
  return digits ? `phone:${digits}` : "";
}

export function resolveCustomerKey(
  email?: string,
  phone?: string
): string | undefined {
  const normalizedEmail = email?.trim();
  if (normalizedEmail) {
    return customerKeyFromEmail(normalizedEmail);
  }
  if (phone?.trim()) {
    const key = customerKeyFromPhone(phone);
    return key || undefined;
  }
  return undefined;
}

export function buildCacheKey(
  sectionType: string,
  identityType: "visitor" | "customer",
  identityKey: string,
  context?: { productId?: string; cartProductIds?: string[] }
): string {
  const parts = [sectionType, identityType, identityKey];
  if (context?.productId) parts.push(`p:${context.productId}`);
  if (context?.cartProductIds?.length) {
    parts.push(`c:${context.cartProductIds.slice(0, 5).join(",")}`);
  }
  return parts.join(":");
}
