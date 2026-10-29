export function validateSeedCredentials(email: string | undefined, password: string | undefined) {
  if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password ||
      password.length < 16 || /^(?:password|admin|changeme|example|test|123456)/i.test(password)) {
    throw new Error("Configure ADMIN_SEED_EMAIL and a unique ADMIN_SEED_PASSWORD of at least 16 characters.");
  }
  return { email: email.trim().toLowerCase(), password };
}
