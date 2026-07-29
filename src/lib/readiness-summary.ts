import type { NewsletterReadiness, RecentExportItem } from './types';

const REASON_LABELS: Record<string, string> = {
  not_eligible: 'Not auto-transcribed (by design)',
  no_video: 'Eligible — no YouTube video linked yet',
  pending: 'Eligible — waiting on transcript worker',
  no_summary: 'Transcript done — missing AI summary',
};

export function formatReadinessSummary(readiness: NewsletterReadiness, recent: RecentExportItem[]): string {
  const lines: string[] = [];
  const b = readiness.skippedBreakdown;

  lines.push(
    `${readiness.recentWithExecutiveSummary} meeting(s) ready for newsletter (${recent.map((r) => r.eventName).join(', ') || 'none'}).`,
  );
  lines.push(
    `${b.notEligibleCommittee} on the calendar but outside SFM's auto-transcribe committees (Liquor, Library Board, MPO, etc.) — expected, not broken.`,
  );
  if (b.eligibleNoVideo > 0) {
    lines.push(`${b.eligibleNoVideo} eligible but no YouTube video matched yet.`);
  }
  if (b.eligiblePending > 0) {
    lines.push(`${b.eligiblePending} eligible but transcript still processing on the home Mac worker.`);
  }
  if (b.noSummary > 0) {
    lines.push(`${b.noSummary} completed transcript(s) missing executive summary.`);
  }

  return lines.join('\n\n');
}

export function reasonLabel(reason: string): string {
  return REASON_LABELS[reason] ?? reason;
}
