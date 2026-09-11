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

export function resolveRouteCustomerEmail(params: {
  customerEmail?: string;
  email?: string;
}): string | null {
  const fromNotification = params.customerEmail?.trim();
  if (fromNotification) {
    return fromNotification;
  }

  const fromTracking = params.email?.trim();
  if (fromTracking) {
    return fromTracking;
  }

  return null;
}

