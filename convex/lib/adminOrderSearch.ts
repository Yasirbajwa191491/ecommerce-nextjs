export function orderMatchesAdminTextSearch(
  order: {
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
  },
  search: string
): boolean {
  const term = search.trim().toLowerCase();
  if (!term) return true;
  const phoneTerm = term.replace(/\D/g, "");
  const phone = order.customerPhone.replace(/\D/g, "");
  return (
    order.orderNumber.toLowerCase().includes(term) ||
    order.customerName.toLowerCase().includes(term) ||
    order.customerEmail.toLowerCase().includes(term) ||
    (phoneTerm.length > 0 && phone.includes(phoneTerm))
  );
}

export function orderMatchesAdminPhoneFilter(customerPhone: string, filter: string): boolean {
  const term = filter.replace(/\D/g, "");
  if (!term) return false;
  return customerPhone.replace(/\D/g, "").includes(term);
}
