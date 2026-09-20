import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

/* Postgres had no scheduler — pg_cron was never installed, and analytics_prune
   rode on visitor traffic instead. This is the schedule that should always
   have existed. */
const crons = cronJobs();

crons.daily("prune site visits", { hourUTC: 3, minuteUTC: 15 }, internal.analytics.prune, { keepDays: 400 });
crons.daily("sweep rate limit windows", { hourUTC: 3, minuteUTC: 30 }, internal.maintenance.sweepRateLimits, {});

export default crons;
