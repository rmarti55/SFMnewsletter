import { rewriteIsoDatesToUs } from './datetime';
import {
  buildSourcesBlock,
  extractGuidanceFingerprints,
  findFabricatedQuotes,
  findGuidanceLeaks,
  stripFabricatedQuotes,
  stripGuidanceLeakParagraphs,
} from './guards';
import { loadEditorialGuidance } from './guidance';
import {
  extractMeetingStorylines,
  buildSynthesisSourceText,
  mapWithConcurrency,
  MAX_RECENT_MEETINGS,
  STORYLINE_CONCURRENCY,
} from './extract-storylines';
import { runSynthesis } from './synthesize';
import { fetchNewsletterCorpus } from './sfm-client';
import { insertDraft } from './db';
import { resolveStorylineNames } from './hdrb';
import type { GenerateResult } from './types';

export interface GenerateDraftParams {
  issueDate: string;
  lookbackDays?: number;
  lookaheadDays?: number;
}

export async function generateNewsletterDraft(params: GenerateDraftParams): Promise<GenerateResult> {
  const lookbackDays = params.lookbackDays ?? 7;
  const lookaheadDays = params.lookaheadDays ?? 7;

  const [corpus, guidance] = await Promise.all([
    fetchNewsletterCorpus({ issueDate: params.issueDate, lookbackDays, lookaheadDays }),
    Promise.resolve(loadEditorialGuidance()),
  ]);

  const { recent, upcoming, readiness } = corpus;

  if (recent.length === 0 && upcoming.length === 0) {
    return { created: false, edition: null, reason: 'empty', readiness };
  }

  const recentCapped = recent.slice(0, MAX_RECENT_MEETINGS);
  const storylineSets = await mapWithConcurrency(recentCapped, STORYLINE_CONCURRENCY, (r) =>
    extractMeetingStorylines(r, guidance),
  );
  const storylines = resolveStorylineNames(
    storylineSets.flat().sort((a, b) => b.significance - a.significance),
    new Map(recentCapped.map((r) => [r.eventId, r])),
  );

  console.log(
    `[generate] ${recentCapped.length} meetings → ${storylines.length} storylines [${[...new Set(storylines.map((s) => s.eventId))].join(', ')}]`,
  );

  const sourceUnion = recentCapped
    .map((r) => r.cleanedTranscript ?? r.speakers.map((s) => s.text).join('\n'))
    .join('\n\n');

  const meetingFactSurface = [buildSynthesisSourceText(storylines, upcoming), sourceUnion].join('\n\n');
  const guidanceFingerprints = extractGuidanceFingerprints(guidance ?? '');

  let synth = await runSynthesis(storylines, upcoming, guidance);
  let body = synth.body.trim();
  if (!body) return { created: false, edition: null, reason: 'empty', readiness };

  let fabricated = findFabricatedQuotes(body, sourceUnion);
  if (fabricated.length > 0) {
    console.warn(`[generate] ${fabricated.length} fabricated quote(s) — regenerating`);
    const retry = await runSynthesis(storylines, upcoming, guidance, { forbiddenQuotes: fabricated });
    if (retry.body.trim()) {
      synth = retry;
      body = retry.body.trim();
    }
    fabricated = findFabricatedQuotes(body, sourceUnion);
    if (fabricated.length > 0) body = stripFabricatedQuotes(body, fabricated);
  }

  let guidanceLeaks = findGuidanceLeaks(body, guidanceFingerprints, meetingFactSurface);
  if (guidanceLeaks.length > 0) {
    console.warn(`[generate] ${guidanceLeaks.length} guidance leak(s) — regenerating`);
    const retry = await runSynthesis(storylines, upcoming, guidance, {
      forbiddenGuidanceFacts: guidanceLeaks,
    });
    if (retry.body.trim()) {
      synth = retry;
      body = retry.body.trim();
    }
    guidanceLeaks = findGuidanceLeaks(body, guidanceFingerprints, meetingFactSurface);
    if (guidanceLeaks.length > 0) body = stripGuidanceLeakParagraphs(body, guidanceLeaks);
  }

  body = rewriteIsoDatesToUs(body);

  const baseUrl = (process.env.SFM_API_BASE_URL || 'https://santafeminutes.space').replace(/\/$/, '');
  const sourceIds = new Set<number>();
  for (const s of storylines) sourceIds.add(s.eventId);
  for (const u of upcoming) sourceIds.add(u.eventId);
  const sources = [
    ...storylines.map((s) => ({ id: s.eventId, name: s.eventName })),
    ...upcoming.filter((u) => !storylines.some((s) => s.eventId === u.eventId)).map((u) => ({ id: u.eventId, name: u.eventName })),
  ];
  body += buildSourcesBlock(sources.map((s) => ({ ...s, baseUrl })));

  const edition = insertDraft({
    issueDate: params.issueDate,
    subject: synth.subject.trim(),
    bodyMarkdown: body,
    sourceEventIds: [...sourceIds],
    model: synth.model,
  });

  return { created: true, edition, reason: 'created', readiness };
}
