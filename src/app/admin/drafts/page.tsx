'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { Card, CardContent } from '@/components/ui/card';

interface Edition {
  id: number;
  issueDate: string;
  subject: string | null;
  status: string;
  createdAt: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<Edition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/drafts')
      .then((r) => r.json())
      .then((d) => setDrafts(d.drafts ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Drafts" description="Review, edit, and send newsletter drafts." />

      {loading && <p className="text-sm text-muted-foreground">Loading drafts…</p>}

      {!loading && drafts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="font-heading text-lg text-foreground">No drafts yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Generate your first issue from the{' '}
              <Link href="/admin" className="font-medium text-primary hover:underline">
                Generate
              </Link>{' '}
              page.
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && drafts.length > 0 && (
        <ul className="space-y-3">
          {drafts.map((d) => (
            <li key={d.id}>
              <Link href={`/admin/drafts/${d.id}`} className="group block">
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">#{d.id}</span>
                        <StatusBadge status={d.status} />
                      </div>
                      <p className="mt-1 truncate font-medium text-foreground group-hover:text-primary">
                        {d.subject || '(no subject)'}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Issue {d.issueDate} · Created {formatDate(d.createdAt)}
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
