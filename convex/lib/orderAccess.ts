import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { normalizeEmail } from "./publicOrderDto";

const TOKEN_BYTES = 24;

export function generateOrderAccessToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function emailsMatch(stored: string, input: string): boolean {
  return normalizeEmail(stored) === normalizeEmail(input);
}

export function assertOrderAccess(
  order: Doc<"orders">,
  proof: { customerEmail?: string; accessToken?: string }
): void {
  const email = proof.customerEmail?.trim();
  const token = proof.accessToken?.trim();
  if (!email && !token) {
    throw new ConvexError("Order verification is required");
  }

  const emailOk = email ? emailsMatch(order.customerEmail, email) : false;
  const tokenOk = token && order.accessToken ? token === order.accessToken : false;

  if (emailOk || tokenOk) return;
  throw new ConvexError("Order verification failed");
}

export function hasOrderAccess(
  order: Doc<"orders">,
  proof: { customerEmail?: string; accessToken?: string }
): boolean {
  try {
    assertOrderAccess(order, proof);
    return true;
  } catch {
    return false;
  }
}

export function maskEmail(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.indexOf("@");
  if (at <= 0) return "***";
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const visible = local.slice(0, 1);
  return `${visible}***@${domain}`;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  return `***-***-${digits.slice(-4)}`;
}

export function maskCustomerName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Customer";
  return parts[0] ?? "Customer";
}
