'use client';

import { useState } from 'react';

export default function AdminGeneratePage() {
  const [issueDate, setIssueDate] = useState('');
  const [readiness, setReadiness] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  async function previewCorpus() {
    setLoading(true);
    setResult('');
    try {
      const q = issueDate ? `?issueDate=${issueDate}` : '';
      const res = await fetch(`/api/corpus${q}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setReadiness(data.readiness);
      setResult(`Recent: ${data.recent?.length ?? 0}, Upcoming: ${data.upcoming?.length ?? 0}`);
    } catch (e) {
      setResult(e instanceof Error ? e.message : 'Error');
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
      if (data.readiness) setReadiness(data.readiness);
    } catch (e) {
      setResult(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Generate</h1>
      <p style={{ color: '#555' }}>Fetch corpus from Santa Fe Minutes, extract storylines, synthesize issue.</p>
      <label>
        Issue date (YYYY-MM-DD){' '}
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
      {readiness && (
        <pre style={{ background: '#fff', border: '1px solid #ddd', padding: 12, marginTop: 16, fontSize: 13 }}>
          {JSON.stringify(readiness, null, 2)}
        </pre>
      )}
      {result && <p style={{ marginTop: 16 }}>{result}</p>}
    </div>
  );
}
