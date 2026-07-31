'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { StatusBadge } from '@/components/status-badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

interface Edition {
  id: number;
  issueDate: string;
  subject: string | null;
  bodyMarkdown: string | null;
  status: string;
}

export default function DraftEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [edition, setEdition] = useState<Edition | null>(null);
  const [loadError, setLoadError] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [msg, setMsg] = useState('');
  const [msgError, setMsgError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setLoadError('');
    fetch(`/api/drafts/${id}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) {
          setLoadError(d.error || 'Draft not found (may have been lost on redeploy).');
          setEdition(null);
          return;
        }
        setEdition(d.edition);
        setSubject(d.edition?.subject ?? '');
        setBody(d.edition?.bodyMarkdown ?? '');
      })
      .catch(() => {
        setLoadError('Failed to load draft.');
        setEdition(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function save() {
    setBusy(true);
    setMsg('');
    const res = await fetch(`/api/drafts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, bodyMarkdown: body }),
    });
    setMsgError(!res.ok);
    setMsg(res.ok ? 'Saved.' : 'Save failed.');
    setBusy(false);
  }

  async function del() {
    if (!confirm('Delete this draft?')) return;
    setBusy(true);
    await fetch(`/api/drafts/${id}`, { method: 'DELETE' });
    router.push('/admin/drafts');
  }

  async function send() {
    setBusy(true);
    setMsg('');
    const res = await fetch(`/api/drafts/${id}/send`, { method: 'POST' });
    const data = await res.json();
    setMsgError(!res.ok);
    setMsg(res.ok ? 'Sent.' : data.error || 'Send failed.');
    setBusy(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" />
        Loading draft…
      </div>
    );
  }

  if (!edition) {
    return (
      <div className="space-y-4 py-12">
        <Alert variant="destructive">
          <AlertDescription>{loadError || 'Draft not found.'}</AlertDescription>
        </Alert>
        <Button variant="outline" asChild>
          <Link href="/admin/drafts">Back to drafts</Link>
        </Button>
      </div>
    );
  }

  const isDraft = edition.status === 'draft';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/drafts">
            <ArrowLeft />
            Back to drafts
          </Link>
        </Button>
        <Separator orientation="vertical" className="hidden h-5 sm:block" />
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-2xl font-semibold">Draft #{edition.id}</h1>
          <StatusBadge status={edition.status} />
          <span className="text-sm text-muted-foreground">{edition.issueDate}</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">Subject</Label>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={!isDraft}
          className="text-base"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="body">Body (markdown)</Label>
          <Textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={!isDraft}
            className="min-h-[28rem] font-mono text-sm"
          />
        </div>
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-base">Preview</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            <div className="prose-newsletter min-h-[26rem]">
              <ReactMarkdown>{body}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      </div>

      {isDraft && (
        <>
          <Separator />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={save} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : null}
              Save
            </Button>
            <Button type="button" variant="secondary" onClick={send} disabled={busy}>
              Send via Resend
            </Button>
            <Button type="button" variant="destructive" onClick={del} disabled={busy}>
              Delete
            </Button>
          </div>
        </>
      )}

      {msg && (
        <Alert variant={msgError ? 'destructive' : 'default'}>
          <AlertDescription>{msg}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
