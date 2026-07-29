'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';

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
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch(`/api/drafts/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setEdition(d.edition);
        setSubject(d.edition?.subject ?? '');
        setBody(d.edition?.bodyMarkdown ?? '');
      });
  }, [id]);

  async function save() {
    const res = await fetch(`/api/drafts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, bodyMarkdown: body }),
    });
    if (res.ok) setMsg('Saved.');
    else setMsg('Save failed.');
  }

  async function del() {
    if (!confirm('Delete this draft?')) return;
    await fetch(`/api/drafts/${id}`, { method: 'DELETE' });
    router.push('/admin/drafts');
  }

  async function send() {
    const res = await fetch(`/api/drafts/${id}/send`, { method: 'POST' });
    const data = await res.json();
    setMsg(res.ok ? 'Sent.' : data.error || 'Send failed.');
  }

  if (!edition) return <p>Loading…</p>;

  return (
    <div>
      <h1>Draft #{edition.id}</h1>
      <p style={{ color: '#666' }}>{edition.issueDate} — {edition.status}</p>
      <label style={{ display: 'block', marginBottom: 12 }}>
        Subject
        <input
          style={{ display: 'block', width: '100%', marginTop: 4 }}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={edition.status !== 'draft'}
        />
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <label>
          Body (markdown)
          <textarea
            style={{ width: '100%', minHeight: 400, marginTop: 4, fontFamily: 'monospace', fontSize: 13 }}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={edition.status !== 'draft'}
          />
        </label>
        <div>
          <div style={{ fontSize: 13, marginBottom: 4 }}>Preview</div>
          <div style={{ border: '1px solid #ddd', padding: 16, background: '#fff', minHeight: 400, fontSize: 14 }}>
            <ReactMarkdown>{body}</ReactMarkdown>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        {edition.status === 'draft' && (
          <>
            <button type="button" onClick={save}>Save</button>
            <button type="button" onClick={send}>Send via Resend</button>
            <button type="button" onClick={del}>Delete</button>
          </>
        )}
      </div>
      {msg && <p>{msg}</p>}
    </div>
  );
}
