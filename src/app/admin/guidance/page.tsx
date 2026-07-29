'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

export default function GuidancePage() {
  const [markdown, setMarkdown] = useState('');
  const [msg, setMsg] = useState('');
  const [msgError, setMsgError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/guidance')
      .then((r) => r.json())
      .then((d) => setMarkdown(d.guidance ?? ''))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setMsg('');
    const res = await fetch('/api/guidance', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guidance: markdown }),
    });
    setMsgError(!res.ok);
    setMsg(res.ok ? 'Saved (prior version archived).' : 'Save failed.');
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Editorial guidance"
        description="Injected into extract + synthesize prompts every generate."
      />

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl">Guidance markdown</CardTitle>
          <CardDescription>Define tone, structure, and editorial rules for the LLM pipeline.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading guidance…
            </div>
          ) : (
            <Textarea
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              className="min-h-[32rem] font-mono text-sm"
              placeholder="Enter editorial guidance in markdown…"
            />
          )}
          <Button type="button" onClick={save} disabled={loading || saving}>
            {saving ? (
              <>
                <Loader2 className="animate-spin" />
                Saving…
              </>
            ) : (
              'Save'
            )}
          </Button>
        </CardContent>
      </Card>

      {msg && (
        <Alert variant={msgError ? 'destructive' : 'default'}>
          <AlertDescription>{msg}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
