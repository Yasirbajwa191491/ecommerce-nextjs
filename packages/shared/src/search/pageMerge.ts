export function mergeSearchPage<T>(args: {
  requestId: number;
  currentRequestId: number;
  mode: "replace" | "append";
  previous: T[];
  incoming: T[];
}): { products: T[]; applied: boolean } {
  if (args.requestId !== args.currentRequestId) {
    return { products: args.previous, applied: false };
  }
  return {
    applied: true,
    products:
      args.mode === "append" ? [...args.previous, ...args.incoming] : args.incoming,
  };
}
