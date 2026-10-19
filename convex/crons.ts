import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.hourly(
  "backfill in-app notification event keys",
  { minuteUTC: 10 },
  internal.inAppNotifications.backfillInAppNotificationEventKeys,
  {}
);

crons.daily(
  "purge expired in-app notifications",
  { hourUTC: 3, minuteUTC: 15 },
  internal.inAppNotifications.purgeExpiredNotifications,
  {}
);

crons.interval(
  "retry unpaid stripe refunds",
  { minutes: 5 },
  internal.stripe.retryDueStripeRefunds,
  {}
);

crons.interval(
  "backfill vapi table counts",
  { minutes: 1 },
  internal.vapi.admin.backfillVapiTableCounts,
  {}
);

crons.daily(
  "collect inventory snapshots",
  { hourUTC: 2, minuteUTC: 20 },
  internal.forecastQuality.collectStockSnapshots,
  {}
);

crons.daily(
  "prune mlops monitoring",
  { hourUTC: 2, minuteUTC: 40 },
  internal.mlops.pruneOperationalRows,
  {}
);

crons.interval(
  "resume and prune agent runs",
  { minutes: 5 },
  internal.agentInternal.resumeDueRuns,
  {}
);

export default crons;
