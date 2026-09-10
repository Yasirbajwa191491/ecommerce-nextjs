export function resolveRouteOrderNumber(params: {
  id?: string;
  orderNumber?: string;
}): string | null {
  if (params.orderNumber?.trim()) {
    return params.orderNumber.trim();
  }

  const id = params.id?.trim();
  if (id?.startsWith("ORD-")) {
    return id;
  }

  return null;
}
