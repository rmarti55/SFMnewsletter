'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Plus } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Article {
  id: number;
  slug: string;
  headline: string;
  status: 'draft' | 'listed';
  emailedAt: string | null;
  createdAt: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/articles')
      .then((r) => r.json())
      .then((d) => setArticles(d.articles ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Articles"
          description="Paste blurbs you like, publish them to Minutes, and email yourself a styled preview."
        />
        <Button asChild className="shrink-0">
          <Link href="/admin/articles/new">
            <Plus />
            New article
          </Link>
        </Button>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading articles…</p>}

      {!loading && articles.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="font-heading text-lg text-foreground">No articles yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Generate a draft, copy a blurb you like, and paste it into a{' '}
              <Link href="/admin/articles/new" className="font-medium text-primary hover:underline">
                new article
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && articles.length > 0 && (
        <ul className="space-y-3">
          {articles.map((article) => (
            <li key={article.id}>
              <Link href={`/admin/articles/${article.id}`} className="group block">
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={article.status === 'listed' ? 'default' : 'secondary'}>
                          {article.status}
                        </Badge>
                        {article.emailedAt && (
                          <span className="text-xs text-muted-foreground">Emailed</span>
                        )}
                      </div>
                      <p className="mt-1 truncate font-medium text-foreground group-hover:text-primary">
                        {article.headline}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        /minutes/{article.slug} · Created {formatDate(article.createdAt)}
                      </p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
