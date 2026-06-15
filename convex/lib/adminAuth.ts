import { internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./requireAdmin";

export const requireAdminQuery = internalQuery({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return true;
  },
});
