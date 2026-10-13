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

export default crons;
