import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatGenerateSkipMessage, isGenerateSkipReason } from '../src/lib/generate-messages';
import type { GenerateMeta, NewsletterReadiness } from '../src/lib/types';

const readiness: NewsletterReadiness = {
  recentInWindow: 0,
  recentWithCompletedTranscript: 0,
  recentWithExecutiveSummary: 0,
  skippedNoSummary: 0,
  skippedNoTranscriptRow: 0,
  skippedBreakdown: {
    notEligibleCommittee: 0,
    eligibleNoVideo: 0,
    eligiblePending: 0,
    noSummary: 0,
  },
  skippedMeetings: [],
};

const baseMeta: GenerateMeta = {
  issueDate: '2026-07-31',
  lookbackDays: 7,
  lookaheadDays: 7,
  recentCount: 0,
  upcomingCount: 0,
  storylineCount: 0,
};

describe('generate-messages', () => {
  it('detects skip reasons', () => {
    expect(isGenerateSkipReason('empty_corpus')).toBe(true);
    expect(isGenerateSkipReason('empty_synthesis')).toBe(true);
    expect(isGenerateSkipReason('created')).toBe(false);
    expect(isGenerateSkipReason('empty')).toBe(false);
  });

  it('formats empty corpus message with window params', () => {
    const msg = formatGenerateSkipMessage('empty_corpus', baseMeta);
    expect(msg).toContain('07/31/2026');
    expect(msg).toContain('lookback 7d');
    expect(msg).toContain('lookahead 7d');
  });

  it('formats empty synthesis message with counts', () => {
    const msg = formatGenerateSkipMessage('empty_synthesis', {
      ...baseMeta,
      recentCount: 3,
      storylineCount: 5,
    });
    expect(msg).toContain('3 ready meeting');
    expect(msg).toContain('5 storyline');
    expect(msg).toContain('OpenRouter');
  });
});

describe('generateNewsletterDraft skip reasons', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns empty_corpus when recent and upcoming are both empty', async () => {
    vi.doMock('../src/lib/sfm-client', () => ({
      fetchNewsletterCorpus: vi.fn().mockResolvedValue({
        issueDate: '2026-07-31',
        lookbackDays: 7,
        lookaheadDays: 7,
        recent: [],
        upcoming: [],
        readiness,
      }),
    }));
    vi.doMock('../src/lib/guidance', () => ({
      loadEditorialGuidance: vi.fn().mockResolvedValue(null),
      loadFullGuidance: vi.fn().mockResolvedValue(null),
      loadCityResearchForStorylines: vi.fn().mockResolvedValue(null),
    }));

    const { generateNewsletterDraft } = await import('../src/lib/generate-draft');
    const result = await generateNewsletterDraft({ issueDate: '2026-07-31' });

    expect(result.reason).toBe('empty_corpus');
    expect(result.created).toBe(false);
    expect(result.edition).toBeNull();
    expect(result.meta.recentCount).toBe(0);
    expect(result.meta.upcomingCount).toBe(0);
    expect(result.readiness).toEqual(readiness);
  });

  it('returns empty_synthesis when model body is empty', async () => {
    const recent = [
      {
        eventId: 1,
        eventName: 'Finance Committee',
        categoryName: 'Finance',
        meetingDate: '2026-07-28',
        transcriptId: 1,
        transcriptStatus: 'completed',
        executiveSummary: 'Summary',
        summary: {
          executiveSummary: 'Summary',
          keyDecisions: [],
          actionItems: [],
          publicCommentsSummary: '',
          motionsAndVotes: [],
        },
        topics: [],
        cleanedTranscript: null,
        speakers: [],
        sourceUrl: 'https://example.com/1',
      },
    ];

    vi.doMock('../src/lib/sfm-client', () => ({
      fetchNewsletterCorpus: vi.fn().mockResolvedValue({
        issueDate: '2026-07-31',
        lookbackDays: 7,
        lookaheadDays: 7,
        recent,
        upcoming: [],
        readiness,
      }),
    }));
    vi.doMock('../src/lib/guidance', () => ({
      loadEditorialGuidance: vi.fn().mockResolvedValue(null),
      loadFullGuidance: vi.fn().mockResolvedValue(null),
      loadCityResearchForStorylines: vi.fn().mockResolvedValue(null),
    }));
    vi.doMock('../src/lib/extract-storylines', () => ({
      extractMeetingStorylines: vi.fn().mockResolvedValue([
        {
          eventId: 1,
          eventName: 'Finance Committee',
          committee: 'Finance',
          meetingDate: '2026-07-28',
          headline: 'Budget vote',
          whatHappened: 'Approved budget',
          whyItMatters: 'Money',
          people: [],
          quotes: [],
          significance: 8,
        },
      ]),
      buildSynthesisSourceText: () => 'source',
      buildTranscriptHaystack: () => 'haystack',
      mapWithConcurrency: async <T, R>(items: T[], _n: number, fn: (item: T) => Promise<R>) =>
        Promise.all(items.map(fn)),
      MAX_RECENT_MEETINGS: 10,
      STORYLINE_CONCURRENCY: 2,
    }));
    vi.doMock('../src/lib/hdrb', () => ({
      resolveStorylineNames: (storylines: unknown[]) => storylines,
    }));
    vi.doMock('../src/lib/synthesize', () => ({
      runSynthesis: vi.fn().mockResolvedValue({ subject: '', body: '   ', model: 'test-model' }),
    }));
    vi.doMock('../src/lib/storage', () => ({
      insertDraft: vi.fn(),
    }));

    const { generateNewsletterDraft } = await import('../src/lib/generate-draft');
    const result = await generateNewsletterDraft({ issueDate: '2026-07-31' });

    expect(result.reason).toBe('empty_synthesis');
    expect(result.created).toBe(false);
    expect(result.meta.recentCount).toBe(1);
    expect(result.meta.storylineCount).toBe(1);
  });
});

describe('buildGenerateResponse shape', () => {
  it('maps empty_corpus to skipped payload with counts', async () => {
    vi.doMock('../src/lib/generate-draft', () => ({
      generateNewsletterDraft: vi.fn().mockResolvedValue({
        created: false,
        edition: null,
        reason: 'empty_corpus',
        readiness,
        recent: [],
        upcoming: [],
        meta: baseMeta,
      }),
    }));

    const { POST } = await import('../src/app/api/generate/route');
    const response = await POST(
      new Request('http://localhost/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueDate: '2026-07-31', lookbackDays: 7, lookaheadDays: 7 }),
      }) as import('next/server').NextRequest,
    );
    const data = await response.json();

    expect(data.ok).toBe(true);
    expect(data.skipped).toBe('empty_corpus');
    expect(data.issueDate).toBe('2026-07-31');
    expect(data.recentCount).toBe(0);
    expect(data.upcomingCount).toBe(0);
    expect(data.readiness).toEqual(readiness);
    expect(data.recent).toEqual([]);
    expect(data.upcoming).toEqual([]);
  });
});
