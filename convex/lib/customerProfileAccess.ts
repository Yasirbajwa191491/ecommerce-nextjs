/** Guest order creation does not establish ownership of an email or its profile. */
export function canMutateCustomerProfile(args: {
  profileExists: boolean;
  storedToken?: string;
  providedToken?: string;
}): boolean {
  if (!args.profileExists) return true;
  const provided = args.providedToken?.trim();
  return Boolean(provided && args.storedToken && provided === args.storedToken);
}
