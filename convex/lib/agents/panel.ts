export function shouldUseAgentMode(input: {
  agentMode: boolean;
  agentEnabled: boolean;
}): "copilot" | "agent" {
  if (input.agentMode && input.agentEnabled) return "agent";
  return "copilot";
}

export function agentStatusLabel(status: string): string {
  switch (status) {
    case "created":
      return "Created";
    case "planning":
      return "Planning";
    case "running":
      return "Running";
    case "waiting_for_approval":
      return "Waiting for approval";
    case "resuming":
      return "Resuming";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    case "expired":
      return "Expired";
    default:
      return "Unknown";
  }
}

export function canAccessRun(ownerId: string, requesterId: string): boolean {
  return ownerId.length > 0 && ownerId === requesterId;
}
