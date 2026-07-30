import type { Storyline } from './types';

const MIN_QUOTE_CHARS = 12;

export const normalizeForMatch = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

export function quoteAppearsIn(quote: string, source: string, sourceIsNormalized = false): boolean {
  const needle = normalizeForMatch(quote ?? '');
  if (needle.length < MIN_QUOTE_CHARS) return false;
  const haystack = sourceIsNormalized ? source : normalizeForMatch(source);
  return haystack.includes(needle);
}

export function filterVerbatimQuotes(
  quotes: Array<{ speaker: string; quote: string }>,
  cleanedTranscript: string,
): Array<{ speaker: string; quote: string }> {
  const haystack = normalizeForMatch(cleanedTranscript);
  return quotes.filter((q) => quoteAppearsIn(q.quote ?? '', haystack, true));
}

export function extractQuotedSpans(text: string): string[] {
  const spans: string[] = [];
  for (const m of text.matchAll(/["“]([^"”]{1,600}?)["”]/g)) {
    const inner = m[1].trim();
    if (inner.length >= MIN_QUOTE_CHARS) spans.push(inner);
  }
  return spans;
}

export function findFabricatedQuotes(body: string, sourceUnion: string): string[] {
  const haystack = normalizeForMatch(sourceUnion);
  const seen = new Set<string>();
  const bad: string[] = [];
  for (const span of extractQuotedSpans(body)) {
    const key = normalizeForMatch(span);
    if (seen.has(key)) continue;
    seen.add(key);
    if (!quoteAppearsIn(span, haystack, true)) bad.push(span);
  }
  return bad;
}

export function stripFabricatedQuotes(body: string, badSpans: string[]): string {
  if (badSpans.length === 0) return body;
  const badKeys = new Set(badSpans.map(normalizeForMatch));
  const isBoundary = (ch: string) => ch === '.' || ch === '!' || ch === '?' || ch === '\n';
  const ranges: Array<[number, number]> = [];
  for (const m of body.matchAll(/["“]([^"”]{1,600}?)["”]/g)) {
    const inner = m[1].trim();
    if (!badKeys.has(normalizeForMatch(inner))) continue;
    const idx = m.index ?? 0;
    let start = idx;
    while (start > 0 && !isBoundary(body[start - 1])) start--;
    let end = idx + m[0].length;
    if (!/[.!?]$/.test(inner)) {
      while (end < body.length && !isBoundary(body[end])) end++;
      if (end < body.length) end++;
    }
    ranges.push([start, end]);
  }
  if (ranges.length === 0) return body;
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([...r]);
  }
  let out = body;
  for (let i = merged.length - 1; i >= 0; i--) out = out.slice(0, merged[i][0]) + out.slice(merged[i][1]);
  return out.replace(/[ \t]{2,}/g, ' ').replace(/ +\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function normalizeGuidanceFingerprint(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/million\b/g, 'm')
    .replace(/[$,\s]/g, '')
    .replace(/[–—−]/g, '-');
}

export function extractGuidanceFingerprints(guidance: string): string[] {
  const g = guidance?.trim() ?? '';
  if (!g) return [];
  const found = new Set<string>();
  for (const m of g.matchAll(/\$[\d,]+(?:\.\d+)?(?:\s*[Mm](?:illion)?\b)?/g)) {
    const fp = normalizeGuidanceFingerprint(m[0]);
    if (fp.length >= 3) found.add(fp);
  }
  for (const m of g.matchAll(/\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b/g)) {
    const fp = normalizeGuidanceFingerprint(m[0]);
    if (fp.length >= 4) found.add(fp);
  }
  for (const m of g.matchAll(/\bFY\d{2}\b/gi)) found.add(m[0].toLowerCase());
  for (const m of g.matchAll(/\b\d+\.\d+%/g)) found.add(m[0].toLowerCase());
  return [...found];
}

function textContainsGuidanceFingerprint(text: string, fingerprint: string): boolean {
  if (fingerprint.startsWith('fy') || fingerprint.includes('%')) {
    return text.toLowerCase().includes(fingerprint);
  }
  return normalizeGuidanceFingerprint(text).includes(fingerprint);
}

export function findGuidanceLeaks(body: string, fingerprints: string[], allowedSource: string): string[] {
  if (!body.trim() || fingerprints.length === 0) return [];
  return fingerprints.filter(
    (fp) => textContainsGuidanceFingerprint(body, fp) && !textContainsGuidanceFingerprint(allowedSource, fp),
  );
}

export function stripGuidanceLeakParagraphs(body: string, leakedFingerprints: string[]): string {
  if (leakedFingerprints.length === 0) return body;
  const kept = body
    .split(/\n{2,}/)
    .filter((para) => !leakedFingerprints.some((fp) => textContainsGuidanceFingerprint(para, fp)));
  return kept.join('\n\n').replace(/[ \t]{2,}/g, ' ').replace(/ +\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

const DOCKET_CANCELLED_RE = /\b(cancell?ed|canceled)\b/i;
const DOCKET_TRIVIAL_RE = /^\s*(one time event|early neighborhood notification)\s*$/i;

export function selectDocketItems<T extends { eventName: string; digest: string | null; agendaHighlights: string[] }>(
  items: T[],
  max = 6,
): T[] {
  const live = items.filter(
    (u) => !DOCKET_CANCELLED_RE.test(u.eventName) && !DOCKET_TRIVIAL_RE.test(u.eventName),
  );
  const isSubstantive = (u: T) => Boolean(u.digest || u.agendaHighlights.length);
  const substantive = live.filter(isSubstantive);
  const bare = live.filter((u) => !isSubstantive(u));
  return [...substantive, ...bare].slice(0, max);
}

export function buildSourcesBlock(sources: { id: number; name: string; baseUrl: string }[]): string {
  if (sources.length === 0) return '';
  const seen = new Set<number>();
  const links = sources
    .filter((s) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    })
    .map((s) => `- [${s.name}](${s.baseUrl}/meeting/${s.id})`)
    .join('\n');
  return `\n\n---\n\n**Sources**\n${links}`;
}

/** Phrases that indicate the model welcomed a fee hike or used "fee too low" framing — contradicts editorial stance. */
export const FEE_HIKE_FORBIDDEN_FRAMINGS = [
  'welcome, if overdue',
  'welcome change',
  'overdue change',
  'step in the right direction',
  'previous fee was a joke',
  'fee was a joke',
  'laughably low',
  'too low to matter',
  'still too low',
  'woefully inadequate',
  'falls short',
  'still falls short',
  'not enough to build',
  'cheap buyout',
  'critical move to make developers',
  'presented as progress',
];

export function findForbiddenFramings(body: string, phrases = FEE_HIKE_FORBIDDEN_FRAMINGS): string[] {
  const norm = normalizeForMatch(body);
  return phrases.filter((p) => norm.includes(normalizeForMatch(p)));
}

const PUBLIC_COMMENT_HEADLINE =
  /\b(public commenter|resident demands|longtime resident|long-time resident|activist|opposes residential permits|housing freeze|moratorium|honors outgoing|consent agenda|amended agenda|myab co-chairs|residents urge|residents tell)\b/i;

export function isPublicCommentStoryline(storyline: Storyline): boolean {
  const blob = `${storyline.headline} ${storyline.whatHappened} ${storyline.whyItMatters}`;
  if (PUBLIC_COMMENT_HEADLINE.test(blob)) return true;
  if (/\bjim heath\b/i.test(blob)) return true;
  if (/\bchandler moore\b/i.test(blob)) return true;
  if (/\bpublic comment\b/i.test(blob)) return true;
  if (/\bjeffrey haynes\b/i.test(blob)) return true;
  return false;
}

export function dropPublicCommentStorylines(storylines: Storyline[]): Storyline[] {
  return storylines.filter((s) => !isPublicCommentStoryline(s));
}

import { getActiveResearchCategories } from './research-categories';

const RESEARCH_TOPIC_RE =
  /\b(water|permits?|permitting|ldc|land development code|general plan|moratorium|housing permit|water supply|water study|santa fe forward)\b/i;

export function isResearchTopicActive(storylines: Storyline[]): boolean {
  if (storylines.length === 0) return false;
  const blob = storylines.map((s) => `${s.headline} ${s.whatHappened} ${s.whyItMatters}`).join(' ');
  if (RESEARCH_TOPIC_RE.test(blob)) return true;
  return getActiveResearchCategories(storylines).some((c) => c !== 'general');
}

export function buildGuidanceLeakAllowedSource(
  meetingFactSurface: string,
  research: string | null,
  storylines: Storyline[],
): string {
  let allowed = meetingFactSurface;
  if (research?.trim() && isResearchTopicActive(storylines)) {
    allowed += `\n\n${research}`;
  }
  return allowed;
}

export function findResearchTopicLeaks(body: string, research: string | null, storylines: Storyline[]): string[] {
  if (!research?.trim()) return [];
  const fingerprints = extractGuidanceFingerprints(research);
  if (fingerprints.length === 0) return [];
  if (isResearchTopicActive(storylines)) return [];
  return fingerprints.filter((fp) => textContainsGuidanceFingerprint(body, fp));
}
