'use client';

import { useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatReadinessSummary, reasonLabel } from '@/lib/readiness-summary';
import type { NewsletterCorpus } from '@/lib/types';

type ResultKind = 'success' | 'error' | 'info';

function resultKind(message: string): ResultKind {
  if (message.startsWith('Draft #')) return 'success';
  if (message === 'Empty window — no draft created.') return 'info';
  if (message === 'Error' || message.includes('Failed')) return 'error';
  return 'info';
}

export default function AdminGeneratePage() {
  const [issueDate, setIssueDate] = useState('');
  const [corpus, setCorpus] = useState<NewsletterCorpus | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

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
  const kind = result ? resultKind(result) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Generate"
        description="Fetches corpus from Santa Fe Minutes. Most calendar meetings are not auto-transcribed — only ~9 committees + Public Safety."
      />

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl">New issue</CardTitle>
          <CardDescription>Choose an issue date, preview readiness, then generate a draft.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:max-w-xs">
            <Label htmlFor="issue-date">Issue date</Label>
            <Input
              id="issue-date"
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={previewCorpus} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="animate-spin" />
                  Working…
                </>
              ) : (
                'Preview readiness'
              )}
            </Button>
            <Button type="button" onClick={generate} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="animate-spin" />
                  Generating…
                </>
              ) : (
                'Generate draft'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Readiness summary</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">{summary}</pre>
          </CardContent>
        </Card>
      )}

      {corpus && corpus.recent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Ready meetings</CardTitle>
            <CardDescription>{corpus.recent.length} meeting{corpus.recent.length === 1 ? '' : 's'} with transcripts</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {corpus.recent.map((r) => (
                <li key={r.eventId} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div>
                    <a
                      href={r.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-primary"
                    >
                      {r.eventName}
                      <ExternalLink className="size-3.5 shrink-0 opacity-60" />
                    </a>
                    <p className="mt-0.5 text-xs text-muted-foreground">{r.meetingDate}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {corpus && corpus.readiness.skippedMeetings.length > 0 && (
        <Card>
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-6 py-4 [&::-webkit-details-marker]:hidden">
              <CardTitle className="font-heading text-lg">Skipped meetings</CardTitle>
              <Badge variant="secondary">{corpus.readiness.skippedMeetings.length}</Badge>
              <span className="ml-auto text-xs text-muted-foreground group-open:hidden">Show detail</span>
              <span className="ml-auto hidden text-xs text-muted-foreground group-open:inline">Hide detail</span>
            </summary>
            <CardContent className="border-t border-border pt-4">
              <ul className="space-y-3 text-sm">
                {corpus.readiness.skippedMeetings.map((m) => (
                  <li key={m.eventId} className="rounded-md bg-muted/50 px-3 py-2">
                    <span className="font-medium">{m.eventName}</span>
                    {m.categoryName ? <span className="text-muted-foreground"> ({m.categoryName})</span> : null}
                    <span className="text-muted-foreground"> — {reasonLabel(m.reason)}</span>
                    {m.transcriptStatus ? (
                      <span className="text-muted-foreground"> [{m.transcriptStatus}]</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </CardContent>
          </details>
        </Card>
      )}

      {result && kind && (
        <Alert variant={kind === 'error' ? 'destructive' : 'default'}>
          <AlertTitle>{kind === 'success' ? 'Done' : kind === 'error' ? 'Error' : 'Result'}</AlertTitle>
          <AlertDescription>{result}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
