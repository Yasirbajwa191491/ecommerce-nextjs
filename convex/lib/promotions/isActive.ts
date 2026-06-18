import type { Doc } from "../../_generated/dataModel";

export function isPromotionActive(
  promotion: Pick<Doc<"productPromotions">, "status" | "startAt" | "endAt">,
  now: number
): boolean {
  if (promotion.status !== "active") return false;
  return now >= promotion.startAt && now <= promotion.endAt;
}
