import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchNewsletterCorpus, SfmApiError } from '../src/lib/sfm-client';

describe('fetchNewsletterCorpus', () => {
  beforeEach(() => {
    process.env.NEWSLETTER_EXPORT_API_KEY = 'test-key';
    process.env.SFM_API_BASE_URL = 'https://example.com';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws when API key missing', async () => {
    delete process.env.NEWSLETTER_EXPORT_API_KEY;
    await expect(fetchNewsletterCorpus()).rejects.toThrow(/NEWSLETTER_EXPORT_API_KEY/);
  });

  it('returns corpus on 200', async () => {
    const corpus = { issueDate: '2026-07-29', recent: [], upcoming: [], readiness: {}, lookbackDays: 7, lookaheadDays: 7 };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => corpus,
      }),
    );
    const result = await fetchNewsletterCorpus({ issueDate: '2026-07-29' });
    expect(result.issueDate).toBe('2026-07-29');
  });

  it('throws SfmApiError on 401', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'Unauthorized', statusText: 'Unauthorized' }),
    );
    await expect(fetchNewsletterCorpus()).rejects.toBeInstanceOf(SfmApiError);
  });
});
