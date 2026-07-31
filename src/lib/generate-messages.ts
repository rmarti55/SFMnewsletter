import { formatUsDateKey } from './datetime';
import type { GenerateMeta, GenerateReason } from './types';

export function formatGenerateSkipMessage(reason: GenerateReason, meta: GenerateMeta): string {
  const dateLabel = formatUsDateKey(meta.issueDate);
  if (reason === 'empty_corpus') {
    return `No meetings in window for ${dateLabel} (lookback ${meta.lookbackDays}d, lookahead ${meta.lookaheadDays}d). Use Preview readiness below for skipped reasons.`;
  }
  if (reason === 'empty_synthesis') {
    return `Had ${meta.recentCount} ready meeting(s) and ${meta.storylineCount} storyline(s), but the model returned an empty body — check OpenRouter logs.`;
  }
  return 'Draft created.';
}

export function isGenerateSkipReason(reason: string): reason is 'empty_corpus' | 'empty_synthesis' {
  return reason === 'empty_corpus' || reason === 'empty_synthesis';
}
