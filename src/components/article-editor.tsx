'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, ExternalLink, Loader2, Mail } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { getArticleImageUrl } from '@/lib/article-image-url';

interface Article {
  id: number;
  slug: string;
  headline: string;
  dek: string | null;
  bodyMarkdown: string;
  imagePath: string | null;
  status: 'draft' | 'listed';
  emailedAt: string | null;
}

interface ArticleEditorProps {
  articleId?: number;
}

export function ArticleEditor({ articleId }: ArticleEditorProps) {
  const router = useRouter();
  const isNew = articleId == null;

  const [loading, setLoading] = useState(!isNew);
  const [headline, setHeadline] = useState('');
  const [dek, setDek] = useState('');
  const [bodyMarkdown, setBodyMarkdown] = useState('');
  const [status, setStatus] = useState<'draft' | 'listed'>('listed');
  const [slug, setSlug] = useState('');
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [emailedAt, setEmailedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgError, setMsgError] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    fetch(`/api/articles/${articleId}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setLoadError(data.error || 'Article not found.');
          return;
        }
        const article = data.article as Article;
        setHeadline(article.headline);
        setDek(article.dek ?? '');
        setBodyMarkdown(article.bodyMarkdown);
        setStatus(article.status);
        setSlug(article.slug);
        setImagePath(article.imagePath);
        setEmailedAt(article.emailedAt);
      })
      .catch(() => setLoadError('Failed to load article.'))
      .finally(() => setLoading(false));
  }, [articleId, isNew]);

  async function save(): Promise<number | null> {
    if (!headline.trim() || !bodyMarkdown.trim()) {
      setMsgError(true);
      setMsg('Headline and body are required.');
      return null;
    }

    setBusy(true);
    setMsg('');
    const payload = {
      headline: headline.trim(),
      dek: dek.trim() || null,
      bodyMarkdown: bodyMarkdown.trim(),
      status,
    };

    const res = isNew
      ? await fetch('/api/articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      : await fetch(`/api/articles/${articleId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

    const data = await res.json();
    setBusy(false);
    setMsgError(!res.ok);
    if (!res.ok) {
      setMsg(data.error || 'Save failed.');
      return null;
    }

    const saved = data.article as Article;
    setSlug(saved.slug);
    setEmailedAt(saved.emailedAt);
    setMsg('Saved.');
    if (isNew) {
      router.replace(`/admin/articles/${saved.id}`);
    }
    return saved.id;
  }

  async function uploadImage(file: File) {
    const id = articleId ?? (await save());
    if (!id) return;

    setBusy(true);
    setMsg('');
    const form = new FormData();
    form.set('file', file);
    const res = await fetch(`/api/articles/${id}/image`, { method: 'POST', body: form });
    const data = await res.json();
    setBusy(false);
    setMsgError(!res.ok);
    setMsg(res.ok ? 'Image uploaded.' : data.error || 'Upload failed.');
    if (res.ok) setImagePath(data.article.imagePath);
  }

  async function sendEmail() {
    const id = articleId ?? (await save());
    if (!id) return;

    setBusy(true);
    setMsg('');
    const res = await fetch(`/api/articles/${id}/email`, { method: 'POST' });
    const data = await res.json();
    setBusy(false);
    setMsgError(!res.ok);
    setMsg(res.ok ? 'Email sent to admin.' : data.error || 'Send failed.');
    if (res.ok && data.article) setEmailedAt(data.article.emailedAt);
  }

  async function del() {
    if (isNew || !articleId) return;
    if (!confirm('Delete this article?')) return;
    setBusy(true);
    await fetch(`/api/articles/${articleId}`, { method: 'DELETE' });
    router.push('/admin/articles');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" />
        Loading article…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-4 py-12">
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
        <Button variant="outline" asChild>
          <Link href="/admin/articles">Back to articles</Link>
        </Button>
      </div>
    );
  }

  const previewImageUrl =
    articleId && imagePath ? getArticleImageUrl(articleId, imagePath) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/articles">
            <ArrowLeft />
            Back to articles
          </Link>
        </Button>
        <Separator orientation="vertical" className="hidden h-5 sm:block" />
        <h1 className="font-heading text-2xl font-semibold">
          {isNew ? 'New article' : 'Edit article'}
        </h1>
        {slug && (
          <span className="text-sm text-muted-foreground">/minutes/{slug}</span>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="headline">Headline</Label>
          <Input
            id="headline"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="Lead headline for the article"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dek">Dek (optional)</Label>
          <Input
            id="dek"
            value={dek}
            onChange={(e) => setDek(e.target.value)}
            placeholder="One-line supporting sentence"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Front page status</Label>
        <select
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as 'draft' | 'listed')}
          className="flex h-9 w-full max-w-xs rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <option value="listed">Listed on front page</option>
          <option value="draft">Draft (hidden from front page)</option>
        </select>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="body">Body (markdown)</Label>
          <Textarea
            id="body"
            value={bodyMarkdown}
            onChange={(e) => setBodyMarkdown(e.target.value)}
            className="min-h-[24rem] font-mono text-sm"
            placeholder="Paste your blurb here…"
          />
        </div>
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-base">Preview</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 space-y-4 overflow-auto">
            {previewImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewImageUrl} alt="" className="w-full object-cover" />
            )}
            <div>
              <h2 className="font-heading text-xl font-semibold">{headline || 'Headline'}</h2>
              {dek && <p className="mt-2 text-sm text-muted-foreground">{dek}</p>}
            </div>
            <div className="prose-newsletter min-h-[16rem]">
              <ReactMarkdown>{bodyMarkdown || '_Body preview…_'}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <Label htmlFor="image">Hero image (optional)</Label>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            id="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadImage(file);
            }}
            className="max-w-sm"
          />
          {previewImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewImageUrl} alt="" className="h-16 w-24 object-cover" />
          )}
        </div>
        <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP. Max 4MB.</p>
      </div>

      <Separator />

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => void save()} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : null}
          Save
        </Button>
        <Button type="button" variant="secondary" onClick={() => void sendEmail()} disabled={busy}>
          <Mail />
          Email to me
        </Button>
        {slug && (
          <Button type="button" variant="outline" asChild>
            <Link href={`/minutes/${slug}`} target="_blank">
              <ExternalLink />
              View on Minutes
            </Link>
          </Button>
        )}
        {!isNew && (
          <Button type="button" variant="destructive" onClick={() => void del()} disabled={busy}>
            Delete
          </Button>
        )}
      </div>

      {emailedAt && (
        <p className="text-xs text-muted-foreground">
          Last emailed {new Date(emailedAt).toLocaleString()}
        </p>
      )}

      {msg && (
        <Alert variant={msgError ? 'destructive' : 'default'}>
          <AlertDescription>{msg}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
