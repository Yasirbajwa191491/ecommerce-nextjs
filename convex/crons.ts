import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "purge expired in-app notifications",
  { hourUTC: 3, minuteUTC: 15 },
  internal.notificationRetention.purgeExpiredNotifications,
  {}
);

export default crons;
