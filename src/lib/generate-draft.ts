import { rewriteIsoDatesToUs } from './datetime';
import {
  buildGuidanceLeakAllowedSource,
  buildSourcesBlock,
  extractGuidanceFingerprints,
  findFabricatedQuotes,
  findForbiddenFramings,
  findGuidanceLeaks,
  findResearchTopicLeaks,
  stripFabricatedQuotes,
  stripGuidanceLeakParagraphs,
} from './guards';
import { loadCityResearch, loadEditorialGuidance, loadFullGuidance, loadCityResearchForStorylines } from './guidance';
import {
  extractMeetingStorylines,
  buildSynthesisSourceText,
  buildTranscriptHaystack,
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

function buildGenerateMeta(
  params: GenerateDraftParams,
  lookbackDays: number,
  lookaheadDays: number,
  recent: { length: number },
  upcoming: { length: number },
  storylineCount = 0,
): GenerateResult['meta'] {
  return {
    issueDate: params.issueDate,
    lookbackDays,
    lookaheadDays,
    recentCount: recent.length,
    upcomingCount: upcoming.length,
    storylineCount,
  };
}

export async function generateNewsletterDraft(params: GenerateDraftParams): Promise<GenerateResult> {
  const lookbackDays = params.lookbackDays ?? 7;
  const lookaheadDays = params.lookaheadDays ?? 7;

  const [corpus, editorial] = await Promise.all([
    fetchNewsletterCorpus({ issueDate: params.issueDate, lookbackDays, lookaheadDays }),
    Promise.resolve(loadEditorialGuidance()),
  ]);

  const guidanceForExtract = loadFullGuidance({ research: null }) ?? editorial;

  const { recent, upcoming, readiness } = corpus;
  const baseResult = {
    recent,
    upcoming,
    readiness,
    meta: buildGenerateMeta(params, lookbackDays, lookaheadDays, recent, upcoming),
  };

  if (recent.length === 0 && upcoming.length === 0) {
    return { ...baseResult, created: false, edition: null, reason: 'empty_corpus' };
  }

  const recentCapped = recent.slice(0, MAX_RECENT_MEETINGS);
  const storylineSets = await mapWithConcurrency(recentCapped, STORYLINE_CONCURRENCY, (r) =>
    extractMeetingStorylines(r, guidanceForExtract),
  );
  const storylines = resolveStorylineNames(
    storylineSets.flat().sort((a, b) => b.significance - a.significance),
    new Map(recentCapped.map((r) => [r.eventId, r])),
  );

  const research = loadCityResearchForStorylines(storylines);
  const guidance = loadFullGuidance({ research: research ?? null }) ?? editorial;

  console.log(
    `[generate] ${recentCapped.length} meetings → ${storylines.length} storylines [${[...new Set(storylines.map((s) => s.eventId))].join(', ')}]`,
  );

  const sourceUnion = recentCapped.map((r) => buildTranscriptHaystack(r)).join('\n\n');

  const meetingFactSurface = [buildSynthesisSourceText(storylines, upcoming), sourceUnion].join('\n\n');
  const editorialFingerprints = extractGuidanceFingerprints(editorial ?? '');
  const allowedSource = buildGuidanceLeakAllowedSource(meetingFactSurface, research, storylines);

  let synth = await runSynthesis(storylines, upcoming, guidance);
  let body = synth.body.trim();
  if (!body) {
    return {
      ...baseResult,
      created: false,
      edition: null,
      reason: 'empty_synthesis',
      meta: buildGenerateMeta(params, lookbackDays, lookaheadDays, recent, upcoming, storylines.length),
    };
  }

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

  const forbiddenFacts = [
    ...findGuidanceLeaks(body, editorialFingerprints, allowedSource),
    ...findResearchTopicLeaks(body, research, storylines),
  ];
  if (forbiddenFacts.length > 0) {
    console.warn(`[generate] ${forbiddenFacts.length} guidance/research leak(s) — regenerating`);
    const retry = await runSynthesis(storylines, upcoming, guidance, {
      forbiddenGuidanceFacts: forbiddenFacts,
    });
    if (retry.body.trim()) {
      synth = retry;
      body = retry.body.trim();
    }
    const stillLeaked = [
      ...findGuidanceLeaks(body, editorialFingerprints, allowedSource),
      ...findResearchTopicLeaks(body, research, storylines),
    ];
    if (stillLeaked.length > 0) body = stripGuidanceLeakParagraphs(body, stillLeaked);
  }

  let forbiddenFramings = findForbiddenFramings(body);
  if (forbiddenFramings.length > 0) {
    console.warn(`[generate] ${forbiddenFramings.length} forbidden framing(s) — regenerating`);
    const retry = await runSynthesis(storylines, upcoming, guidance, { forbiddenFramings });
    if (retry.body.trim()) {
      synth = retry;
      body = retry.body.trim();
    }
    forbiddenFramings = findForbiddenFramings(body);
    if (forbiddenFramings.length > 0) {
      console.warn(`[generate] forbidden framing(s) remain after retry: ${forbiddenFramings.join(', ')}`);
    }
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

  return {
    ...baseResult,
    created: true,
    edition,
    reason: 'created',
    meta: buildGenerateMeta(params, lookbackDays, lookaheadDays, recent, upcoming, storylines.length),
  };
}
