/** A guest may create a profile. Later writes need the profile token or an order access token. */
export function canMutateCustomerProfile(args: {
  profileExists: boolean;
  storedToken?: string;
  providedToken?: string;
  orderAccessMatches: boolean;
}): boolean {
  if (!args.profileExists) return true;
  const provided = args.providedToken?.trim();
  if (provided && args.storedToken && provided === args.storedToken) return true;
  return args.orderAccessMatches;
}
