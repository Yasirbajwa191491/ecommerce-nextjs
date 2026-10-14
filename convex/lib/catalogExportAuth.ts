export function catalogExportTokenMatches(
  provided: string | null | undefined,
  expected: string | undefined
): boolean {
  if (!expected || !provided) return false;
  const length = Math.max(provided.length, expected.length);
  let mismatch = provided.length === expected.length ? 0 : 1;
  for (let index = 0; index < length; index += 1) {
    const left = provided.charCodeAt(index) || 0;
    const right = expected.charCodeAt(index) || 0;
    mismatch |= left ^ right;
  }
  return mismatch === 0;
}

export function bearerToken(authorization: string | null): string {
  if (!authorization?.startsWith("Bearer ")) return "";
  return authorization.slice("Bearer ".length).trim();
}
