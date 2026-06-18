import { format, formatDistanceToNow, isToday, isTomorrow } from "date-fns";

/** Format a timestamp for `<input type="datetime-local" />` in the user's local timezone. */
export function toDatetimeLocalValue(timestamp: number): string {
  const date = new Date(timestamp);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Parse a `datetime-local` value to epoch ms (local timezone). */
export function fromDatetimeLocalValue(value: string): number {
  return new Date(value).getTime();
}

export function formatPromotionEndsAt(
  endAt: number,
  now: number = Date.now()
): string {
  const end = new Date(endAt);
  const msLeft = endAt - now;
  if (msLeft <= 0) return "Offer ended";

  if (msLeft < 60 * 60 * 1000) {
    return `Ends in ${formatDistanceToNow(end)}`;
  }
  if (isToday(end)) {
    return `Ends today at ${format(end, "h:mm a")}`;
  }
  if (isTomorrow(end)) {
    return `Ends tomorrow at ${format(end, "h:mm a")}`;
  }
  if (msLeft < 7 * 24 * 60 * 60 * 1000) {
    return `Ends ${format(end, "EEEE")} at ${format(end, "h:mm a")}`;
  }
  return `Ends ${format(end, "MMM d, yyyy")} at ${format(end, "h:mm a")}`;
}

export function formatPromotionEndsAtCompact(
  endAt: number,
  now: number = Date.now()
): string {
  const end = new Date(endAt);
  const msLeft = endAt - now;
  if (msLeft <= 0) return "Ended";

  if (msLeft < 60 * 60 * 1000) {
    return `Ends in ${formatDistanceToNow(end)}`;
  }
  if (isToday(end)) {
    return `Ends ${format(end, "h:mm a")}`;
  }
  if (msLeft < 7 * 24 * 60 * 60 * 1000) {
    return `Ends ${format(end, "EEE, MMM d")}`;
  }
  return `Ends ${format(end, "MMM d, yyyy")}`;
}
