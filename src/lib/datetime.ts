import { DateTime } from 'luxon';

const EVENT_TIMEZONE = 'America/Denver';

export function getTodayInDenver(): string {
  return DateTime.now().setZone(EVENT_TIMEZONE).toFormat('yyyy-MM-dd');
}

export function formatUsDateKey(isoDateKey: string): string {
  const dt = DateTime.fromISO(isoDateKey, { zone: EVENT_TIMEZONE });
  if (!dt.isValid) return isoDateKey;
  return dt.toFormat('MM/dd/yyyy');
}

export function rewriteIsoDatesToUs(text: string): string {
  return text.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (_, y, m, d) => `${m}/${d}/${y}`);
}
