/** Clock for server components. Callers pass the value in so render stays pure. */
export function readServerNow(): number {
  return Date.now();
}
