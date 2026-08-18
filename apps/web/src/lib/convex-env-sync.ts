export const RESEND_FROM_ENV_KEY = "RESEND_FROM_EMAIL";

export type ConvexEnvSyncResult =
  | { synced: true }
  | {
      synced: false;
      reason: "missing_deploy_key" | "api_error";
      status?: number;
      message?: string;
    };

export async function updateConvexEnvironmentVariable(
  name: string,
  value: string
): Promise<ConvexEnvSyncResult> {
  const deployKey = process.env.CONVEX_DEPLOY_KEY;
  const cloudUrl =
    process.env.CONVEX_CLOUD_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!deployKey || !cloudUrl) {
    return { synced: false, reason: "missing_deploy_key" };
  }

  const response = await fetch(
    `${cloudUrl.replace(/\/$/, "")}/api/v1/update_environment_variables`,
    {
      method: "POST",
      headers: {
        Authorization: `Convex ${deployKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        changes: [{ name, value: value.trim() }],
      }),
    }
  );

  if (!response.ok) {
    const message = await response.text();
    return {
      synced: false,
      reason: "api_error",
      status: response.status,
      message,
    };
  }

  return { synced: true };
}
