export type PushTokenDeliveryCandidate = {
  expoPushToken: string;
  executionEnvironment?: string;
};

const STANDALONE_ENVIRONMENTS = new Set(["standalone", "bare"]);

export function isStandalonePushEnvironment(environment: string | undefined): boolean {
  if (!environment) {
    return false;
  }
  return STANDALONE_ENVIRONMENTS.has(environment);
}

/** Prefer installed app tokens over Expo Go when both are registered. */
export function selectPushTokensForDelivery(
  tokens: PushTokenDeliveryCandidate[]
): PushTokenDeliveryCandidate[] {
  const standaloneTokens = tokens.filter((token) =>
    isStandalonePushEnvironment(token.executionEnvironment)
  );

  if (standaloneTokens.length > 0) {
    return standaloneTokens;
  }

  return tokens;
}
