import { formatUsDateKey } from './datetime';
import { dropPublicCommentStorylines, filterVerbatimQuotes } from './guards';
import { jsonCompletion } from './openrouter';
import { filterTranscriptSpeakers } from './speaker-filter';
import type { RecentExportItem, Storyline, UpcomingItem } from './types';
import { buildHdrbNameGuideBlock, isHdrbMeeting } from './hdrb';

const STORYLINE_MAX_CHARS = 250_000;
export const STORYLINE_CONCURRENCY = 4;
export const MAX_RECENT_MEETINGS = 12;

function editorialLensBlock(guidance: string | null): string {
  const g = guidance?.trim();
  if (!g) return '';
  return `\n\nOUR EDITORIAL LENS (this newsletter is a hardline YIMBY advocacy publication — read this before writing):
${g}

Apply the lens: prioritize threads that advance OUR YIMBY / abundance positions. Pull the real, verbatim quotes that bear on those positions from OFFICIALS and invited presenters only. Label where each named person STOOD relative to our positions — when an official opposes housing supply, label that as opposition to building homes, not as the "community voice."

CRITICAL — LENS IS FRAMING ONLY: This shapes SELECTION, EMPHASIS, and TAKE. Storyline facts and quotes must come from this transcript. City research corpus (if present in guidance) is for synthesis our-take later — do NOT put research numbers into storylines unless also spoken in this transcript. Never write an evergreen campaign item that did not happen in the provided meetings. Never both-sides. We are right; the anti-supply side is wrong.`;
}

function buildStorylineSystemPrompt(guidance: string | null): string {
  return `You are a reporter for a Santa Fe, New Mexico hardline YIMBY civic-advocacy newsletter. You are given the official-record transcript of ONE city meeting (open-floor public comment already removed). Find the genuinely newsworthy threads a resident who wants more housing would want to read about.

For each storyline, capture:
- headline: a punchy, specific one-liner (name the thing, the money, the fight) — never a Citizen Portal-style headline elevating public comment over official agenda items
- whatHappened: 1-2 sentences, concrete
- whyItMatters: the stakes — who is affected, the dollars, the precedent, whether housing supply was advanced or blocked
- people: named councilors, the mayor, staff, or invited agenda presenters and where they STOOD (their position), not just that they spoke. For design / historic / land-use fights, note who argued substance (function, cost, economics, safety, housing need) vs style/aesthetics/documentation theater.
- quotes: 1-2 VERBATIM quotes copied exactly from the transcript that carry the tension or the point. Prefer quotes from officials/allies that expose style-over-substance gatekeeping, status-quo failure, or support building homes. Copy word-for-word; do not paraphrase or clean them up.
- significance: 0-100, how newsworthy this is to a resident who wants more housing${editorialLensBlock(guidance)}

Hard rules:
- IGNORE open-floor public comment entirely — it is not in this transcript. NEVER create a storyline about a public commenter. NEVER quote a resident rant.
- SKIP procedural rote entirely: approving minutes, roll call, consent agenda, adjournment, routine reappointments, honors/thank-yous (MYAB, employee of month), quorum. Do NOT make a storyline out of these UNLESS something unusual happened (contested minutes, a dissenting vote, a delay that blocks housing action).
- Write any dates in American MM/DD/YYYY form (e.g. 07/14/2026). Never use year-first YYYY-MM-DD.
- Only use facts and quotes present in this transcript. NEVER invent names, numbers, quotes, or events. Every quote must appear word-for-word in the transcript.
- Prefer decisions that add or block housing supply, money, dishonest progress metrics, and status-quo policy failure. If opposition appears only from public comment with no official action, skip it entirely.
- FEE-IN-LIEU / SFHP: when officials/staff argue the fee is too low or push for higher fees, note their position but flag that it contradicts our editorial stance (punitive fees already failed; system funds broken AHTF/OAH pipeline). Do NOT frame a fee increase as progress in whyItMatters.
- For Historic Districts / design-review fights: capture the substance-vs-style contrast — what the project is for (function, cost, public need) vs what the board fixated on (aesthetics, style codes, documentation). If the debate never left the style lane, say so; do not invent an economic-impact presentation that was not in the transcript.
- A dull meeting can yield zero storylines — return an empty array rather than manufacturing news.
- Extract at most 3 storylines; fewer is better if only 1-2 are real.

Respond with JSON only: {"storylines": [{"headline": "...", "whatHappened": "...", "whyItMatters": "...", "people": [{"name": "...", "role": "...", "position": "..."}], "quotes": [{"speaker": "...", "quote": "..."}], "significance": 0-100}]}`;
}

function sampleTranscript(text: string): string {
  if (text.length <= STORYLINE_MAX_CHARS) return text;
  const half = Math.floor(STORYLINE_MAX_CHARS / 2);
  return text.slice(0, half) + '\n...\n' + text.slice(-half);
}

