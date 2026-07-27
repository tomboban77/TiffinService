import { toZonedTime } from "date-fns-tz";

/**
 * Weekday (0 = Sunday .. 6 = Saturday) for a calendar date as observed in the
 * given IANA timezone. Anchored at noon UTC so DST transitions near midnight
 * never shift the date onto the wrong calendar day.
 */
export function weekdayInTimezone(dateIso: string, timezone: string): number {
  const anchored = new Date(`${dateIso}T12:00:00Z`);
  return toZonedTime(anchored, timezone).getDay();
}

/** 'YYYY-MM-DD' for "today" as observed in the given IANA timezone. */
export function todayInTimezone(timezone: string): string {
  return toZonedTime(new Date(), timezone).toLocaleDateString("en-CA"); // en-CA formats as YYYY-MM-DD
}

/** Adds `days` (may be negative) to a 'YYYY-MM-DD' calendar date, independent of any timezone. */
export function addDays(dateIso: string, days: number): string {
  const d = new Date(`${dateIso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
