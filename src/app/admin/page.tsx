'use client';

import { useState } from 'react';
import { formatReadinessSummary, reasonLabel } from '@/lib/readiness-summary';
import type { NewsletterCorpus } from '@/lib/types';

export default function AdminGeneratePage() {
  const [issueDate, setIssueDate] = useState('');
  const [corpus, setCorpus] = useState<NewsletterCorpus | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  async function previewCorpus() {
    setLoading(true);
    setResult('');
    try {
      const q = issueDate ? `?issueDate=${issueDate}` : '';
      const res = await fetch(`/api/corpus${q}`);
      const data = (await res.json()) as NewsletterCorpus & { error?: string };
      if (!res.ok) throw new Error(data.error || 'Failed');
      setCorpus(data);
      setResult(`Recent: ${data.recent?.length ?? 0}, Upcoming: ${data.upcoming?.length ?? 0}`);
    } catch (e) {
      setResult(e instanceof Error ? e.message : 'Error');
      setCorpus(null);
    } finally {
      setLoading(false);
    }
  }

  async function generate() {
    setLoading(true);
    setResult('');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueDate: issueDate || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      if (data.skipped) setResult('Empty window — no draft created.');
      else setResult(`Draft #${data.edition.id}: ${data.edition.subject}`);
      if (data.readiness) {
        setCorpus((prev) => (prev ? { ...prev, readiness: data.readiness } : null));
      }
    } catch (e) {
      setResult(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  const summary = corpus ? formatReadinessSummary(corpus.readiness, corpus.recent) : null;

  return (
    <div>
      <h1>Generate</h1>
      <p style={{ color: '#555' }}>
        Fetches corpus from Santa Fe Minutes. Most calendar meetings are not auto-transcribed — only
        ~9 committees + Public Safety.
      </p>
      <label>
        Issue date{' '}
        <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
      </label>
      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <button type="button" onClick={previewCorpus} disabled={loading}>
          Preview readiness
        </button>
        <button type="button" onClick={generate} disabled={loading}>
          Generate draft
        </button>
      </div>

      {summary && (
        <div
          style={{
            background: '#fff',
            border: '1px solid #ddd',
            padding: 16,
            marginTop: 16,
            fontSize: 14,
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
          }}
        >
          {summary}
        </div>
      )}

      {corpus && corpus.recent.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <strong>Ready meetings</strong>
          <ul>
            {corpus.recent.map((r) => (
              <li key={r.eventId}>
                <a href={r.sourceUrl} target="_blank" rel="noreferrer">
                  {r.eventName}
                </a>{' '}
                ({r.meetingDate})
              </li>
            ))}
          </ul>
        </div>
      )}

      {corpus && corpus.readiness.skippedMeetings.length > 0 && (
        <details style={{ marginTop: 16, fontSize: 13 }}>
          <summary>
            Skipped meetings ({corpus.readiness.skippedMeetings.length}) — click for detail
          </summary>
          <ul style={{ marginTop: 8 }}>
            {corpus.readiness.skippedMeetings.map((m) => (
              <li key={m.eventId} style={{ marginBottom: 6 }}>
                <strong>{m.eventName}</strong>
                {m.categoryName ? ` (${m.categoryName})` : ''} — {reasonLabel(m.reason)}
                {m.transcriptStatus ? ` [${m.transcriptStatus}]` : ''}
              </li>
            ))}
          </ul>
        </details>
      )}

      {result && <p style={{ marginTop: 16 }}>{result}</p>}
    </div>
  );
}
