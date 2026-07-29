'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Edition {
  id: number;
  issueDate: string;
  subject: string | null;
  status: string;
  createdAt: string;
}

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<Edition[]>([]);

  useEffect(() => {
    fetch('/api/drafts')
      .then((r) => r.json())
      .then((d) => setDrafts(d.drafts ?? []));
  }, []);

  return (
    <div>
      <h1>Drafts</h1>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {drafts.map((d) => (
          <li key={d.id} style={{ padding: '12px 0', borderBottom: '1px solid #eee' }}>
            <Link href={`/admin/drafts/${d.id}`}>#{d.id}</Link> — {d.subject || '(no subject)'} — {d.issueDate}{' '}
            <span style={{ color: '#666' }}>({d.status})</span>
          </li>
        ))}
      </ul>
      {drafts.length === 0 && <p>No drafts yet.</p>}
    </div>
  );
}
