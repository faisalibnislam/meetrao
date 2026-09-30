import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

/* Postgres had no scheduler — pg_cron was never installed, and analytics_prune
   rode on visitor traffic instead. This is the schedule that should always
   have existed. */
const crons = cronJobs();

/* Every quarter hour, because the one-hour reminder has to land near the hour
   it names. The sweep reads a day-wide window and returns immediately when
   nothing is due. */
crons.interval("send booking reminders", { minutes: 15 }, internal.reminders.sweep, {});

/* Hourly. A guest who declines an hour before is news worth having; one who
   declines a week out can wait an hour to be reported, and asking Google more
   often than that spends requests on an answer that rarely changes. */
crons.interval("sync guest RSVPs", { hours: 1 }, internal.rsvp.sweep, {});

crons.daily("prune site visits", { hourUTC: 3, minuteUTC: 15 }, internal.analytics.prune, { keepDays: 400 });
crons.daily("sweep rate limit windows", { hourUTC: 3, minuteUTC: 30 }, internal.maintenance.sweepRateLimits, {});

export default crons;
