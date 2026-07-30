'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, Loader2, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Category = { id: string; label: string };

type ResearchDoc = {
  id: number;
  title: string;
  category: string;
  sourceFilename: string;
  mimeType: string | null;
  extractedText: string | null;
  digestMarkdown: string | null;
  createdAt: string;
  updatedAt: string;
};

function corpusStatus(doc: ResearchDoc): 'digest' | 'extracted' | 'needs_digest' {
  if (doc.digestMarkdown?.trim()) return 'digest';
  if (doc.extractedText?.trim()) return 'extracted';
  return 'needs_digest';
}

function statusLabel(status: ReturnType<typeof corpusStatus>): string {
  switch (status) {
    case 'digest':
      return 'Ready (digest)';
    case 'extracted':
      return 'Ready (extracted text)';
    default:
      return 'Needs digest';
  }
}

function isPdf(name: string): boolean {
  return name.toLowerCase().endsWith('.pdf');
}

export default function ResearchPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [documents, setDocuments] = useState<ResearchDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgError, setMsgError] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('water');
  const [file, setFile] = useState<File | null>(null);
  const [digestMarkdown, setDigestMarkdown] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDigest, setEditDigest] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/research');
      const data = await res.json();
      setCategories(data.categories ?? []);
      setDocuments(data.documents ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pdfWithoutDigest = file && isPdf(file.name) && !digestMarkdown.trim();

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title.trim()) return;
    if (pdfWithoutDigest) {
      setMsgError(true);
      setMsg('PDF uploads need a digest with citable facts — the generator cannot read PDF binaries.');
      return;
    }
    setUploading(true);
    setMsg('');
    const form = new FormData();
    form.set('file', file);
    form.set('title', title.trim());
    form.set('category', category);
    if (digestMarkdown.trim()) form.set('digestMarkdown', digestMarkdown.trim());

    const res = await fetch('/api/research/upload', { method: 'POST', body: form });
    const data = await res.json();
    setMsgError(!res.ok);
    setMsg(res.ok ? `Uploaded "${data.document.title}".` : data.error || 'Upload failed.');
    if (res.ok) {
      setTitle('');
      setFile(null);
      setDigestMarkdown('');
      await load();
    }
    setUploading(false);
  }

  async function saveDoc(id: number) {
    setSavingId(id);
    setMsg('');
    const res = await fetch(`/api/research/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: editCategory, digestMarkdown: editDigest || null }),
    });
    setMsgError(!res.ok);
    setMsg(res.ok ? 'Document updated.' : 'Update failed.');
    setEditingId(null);
    await load();
    setSavingId(null);
  }

  async function removeDoc(id: number) {
    if (!confirm('Delete this research document?')) return;
    const res = await fetch(`/api/research/${id}`, { method: 'DELETE' });
    setMsgError(!res.ok);
    setMsg(res.ok ? 'Document deleted.' : 'Delete failed.');
    await load();
  }

  function categoryLabel(id: string) {
    return categories.find((c) => c.id === id)?.label ?? id;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="City research"
        description="Upload city studies and label by category. Generate pulls matching docs into our-take when official storylines fit."
      />

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl">Upload document</CardTitle>
          <CardDescription>
            PDF, Markdown, or text. Paste a digest with study names, dates, and citable facts — generate uses digest first,
            then auto-extracted text for .md/.txt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={upload} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="research-title">Title</Label>
                <Input
                  id="research-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="2024 Water Supply Assessment"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="research-category">Category</Label>
                <select
                  id="research-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="research-file">File</Label>
              <Input
                id="research-file"
                type="file"
                accept=".pdf,.md,.markdown,.txt"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="research-digest">
                Digest {file && isPdf(file.name) ? '(required for PDF)' : '(recommended for PDFs)'}
              </Label>
              <Textarea
                id="research-digest"
                value={digestMarkdown}
                onChange={(e) => setDigestMarkdown(e.target.value)}
                className="min-h-32 font-mono text-sm"
                placeholder="- Study name, date, URL&#10;- Bullet facts the newsletter may cite in our-take…"
              />
              {pdfWithoutDigest && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  PDFs require a digest — the pipeline does not auto-parse PDF text in v1.
                </p>
              )}
            </div>
            <Button type="submit" disabled={uploading || !file || !title.trim() || Boolean(pdfWithoutDigest)}>
              {uploading ? (
                <>
                  <Loader2 className="animate-spin" />
                  Uploading…
                </>
              ) : (
                'Upload'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl">Library</CardTitle>
          <CardDescription>{documents.length} document{documents.length === 1 ? '' : 's'} in corpus</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading…
            </div>
          ) : documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No uploads yet. Start with a water study: upload the PDF for your records, paste citable facts in the
              digest, and set category to <strong>Water &amp; permits</strong>.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {documents.map((doc) => {
                const status = corpusStatus(doc);
                return (
                  <li key={doc.id} className="space-y-3 py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{doc.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {doc.sourceFilename} · {new Date(doc.createdAt).toLocaleDateString()}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="secondary">{categoryLabel(doc.category)}</Badge>
                          <Badge variant={status === 'needs_digest' ? 'outline' : 'default'}>{statusLabel(status)}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" asChild>
                          <a href={`/api/research/${doc.id}/file`} download>
                            <Download className="size-4" />
                          </a>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingId(doc.id);
                            setEditDigest(doc.digestMarkdown ?? '');
                            setEditCategory(doc.category);
                          }}
                        >
                          Edit
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => removeDoc(doc.id)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                    {editingId === doc.id && (
                      <div className="space-y-3 rounded-md border border-border bg-muted/30 p-4">
                        <div className="grid gap-2 sm:max-w-xs">
                          <Label>Category</Label>
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                          >
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <Textarea
                          value={editDigest}
                          onChange={(e) => setEditDigest(e.target.value)}
                          className="min-h-40 font-mono text-sm"
                          placeholder="Citable facts for the newsletter…"
                        />
                        <div className="flex gap-2">
                          <Button type="button" size="sm" onClick={() => saveDoc(doc.id)} disabled={savingId === doc.id}>
                            {savingId === doc.id ? <Loader2 className="animate-spin" /> : 'Save'}
                          </Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                    {status === 'needs_digest' && (
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        Add a digest with citable facts — generate will not use this doc until you do.
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
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