export function buildMeetingSourceText(r: RecentExportItem): string {
  const speakers = filterTranscriptSpeakers(r.speakers, r.categoryName);
  const lines: string[] = [`Meeting: ${r.eventName}`];
  lines.push(`Meeting date: ${formatUsDateKey(r.meetingDate)}`);
  if (r.categoryName) lines.push(`Committee: ${r.categoryName}`);
  if (r.summary.executiveSummary) lines.push(`\nAI summary (for grounding): ${r.summary.executiveSummary}`);
  if (r.summary.motionsAndVotes?.length)
    lines.push(`Motions/votes (for grounding): ${r.summary.motionsAndVotes.join('; ')}`);
  if (speakers.length > 0) {
    lines.push('\nSPEAKER-ATTRIBUTED TRANSCRIPT — officials and invited presenters only (quote from here):');
    lines.push(speakers.map((s) => `${s.speaker}: ${s.text}`).join('\n\n'));
  } else if (r.cleanedTranscript) {
    lines.push('\nTRANSCRIPT:');
    lines.push(r.cleanedTranscript);
  }
  return sampleTranscript(lines.join('\n'));
}

export function buildTranscriptHaystack(r: RecentExportItem): string {
  const speakers = filterTranscriptSpeakers(r.speakers, r.categoryName);
  if (speakers.length > 0) return speakers.map((sp) => sp.text).join('\n');
  return r.cleanedTranscript ?? '';
}

export async function extractMeetingStorylines(
  r: RecentExportItem,
  guidance: string | null,
): Promise<Storyline[]> {
  if (!r.cleanedTranscript && r.speakers.length === 0) return [];

  const messages = [
    { role: 'system' as const, content: buildStorylineSystemPrompt(guidance) },
    { role: 'user' as const, content: buildMeetingSourceText(r) },
  ];
  const haystack = buildTranscriptHaystack(r);

  const runOnce = async (maxTokens: number): Promise<Storyline[]> => {
    const { data } = await jsonCompletion<{
      storylines: Omit<Storyline, 'eventId' | 'eventName' | 'committee' | 'meetingDate'>[];
    }>(messages, {
      temperature: 0.3,
      maxTokens,
      feature: 'newsletter:storylines',
      fallback: { storylines: [] },
    });
    const raw = Array.isArray(data?.storylines) ? data.storylines : [];
    return raw
      .map((s) => ({
        eventId: r.eventId,
        eventName: r.eventName,
        committee: r.categoryName,
        meetingDate: r.meetingDate,
        headline: (s.headline ?? '').trim(),
        whatHappened: (s.whatHappened ?? '').trim(),
        whyItMatters: (s.whyItMatters ?? '').trim(),
        people: Array.isArray(s.people) ? s.people : [],
        quotes: filterVerbatimQuotes(Array.isArray(s.quotes) ? s.quotes : [], haystack),
        significance: typeof s.significance === 'number' ? s.significance : 0,
      }))
      .filter((s) => s.headline && s.whatHappened);
  };

  let storylines = await runOnce(4096);
  if (storylines.length === 0) storylines = await runOnce(8192);
  if (storylines.length === 0) {
    console.warn(`[extract] 0 storylines for event ${r.eventId} (${r.eventName})`);
  }
  return dropPublicCommentStorylines(storylines);
}

export function buildSynthesisSourceText(storylines: Storyline[], upcoming: UpcomingItem[]): string {
  const parts: string[] = [];
  if (storylines.length > 0) {
    parts.push('STORYLINES FROM RECENT MEETINGS (already happened — past tense):');
    storylines.forEach((s, i) => {
      const lines = [`${i + 1}. [${s.committee ?? s.eventName}] ${s.headline} (significance ${s.significance})`];
      lines.push(`   Meeting date: ${formatUsDateKey(s.meetingDate)}`);
      lines.push(`   What happened: ${s.whatHappened}`);
      if (s.whyItMatters) lines.push(`   Why it matters: ${s.whyItMatters}`);
      if (s.people.length)
        lines.push(
          `   People: ${s.people.map((p) => `${p.name}${p.role ? ` (${p.role})` : ''}${p.position ? ` — ${p.position}` : ''}`).join('; ')}`,
        );
      for (const q of s.quotes) lines.push(`   Quote — ${q.speaker}: "${q.quote}"`);
      parts.push(lines.join('\n'));
    });
  }
  if (upcoming.length > 0) {
    parts.push('\nON THE DOCKET (upcoming — not yet happened, future tense):');
    for (const u of upcoming) {
      const lines = [`- ${u.eventName} (${formatUsDateKey(u.meetingDate)})`];
      if (u.digest) lines.push(`  Preview: ${u.digest}`);
      if (u.agendaHighlights.length) lines.push(`  Agenda items: ${u.agendaHighlights.join('; ')}`);
      parts.push(lines.join('\n'));
    }
  }
  let text = parts.join('\n');
  const hdrbNames: string[] = [];
  for (const s of storylines) {
    if (!isHdrbMeeting(s.committee)) continue;
    for (const p of s.people) hdrbNames.push(p.name);
    for (const q of s.quotes) hdrbNames.push(q.speaker);
  }
  text += buildHdrbNameGuideBlock(hdrbNames);
  return text;
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
