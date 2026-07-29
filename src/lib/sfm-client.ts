import type { NewsletterCorpus } from './types';

export class SfmApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'SfmApiError';
    this.status = status;
  }
}

export interface FetchCorpusParams {
  issueDate?: string;
  lookbackDays?: number;
  lookaheadDays?: number;
}

export async function fetchNewsletterCorpus(params: FetchCorpusParams = {}): Promise<NewsletterCorpus> {
  const apiKey = process.env.NEWSLETTER_EXPORT_API_KEY?.trim();
  if (!apiKey) throw new Error('NEWSLETTER_EXPORT_API_KEY is not set');

  const base = (process.env.SFM_API_BASE_URL || 'https://santafeminutes.space').replace(/\/$/, '');
  const url = new URL(`${base}/api/export/newsletter-corpus`);
  if (params.issueDate) url.searchParams.set('issueDate', params.issueDate);
  if (params.lookbackDays != null) url.searchParams.set('lookbackDays', String(params.lookbackDays));
  if (params.lookaheadDays != null) url.searchParams.set('lookaheadDays', String(params.lookaheadDays));

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new SfmApiError(response.status, text || response.statusText);
  }

  return (await response.json()) as NewsletterCorpus;
}
